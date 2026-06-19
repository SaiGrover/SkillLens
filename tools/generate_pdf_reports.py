from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Flowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "backend" / "data" / "processed"
OUT = ROOT / "output" / "pdf"

NAVY = colors.HexColor("#071226")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#5b6475")
CYAN = colors.HexColor("#0ea5e9")
TEAL = colors.HexColor("#14b8a6")
VIOLET = colors.HexColor("#7c3aed")
AMBER = colors.HexColor("#f59e0b")
ROSE = colors.HexColor("#e11d48")
LINE = colors.HexColor("#d7dce8")
PANEL = colors.HexColor("#f7f9fc")
SOFT = colors.HexColor("#eef4ff")


def read_csv(name: str) -> pd.DataFrame:
    path = DATA / name
    if not path.exists():
        raise FileNotFoundError(path)
    return pd.read_csv(path)


def clean_skill(value: str) -> str:
    return str(value).replace("_", " ").strip().title()


def pct(value: float | int | None, scale: float = 100.0, digits: int = 1) -> str:
    if value is None or pd.isna(value):
        return "N/A"
    return f"{float(value) * scale:.{digits}f}%"


def num(value: float | int | None, digits: int = 1) -> str:
    if value is None or pd.isna(value):
        return "N/A"
    return f"{float(value):.{digits}f}"


def money_k(value: float | int | None) -> str:
    if value is None or pd.isna(value):
        return "N/A"
    return f"${float(value) * 100:.0f}K signal"


class BarList(Flowable):
    def __init__(self, rows: list[tuple[str, float, str]], width: float = 6.6 * inch, bar_color=CYAN):
        super().__init__()
        self.rows = rows
        self.width = width
        self.height = 0.34 * inch * max(1, len(rows))
        self.bar_color = bar_color

    def draw(self):
        if not self.rows:
            return
        max_value = max(max(v, 0.01) for _, v, _ in self.rows)
        label_w = 1.85 * inch
        value_w = 0.9 * inch
        bar_w = self.width - label_w - value_w
        y = self.height - 0.2 * inch
        for label, value, suffix in self.rows:
            self.canv.setFillColor(MUTED)
            self.canv.setFont("Helvetica", 8.5)
            self.canv.drawString(0, y, label[:30])
            self.canv.setFillColor(colors.HexColor("#e6ebf5"))
            self.canv.roundRect(label_w, y - 1.5, bar_w, 7, 3, stroke=0, fill=1)
            self.canv.setFillColor(self.bar_color)
            self.canv.roundRect(label_w, y - 1.5, bar_w * max(value, 0) / max_value, 7, 3, stroke=0, fill=1)
            self.canv.setFillColor(INK)
            self.canv.setFont("Helvetica-Bold", 8.5)
            self.canv.drawRightString(label_w + bar_w + value_w, y, suffix)
            y -= 0.34 * inch


@dataclass
class ReportContext:
    master: pd.DataFrame
    ses: pd.DataFrame
    forecasts: pd.DataFrame
    industries: pd.DataFrame
    industry_map: pd.DataFrame
    history: pd.DataFrame
    adoption: pd.DataFrame
    clusters: pd.DataFrame
    cluster_summary: pd.DataFrame


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=29,
            textColor=INK,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["BodyText"],
            fontSize=10.5,
            leading=15,
            textColor=MUTED,
            spaceAfter=16,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13.5,
            leading=17,
            textColor=NAVY,
            spaceBefore=10,
            spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontSize=9.4,
            leading=13.2,
            textColor=INK,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontSize=7.7,
            leading=10.5,
            textColor=MUTED,
        ),
        "center": ParagraphStyle(
            "Center",
            parent=base["BodyText"],
            fontSize=9,
            leading=12,
            textColor=INK,
            alignment=TA_CENTER,
        ),
        "label": ParagraphStyle(
            "Label",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.2,
            leading=9,
            textColor=MUTED,
            alignment=TA_LEFT,
        ),
    }


