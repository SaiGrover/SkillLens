"""Build four HSEP workforce archetypes from canonical feature inputs."""

from pathlib import Path

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_samples, silhouette_score
from sklearn.preprocessing import StandardScaler

from data_quality import MASTER_CSV, build_canonical_inputs


DATA = Path("data/processed")
OUTPUT_CSV = DATA / "cluster_assignments.csv"
CENTROIDS_CSV = DATA / "cluster_centroids.csv"
FEATURES = [
    "linkedin_demand", "salary_premium", "current_usage", "future_interest",
    "global_adoption_score", "growth_rate",
]
ARCHETYPES = ["Future-Proof", "Growing", "Stable", "High-Risk"]


def main() -> None:
    build_canonical_inputs()
    master = pd.read_csv(MASTER_CSV)
    X = master[FEATURES].fillna(0).to_numpy()
    scaled = StandardScaler().fit_transform(X)

    model = KMeans(n_clusters=4, n_init=50, random_state=42)
    master["cluster_id"] = model.fit_predict(scaled)
    master["silhouette"] = silhouette_samples(scaled, master["cluster_id"])

    profile = master.groupby("cluster_id")[FEATURES].mean()
    profile["composite"] = profile.mean(axis=1)
    ranked_ids = profile["composite"].sort_values(ascending=False).index.tolist()
    labels = {cluster_id: ARCHETYPES[index] for index, cluster_id in enumerate(ranked_ids)}
    master["archetype"] = master["cluster_id"].map(labels)

    coordinates = PCA(n_components=2, random_state=42).fit_transform(scaled)
    master["pca_x"] = coordinates[:, 0]
    master["pca_y"] = coordinates[:, 1]
    assignments = master[["skill", "cluster_id", "archetype", "pca_x", "pca_y", "silhouette"]]
    assignments.to_csv(OUTPUT_CSV, index=False)

    centroid_rows = []
    for cluster_id in sorted(profile.index):
        row = {"cluster_id": cluster_id, "archetype": labels[cluster_id]}
        row.update({f"mean_{name}": profile.loc[cluster_id, name] for name in FEATURES})
        centroid_rows.append(row)
    pd.DataFrame(centroid_rows).to_csv(CENTROIDS_CSV, index=False)
    print(f"Clusters written: {len(assignments)} skills; silhouette={silhouette_score(scaled, master['cluster_id']):.3f}")


if __name__ == "__main__":
    main()
