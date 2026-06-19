"""
build_clusters.py — Archetype Discovery Pipeline
PCA(2) + KMeans(k=5) over the 11-feature normalized skill matrix.
Produces cluster_assignments.csv with archetype labels and PCA coordinates.

Run after feature engineering is complete (master_skill_dataset_v8.csv exists).
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, silhouette_samples
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("build_clusters")

# ── Config ────────────────────────────────────────────────────────────────────
DATA = Path("data/processed")
MASTER_CSV   = DATA / "master_skill_dataset_v8.csv"
OUTPUT_CSV   = DATA / "cluster_assignments.csv"
CENTROIDS_CSV = DATA / "cluster_centroids.csv"
PLOTS_DIR    = DATA / "plots"
PLOTS_DIR.mkdir(parents=True, exist_ok=True)

FEATURES = [
    "linkedin_demand", "salary_premium", "current_usage",
    "future_interest", "global_adoption", "growth_rate",
    "momentum_score", "volatility_score", "growth_consistency",
    "cagr", "trend_slope",
]

N_CLUSTERS = 5
RANDOM_STATE = 42

# Archetype assignment: after fitting, inspect centroids and assign human labels.
# This map is updated after each pipeline run based on centroid analysis.
# Key = cluster_id sorted by mean(all features) descending
ARCHETYPE_LABELS = {
    0: "Future-Proof",
    1: "Emerging",
    2: "Stable",
    3: "At-Risk",
    4: "Obsolete",
}


def main():
    logger.info("Loading master dataset…")
    df = pd.read_csv(MASTER_CSV)
    df["skill"] = df["skill"].astype(str).str.strip().str.lower()

    # Fill missing features
    available = [f for f in FEATURES if f in df.columns]
    missing_feats = [f for f in FEATURES if f not in df.columns]
    if missing_feats:
        logger.warning(f"Missing feature columns: {missing_feats} — filling with 0")
        for f in missing_feats:
            df[f] = 0.0

    df[FEATURES] = df[FEATURES].fillna(0.0)

    # ── 1. Standardise ────────────────────────────────────────────────────────
    logger.info("Standardising feature matrix…")
    X = df[FEATURES].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ── 2. Elbow + Silhouette (diagnostic) ───────────────────────────────────
    logger.info("Running elbow analysis (k=2..8)…")
    inertias, sil_scores = [], []
    for k in range(2, 9):
        km = KMeans(n_clusters=k, n_init=20, random_state=RANDOM_STATE)
        labels = km.fit_predict(X_scaled)
        inertias.append(km.inertia_)
        sil_scores.append(silhouette_score(X_scaled, labels))
        logger.info(f"  k={k}: inertia={km.inertia_:.1f}, silhouette={sil_scores[-1]:.4f}")

    # ── 3. Fit final KMeans ───────────────────────────────────────────────────
    logger.info(f"Fitting KMeans(k={N_CLUSTERS})…")
    km = KMeans(n_clusters=N_CLUSTERS, n_init=50, random_state=RANDOM_STATE)
    df["cluster_id"] = km.fit_predict(X_scaled)

    global_sil = silhouette_score(X_scaled, df["cluster_id"])
    per_sample_sil = silhouette_samples(X_scaled, df["cluster_id"])
    df["silhouette"] = per_sample_sil
    logger.info(f"Global silhouette score: {global_sil:.4f}")

    # ── 4. Auto-label archetypes ──────────────────────────────────────────────
    # Rank clusters by their average composite score (mean of all features)
    logger.info("Assigning archetype labels…")
    cluster_means = df.groupby("cluster_id")[FEATURES].mean()
    cluster_means["composite"] = cluster_means.mean(axis=1)
    cluster_order = cluster_means["composite"].sort_values(ascending=False).index.tolist()

    archetype_map = {}
    archetype_names = ["Future-Proof", "Emerging", "Stable", "At-Risk", "Obsolete"]
    for rank, cid in enumerate(cluster_order):
        archetype_map[cid] = archetype_names[rank]

    df["archetype"] = df["cluster_id"].map(archetype_map)
    logger.info("Archetype assignment:")
    for cid, arch in sorted(archetype_map.items()):
        count = (df["cluster_id"] == cid).sum()
        logger.info(f"  Cluster {cid} → {arch}: {count} skills")

    # ── 5. PCA for visualization ──────────────────────────────────────────────
    logger.info("Running PCA(n_components=2)…")
    pca = PCA(n_components=2, random_state=RANDOM_STATE)
    coords = pca.fit_transform(X_scaled)
    df["pca_x"] = coords[:, 0]
    df["pca_y"] = coords[:, 1]

    explained = pca.explained_variance_ratio_
    logger.info(f"PCA explained variance: PC1={explained[0]:.3f}, PC2={explained[1]:.3f}, "
                f"Total={sum(explained):.3f}")

    # ── 6. Centroid distances ─────────────────────────────────────────────────
    centroids = km.cluster_centers_
    df["centroid_dist"] = np.linalg.norm(
        X_scaled - centroids[df["cluster_id"].values], axis=1
    )

    # ── 7. Save outputs ───────────────────────────────────────────────────────
    output_cols = [
        "skill", "cluster_id", "archetype",
        "pca_x", "pca_y", "silhouette", "centroid_dist",
    ]
    output = df[output_cols]
    output.to_csv(OUTPUT_CSV, index=False)
    logger.info(f"Saved: {OUTPUT_CSV}")

    # Centroids in PCA space
    centroid_pca = pca.transform(centroids)
    centroids_df = pd.DataFrame({
        "cluster_id": range(N_CLUSTERS),
        "archetype": [archetype_map[i] for i in range(N_CLUSTERS)],
        "centroid_pca_x": centroid_pca[:, 0],
        "centroid_pca_y": centroid_pca[:, 1],
    })
    for feat in FEATURES:
        centroids_df[f"mean_{feat}"] = [
            round(cluster_means.loc[i, feat], 4) for i in range(N_CLUSTERS)
        ]
    centroids_df.to_csv(CENTROIDS_CSV, index=False)
    logger.info(f"Saved: {CENTROIDS_CSV}")

    # ── 8. Cluster scatter plot ───────────────────────────────────────────────
    colors = {"Future-Proof": "#7c3aed", "Emerging": "#06b6d4",
              "Stable": "#10b981", "At-Risk": "#f59e0b", "Obsolete": "#ef4444"}
    fig, ax = plt.subplots(figsize=(12, 8), facecolor="#050815")
    ax.set_facecolor("#050815")

    for arch in archetype_names:
        mask = df["archetype"] == arch
        ax.scatter(
            df.loc[mask, "pca_x"], df.loc[mask, "pca_y"],
            c=colors[arch], label=arch, alpha=0.6, s=15,
        )
    ax.set_title("Skill Cluster Map (PCA 2D)", color="white", fontsize=14)
    ax.set_xlabel("PC1", color="white"); ax.set_ylabel("PC2", color="white")
    ax.tick_params(colors="white"); ax.legend(facecolor="#1a1a2e", labelcolor="white")
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "cluster_map.png", dpi=150)
    plt.close()
    logger.info(f"Plot saved: {PLOTS_DIR / 'cluster_map.png'}")

    logger.info("Clustering pipeline complete.")


if __name__ == "__main__":
    main()