S = styles()


def page_footer(title: str):
    def draw(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(NAVY)
        canvas.rect(0, letter[1] - 0.42 * inch, letter[0], 0.42 * inch, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(0.55 * inch, letter[1] - 0.27 * inch, "SkillLens AI - HSEP Reports")
        canvas.setFont("Helvetica", 7)
        canvas.drawRightString(letter[0] - 0.55 * inch, letter[1] - 0.27 * inch, title)
        canvas.setFillColor(MUTED)
        canvas.drawString(0.55 * inch, 0.34 * inch, "Generated from processed CSV datasets in backend/data/processed")
        canvas.drawRightString(letter[0] - 0.55 * inch, 0.34 * inch, f"Page {doc.page}")
        canvas.restoreState()
    return draw


def metric_table(items: list[tuple[str, str]], columns: int = 3) -> Table:
    cells: list[list[Paragraph]] = []
    row: list[Paragraph] = []
    for label, value in items:
        row.append(Paragraph(f"<font color='#5b6475' size='7'><b>{label.upper()}</b></font><br/><font color='#111827' size='16'><b>{value}</b></font>", S["center"]))
        if len(row) == columns:
            cells.append(row)
            row = []
    if row:
        while len(row) < columns:
            row.append(Paragraph("", S["center"]))
        cells.append(row)
    table = Table(cells, colWidths=[(7.1 * inch) / columns] * columns)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PANEL),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.white),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return table


def data_table(headers: list[str], rows: Iterable[Iterable[str]], widths: list[float] | None = None) -> Table:
    body = [[Paragraph(f"<b>{h}</b>", S["label"]) for h in headers]]
    for r in rows:
        body.append([Paragraph(str(cell), S["small"]) for cell in r])
    if widths is None:
        widths = [7.1 * inch / len(headers)] * len(headers)
    table = Table(body, colWidths=widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SOFT),
        ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
        ("LINEBELOW", (0, 0), (-1, 0), 0.7, LINE),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#edf1f7")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def bullets(items: list[str]) -> list[Paragraph]:
    return [Paragraph(f"- {item}", S["body"]) for item in items]


def make_doc(filename: str, title: str, subtitle: str, story: list):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / filename
    doc = SimpleDocTemplate(
        str(path),
        pagesize=letter,
        leftMargin=0.55 * inch,
        rightMargin=0.55 * inch,
        topMargin=0.72 * inch,
        bottomMargin=0.55 * inch,
        title=title,
        author="SkillLens AI",
    )
    full_story = [Paragraph(title, S["title"]), Paragraph(subtitle, S["subtitle"])] + story
    doc.build(full_story, onFirstPage=page_footer(title), onLaterPages=page_footer(title))
    return path


def forecast_report(ctx: ReportContext):
    df = ctx.forecasts.copy()
    df["skill_label"] = df["skill"].map(clean_skill)
    top = df.sort_values("forecast_score", ascending=False).head(12)
    metrics = [
        ("Forecasted Skills", str(len(df))),
        ("Avg Confidence", pct(df["confidence"].mean())),
        ("High Confidence Skills", str(int((df["confidence"] >= 0.8).sum()))),
        ("Most Used Method", str(df["forecast_method"].mode().iloc[0])),
        ("Growing Skills", str(int(df["forecast_trend"].str.lower().eq("growing").sum()))),
        ("Stable Skills", str(int(df["forecast_trend"].str.lower().eq("stable").sum()))),
    ]
    rows = []
    for _, r in top.iterrows():
        rows.append([
            r["skill_label"],
            num(r["forecast_score_1y"] * 100),
            num(r["forecast_score_3y"] * 100),
            r["forecast_trend"],
            r["forecast_method"],
            pct(r["confidence"]),
        ])
    method_rows = ctx.forecasts.groupby("forecast_method").agg(
        skills=("skill", "count"),
        confidence=("confidence", "mean"),
        score=("forecast_score", "mean"),
    ).reset_index().sort_values("skills", ascending=False)
    story = [
        metric_table(metrics),
        Paragraph("Top forecast signals", S["h2"]),
        data_table(["Skill", "1Y Index", "3Y Index", "Trend", "Method", "Confidence"], rows, [1.45*inch, .75*inch, .75*inch, .85*inch, 1.15*inch, .85*inch]),
        Paragraph("Model method distribution", S["h2"]),
        BarList([(r["forecast_method"], float(r["skills"]), f"{int(r['skills'])} skills") for _, r in method_rows.iterrows()], bar_color=VIOLET),
        Spacer(1, 8),
        Paragraph("Interpretation", S["h2"]),
        *bullets([
            "Forecast index values are normalized 0-100 scores from forecast_score_1y and forecast_score_3y, not raw job-count percentages.",
            "Confidence reflects the model selection signal in forecast_results.csv.",
            "Holt is used where longer history exists; feature-based projection is used where trend history is limited.",
        ]),
    ]
    return make_doc(
        "skill_forecast_report.pdf",
        "Skill Forecast Report",
        "One-year and three-year skill forecast indexes generated from forecast_results.csv.",
        story,
    )


def industry_report(ctx: ReportContext):
    df = ctx.industries.copy().sort_values("avg_ses_score", ascending=False)
    metrics = [
        ("Industries Covered", str(len(df))),
        ("Mapped Skill Links", str(len(ctx.industry_map))),
        ("Avg SES", pct(df["avg_ses_score"].mean())),
        ("Avg Forecast Growth", pct(df["forecast_growth_3y_pct"].mean(), scale=1)),
        ("Peak Demand", f"{int(df['peak_demand'].max()):,}"),
        ("Total Skills", str(int(df["skill_count"].sum()))),
    ]
    rows = []
    for _, r in df.iterrows():
        mapped = ctx.industry_map[ctx.industry_map["industry"] == r["industry"]]
        top_skill = clean_skill(mapped.sort_values("ses_score", ascending=False).iloc[0]["skill"]) if len(mapped) else "N/A"
        rows.append([
            r["industry"],
            str(int(r["skill_count"])),
            pct(r["avg_ses_score"]),
            pct(r["forecast_growth_3y_pct"], scale=1),
            top_skill,
            str(r["top_ses_tier"]),
        ])
    story = [
        metric_table(metrics),
        Paragraph("Industry rankings", S["h2"]),
        data_table(["Industry", "Skills", "Avg SES", "3Y Growth", "Top Skill", "Top Tier"], rows, [1.45*inch, .55*inch, .75*inch, .78*inch, 1.55*inch, .85*inch]),
        Paragraph("Average SES by industry", S["h2"]),
        BarList([(r["industry"], float(r["avg_ses_score"]), pct(r["avg_ses_score"])) for _, r in df.iterrows()], bar_color=TEAL),
        Paragraph("Key reading", S["h2"]),
        *bullets([
            "Higher average SES indicates stronger safety and future-proofing within an industry skill mix.",
            "Forecast growth is a three-year industry-level growth signal from industry_analytics.csv.",
            "Risk distribution is computed from very safe, safe, moderate, risky, and extinction-risk skill counts.",
        ]),
    ]
    return make_doc(
        "industry_analytics_report.pdf",
        "Industry Analytics Report",
        "Industry-level SES, demand, forecast growth, and skill coverage from industry_analytics.csv.",
        story,
    )


def salary_report(ctx: ReportContext):
    df = ctx.ses.copy()
    df["skill_label"] = df["skill"].map(clean_skill)
    top_salary = df.sort_values("salary_premium", ascending=False).head(12)
    top_demand = df.sort_values("linkedin_demand", ascending=False).head(10)
    metrics = [
        ("Tracked Skills", str(len(df))),
        ("Avg Salary Premium", pct(df["salary_premium"].mean())),
        ("Highest Premium", pct(df["salary_premium"].max())),
        ("Avg Demand Index", pct(df["linkedin_demand"].mean())),
        ("High Demand Skills", str(int((df["linkedin_demand"] >= df["linkedin_demand"].quantile(.75)).sum()))),
        ("Median SES", pct(df["ses_score"].median())),
    ]
    salary_rows = [
        [r["skill_label"], r["sub_category"], pct(r["salary_premium"]), pct(r["linkedin_demand"]), pct(r["ses_score"]), r["archetype"]]
        for _, r in top_salary.iterrows()
    ]
    story = [
        metric_table(metrics),
        Paragraph("Highest salary premium skills", S["h2"]),
        data_table(["Skill", "Category", "Salary Premium", "Demand", "SES", "Archetype"], salary_rows, [1.25*inch, 1.15*inch, .95*inch, .75*inch, .65*inch, 1.05*inch]),
        Paragraph("Demand leaders", S["h2"]),
        BarList([(r["skill_label"], float(r["linkedin_demand"]), pct(r["linkedin_demand"])) for _, r in top_demand.iterrows()], bar_color=CYAN),
        Paragraph("Interpretation", S["h2"]),
        *bullets([
            "Salary premium is a relative signal from the master skill dataset, not a direct dollar salary estimate.",
            "Demand index is based on LinkedIn demand signals joined into SES rankings.",
            "Use this report to identify skills with both compensation leverage and strong safety signals.",
        ]),
    ]
    return make_doc(
        "salary_signal_report.pdf",
        "Salary Signal Report",
        "Salary premium and demand signals from SES rankings and master skill datasets.",
        story,
    )


def risk_report(ctx: ReportContext):
    df = ctx.ses.copy()
    df["skill_label"] = df["skill"].map(clean_skill)
    safe = df.sort_values("ses_score", ascending=False).head(10)
    watch = df.sort_values("ses_score", ascending=True).head(10)
    tier_counts = df["ses_tier"].value_counts().reset_index()
    tier_counts.columns = ["tier", "count"]
    metrics = [
        ("Final Skills Ranked", str(len(df))),
        ("Average SES", pct(df["ses_score"].mean())),
        ("Very Safe Skills", str(int(df["ses_tier"].str.lower().eq("very safe").sum()))),
        ("Risk Exposure", str(int(df["ses_tier"].str.lower().isin(["risky", "extinction risk"]).sum()))),
        ("Future-Proof Skills", str(int(df["archetype"].str.lower().eq("future-proof").sum()))),
        ("Stable Skills", str(int(df["archetype"].str.lower().eq("stable").sum()))),
    ]
    story = [
        metric_table(metrics),
        Paragraph("Top safety scores", S["h2"]),
        data_table(["Skill", "Category", "SES", "Tier", "Archetype", "Trend"], [
            [r["skill_label"], r["sub_category"], pct(r["ses_score"]), r["ses_tier"], r["archetype"], r["forecast_trend"]]
            for _, r in safe.iterrows()
        ], [1.35*inch, 1.05*inch, .65*inch, .85*inch, 1.05*inch, .85*inch]),
        Paragraph("Skills to monitor", S["h2"]),
        data_table(["Skill", "Category", "SES", "Tier", "Reason Signal"], [
            [r["skill_label"], r["sub_category"], pct(r["ses_score"]), r["ses_tier"], f"Demand {pct(r['linkedin_demand'])}; Future interest {pct(r['future_interest'])}"]
            for _, r in watch.iterrows()
        ], [1.35*inch, 1.05*inch, .65*inch, .85*inch, 1.9*inch]),
        Paragraph("SES tier distribution", S["h2"]),
        BarList([(str(r["tier"]), float(r["count"]), f"{int(r['count'])} skills") for _, r in tier_counts.iterrows()], bar_color=AMBER),
        Paragraph("How to read SES", S["h2"]),
        *bullets([
            "SES is a 0-100 safety and employability score built from demand, salary, usage, future interest, adoption, growth, cluster, and forecast signals.",
            "Lower SES does not mean a skill has no value; it means the processed data shows weaker future-proofing relative to the rest of the skill universe.",
            "Watch-list skills should be paired with stronger adjacent skills or moved into a roadmap with higher-growth complements.",
        ]),
    ]
    return make_doc(
        "risk_and_ses_report.pdf",
        "Risk and SES Report",
        "Skill safety, archetype, trend, and watch-list outputs from ses_rankings.csv.",
        story,
    )


def regional_report(ctx: ReportContext):
    df = ctx.adoption.copy()
    df["skill_label"] = df["skill"].map(clean_skill)
    top = df.sort_values("global_adoption_score", ascending=False).head(12)
    metrics = [
        ("Skills With Adoption Data", str(len(df))),
        ("Max Countries Present", str(int(df["countries_present"].max()))),
        ("Avg Adoption Score", pct(df["global_adoption_score"].mean())),
        ("Highest Interest", f"{int(df['raw_global_interest'].max()):,}"),
        ("Mapped History Rows", f"{len(ctx.history):,}"),
        ("History Years", f"{int(ctx.history['year'].min())}-{int(ctx.history['year'].max())}"),
    ]
    story = [
        metric_table(metrics),
        Paragraph("Global adoption leaders", S["h2"]),
        data_table(["Skill", "Countries Present", "Raw Global Interest", "Adoption Score"], [
            [r["skill_label"], str(int(r["countries_present"])), f"{int(r['raw_global_interest']):,}", pct(r["global_adoption_score"])]
            for _, r in top.iterrows()
        ], [1.65*inch, 1.2*inch, 1.3*inch, 1.1*inch]),
        Paragraph("Adoption score comparison", S["h2"]),
        BarList([(r["skill_label"], float(r["global_adoption_score"]), pct(r["global_adoption_score"])) for _, r in top.head(10).iterrows()], bar_color=VIOLET),
        Paragraph("Notes", S["h2"]),
        *bullets([
            "This report uses global_adoption.csv and skill_demand_history_v2.csv as the regional and time-series demand reference.",
            "Country coverage reflects where skill interest appears in the processed global adoption dataset.",
            "Regional demand should be read as a comparative signal, not a full labor-market census.",
        ]),
    ]
    return make_doc(
        "regional_demand_report.pdf",
        "Regional Demand Report",
        "Global adoption and longitudinal demand signals used by the SkillLens analytics pages.",
        story,
    )


def advisor_report(ctx: ReportContext):
    skill_count = len(ctx.ses)
    top_future = ctx.ses.sort_values("ses_score", ascending=False).head(8)
    top_industries = ctx.industries.sort_values("avg_ses_score", ascending=False).head(5)
    methods = ctx.forecasts["forecast_method"].value_counts()
    metrics = [
        ("Knowledge Base Skills", str(skill_count)),
        ("Forecast Rows", str(len(ctx.forecasts))),
        ("Industry Rows", str(len(ctx.industries))),
        ("Skill-Year Rows", f"{len(ctx.history):,}"),
        ("Top Method", str(methods.index[0] if len(methods) else "N/A")),
        ("Avg Confidence", pct(ctx.forecasts["confidence"].mean())),
    ]
    story = [
        metric_table(metrics),
        Paragraph("Advisor source grounding", S["h2"]),
        data_table(["Source", "Used For", "Rows"], [
            ["ses_rankings.csv", "Skill scores, tiers, archetypes, explainability", str(len(ctx.ses))],
            ["forecast_results.csv", "Forecast trend, method, confidence, 1Y/3Y outlook", str(len(ctx.forecasts))],
            ["industry_analytics.csv", "Industry summaries, average SES, demand, risk exposure", str(len(ctx.industries))],
            ["industry_skill_map.csv", "Industry-specific skill recommendations", str(len(ctx.industry_map))],
            ["skill_demand_history_v2.csv", "Historical demand context", f"{len(ctx.history):,}"],
        ], [1.55*inch, 3.55*inch, .7*inch]),
        Paragraph("Recommended high-safety skills for Advisor answers", S["h2"]),
        data_table(["Skill", "SES", "Category", "Archetype", "Forecast"], [
            [clean_skill(r["skill"]), pct(r["ses_score"]), r["sub_category"], r["archetype"], r["forecast_trend"]]
            for _, r in top_future.iterrows()
        ], [1.35*inch, .65*inch, 1.1*inch, 1.05*inch, .9*inch]),
        Paragraph("Strong industry contexts", S["h2"]),
        BarList([(r["industry"], float(r["avg_ses_score"]), pct(r["avg_ses_score"])) for _, r in top_industries.iterrows()], bar_color=TEAL),
        Paragraph("Recommended answer format", S["h2"]),
        *bullets([
            "Start with a direct recommendation, then cite the relevant score, trend, and confidence signals.",
            "Show source chips: SES Rankings, Forecast Results, Industry Analytics, and Skill Archetypes.",
            "When confidence is low or history is limited, say so and suggest adjacent stronger skills.",
            "Convert roadmap-style answers into stages with skills, mini projects, outcomes, hours, and difficulty.",
        ]),
    ]
    return make_doc(
        "career_advisor_notes.pdf",
        "Career Advisor Notes",
        "RAG source reference, grounding rules, and reliable answer patterns for the Career Advisor.",
        story,
    )


def index_report(paths: list[Path], ctx: ReportContext):
    story = [
        metric_table([
            ("PDF Reports", str(len(paths))),
            ("Final Skills", str(len(ctx.ses))),
            ("Industries", str(len(ctx.industries))),
            ("Skill-Year Rows", f"{len(ctx.history):,}"),
            ("Forecast Rows", str(len(ctx.forecasts))),
            ("Industry-Skill Links", str(len(ctx.industry_map))),
        ]),
        Paragraph("Generated files", S["h2"]),
        data_table(["Report", "Filename"], [[p.stem.replace("_", " ").title(), p.name] for p in paths], [2.7*inch, 3.1*inch]),
        Paragraph("Dataset note", S["h2"]),
        *bullets([
            "All reports use processed project CSVs from backend/data/processed.",
            "Forecast indexes use forecast_score fields where available; raw forecast count columns are not shown as percentages.",
            "Salary report values are relative premium signals from the dataset, not direct compensation guarantees.",
        ]),
    ]
    return make_doc(
        "skilllens_reports_index.pdf",
        "SkillLens Reports Index",
        "Clean report packet generated from the current processed HSEP datasets.",
        story,
    )


def load_context() -> ReportContext:
    return ReportContext(
        master=read_csv("master_skill_dataset_v9.csv"),
        ses=read_csv("ses_rankings.csv"),
        forecasts=read_csv("forecast_results.csv"),
        industries=read_csv("industry_analytics.csv"),
        industry_map=read_csv("industry_skill_map.csv"),
        history=read_csv("skill_demand_history_v2.csv"),
        adoption=read_csv("global_adoption.csv"),
        clusters=read_csv("skill_clusters.csv"),
        cluster_summary=read_csv("cluster_summary.csv"),
    )


def main():
    ctx = load_context()
    paths = [
        forecast_report(ctx),
        industry_report(ctx),
        salary_report(ctx),
        risk_report(ctx),
        regional_report(ctx),
        advisor_report(ctx),
    ]
    index = index_report(paths, ctx)
    print("Generated reports:")
    for path in [index] + paths:
        print(path)


if __name__ == "__main__":
    main()
