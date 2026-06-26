import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintReportButton from "@/components/print-report-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReportsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type AuditIssue = {
  id: string;
  title: string;
  description: string | null;
  severity: string | null;
  category: string | null;
  recommendation: string | null;
  created_at: string;
};

type GscKeywordRow = {
  id: string;
  query: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
};

type KeywordInsight = GscKeywordRow & {
  intent: string;
  status: string;
};

function normalizeDomainForDisplay(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "No scan yet";
  }

  return new Date(date).toLocaleDateString();
}

function formatShortDate(date: string | null | undefined) {
  if (!date) {
    return "--";
  }

  return new Date(date).toLocaleDateString();
}

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function formatCtr(ctr: number | null | undefined) {
  if (ctr === null || ctr === undefined) {
    return "--";
  }

  return `${(Number(ctr) * 100).toFixed(1)}%`;
}

function formatPosition(position: number | null | undefined) {
  if (position === null || position === undefined) {
    return "--";
  }

  return Number(position).toFixed(1);
}

function getScoreStatus(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "Not scanned";
  }

  if (score >= 90) {
    return "Strong";
  }

  if (score >= 70) {
    return "Needs improvement";
  }

  return "Needs attention";
}

function getScoreBadgeClass(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
  }

  if (score >= 70) {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function getSeverityClass(severity: string | null | undefined) {
  if (severity === "high") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (severity === "medium") {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
}

function getKeywordIntent(query: string) {
  const lowerQuery = query.toLowerCase();

  if (
    lowerQuery.includes("near me") ||
    lowerQuery.includes("services") ||
    lowerQuery.includes("consultant") ||
    lowerQuery.includes("designer") ||
    lowerQuery.includes("developer") ||
    lowerQuery.includes("agency") ||
    lowerQuery.includes("company")
  ) {
    return "Commercial";
  }

  if (
    lowerQuery.includes("rankcraft") ||
    lowerQuery.includes("rank craft") ||
    lowerQuery.includes("rankcraftweb")
  ) {
    return "Brand";
  }

  return "General";
}

function getKeywordStatus(keyword: GscKeywordRow) {
  const impressions = Number(keyword.impressions || 0);
  const clicks = Number(keyword.clicks || 0);
  const ctr = Number(keyword.ctr || 0);
  const position = Number(keyword.position || 0);

  if (position > 0 && position <= 3) {
    return "Ranking Well";
  }

  if (position > 3 && position <= 15) {
    return "Opportunity";
  }

  if (impressions >= 10 && clicks === 0) {
    return "Low CTR";
  }

  if (ctr < 0.02 && impressions >= 10) {
    return "CTR Gap";
  }

  if (position > 15 && position <= 50) {
    return "Needs Work";
  }

  return "Monitor";
}

function getKeywordStatusClass(status: string) {
  if (
    status === "Ranking Well" ||
    status === "Opportunity" ||
    status === "Low CTR" ||
    status === "CTR Gap"
  ) {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  if (status === "Needs Work") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
}

function getOverallSummary(
  seoScore: number | null | undefined,
  issueCount: number,
  keywordCount: number
) {
  if (seoScore === null || seoScore === undefined) {
    return "No completed audit is available yet. Run an SEO audit and sync Google Search Console keyword data to generate a complete client report.";
  }

  if (seoScore >= 90 && issueCount <= 2 && keywordCount > 0) {
    return "The website is in strong condition overall. The next focus should be protecting existing rankings, improving click-through rate, and expanding pages with proven search visibility.";
  }

  if (seoScore >= 70 && keywordCount > 0) {
    return "The website has a workable SEO foundation. The biggest opportunities are fixing technical gaps, strengthening page relevance, and targeting keywords already receiving impressions.";
  }

  return "The website needs attention. Fix the core SEO issues first, then use keyword data to prioritize pages with ranking and CTR opportunities.";
}

function getLatestKeywordRange(rows: GscKeywordRow[]) {
  const latestRow = [...rows].sort((a, b) => {
    const aDate = new Date(a.created_at || a.end_date || 0).getTime();
    const bDate = new Date(b.created_at || b.end_date || 0).getTime();

    return bDate - aDate;
  })[0];

  if (!latestRow?.start_date || !latestRow?.end_date) {
    return null;
  }

  return {
    startDate: latestRow.start_date,
    endDate: latestRow.end_date,
  };
}

function getLatestKeywordRows(rows: GscKeywordRow[]) {
  const latestRange = getLatestKeywordRange(rows);

  if (!latestRange) {
    return [];
  }

  return rows.filter((row) => {
    return (
      row.start_date === latestRange.startDate &&
      row.end_date === latestRange.endDate
    );
  });
}

function sortKeywords(rows: GscKeywordRow[]) {
  return [...rows].sort((a, b) => {
    const impressionsDiff =
      Number(b.impressions || 0) - Number(a.impressions || 0);

    if (impressionsDiff !== 0) {
      return impressionsDiff;
    }

    return Number(a.position || 999) - Number(b.position || 999);
  });
}

export default async function ReportsPage({ params }: ReportsPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, domain, created_at")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const { data: latestPageSpeedReport } = await supabase
    .from("pagespeed_reports")
    .select(
      "id, performance_score, accessibility_score, best_practices_score, seo_score, created_at"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestAudit } = await supabase
    .from("audits")
    .select("id, score, status, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: issues } = latestAudit?.id
    ? await supabase
        .from("audit_issues")
        .select(
          "id, title, description, severity, category, recommendation, created_at"
        )
        .eq("audit_id", latestAudit.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: gscKeywordRows } = await supabase
    .from("gsc_keyword_rows")
    .select(
      "id, query, clicks, impressions, ctr, position, start_date, end_date, created_at"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const issueList = (issues || []) as AuditIssue[];
  const allKeywordRows = (gscKeywordRows || []) as GscKeywordRow[];
  const keywordList = sortKeywords(getLatestKeywordRows(allKeywordRows));

  const seoScore = latestPageSpeedReport?.seo_score ?? latestAudit?.score;
  const performanceScore = latestPageSpeedReport?.performance_score;
  const accessibilityScore = latestPageSpeedReport?.accessibility_score;
  const bestPracticesScore = latestPageSpeedReport?.best_practices_score;
  const latestScanDate =
    latestAudit?.created_at || latestPageSpeedReport?.created_at || null;

  const highIssues = issueList.filter((issue) => issue.severity === "high")
    .length;

  const mediumIssues = issueList.filter((issue) => issue.severity === "medium")
    .length;

  const lowIssues = issueList.filter((issue) => issue.severity === "low").length;

  const issueCount = issueList.length;

  const totalClicks = keywordList.reduce((sum, keyword) => {
    return sum + Number(keyword.clicks || 0);
  }, 0);

  const totalImpressions = keywordList.reduce((sum, keyword) => {
    return sum + Number(keyword.impressions || 0);
  }, 0);

  const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : null;

  const pageOneKeywords = keywordList.filter((keyword) => {
    const position = Number(keyword.position || 0);
    return position > 0 && position <= 10;
  });

  const opportunityKeywords = keywordList.filter((keyword) => {
    const position = Number(keyword.position || 0);
    return position >= 4 && position <= 15;
  });

  const lowCtrKeywords = keywordList.filter((keyword) => {
    const impressions = Number(keyword.impressions || 0);
    const clicks = Number(keyword.clicks || 0);
    const ctr = Number(keyword.ctr || 0);

    return impressions >= 10 && (clicks === 0 || ctr < 0.02);
  });

  const keywordInsights: KeywordInsight[] = keywordList.map((keyword) => ({
    ...keyword,
    intent: getKeywordIntent(keyword.query),
    status: getKeywordStatus(keyword),
  }));

  const topIssues = issueList.slice(0, 5);
  const topKeywords = keywordInsights.slice(0, 8);

  const latestKeywordRange = getLatestKeywordRange(allKeywordRows);
  const latestKeywordDate = latestKeywordRange
    ? `${formatShortDate(latestKeywordRange.startDate)} - ${formatShortDate(
        latestKeywordRange.endDate
      )}`
    : "No keyword data yet";

  const reportDate = new Date().toLocaleDateString();

  return (
    <div className="space-y-6">
      <style>
        {`
          @media print {
            @page {
              size: letter;
              margin: 0.35in;
            }

            html,
            body {
              background: white !important;
              color: #111111 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body * {
              visibility: hidden !important;
            }

            .print-report,
            .print-report * {
              visibility: visible !important;
            }

            .print-report {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            .no-print {
              display: none !important;
              visibility: hidden !important;
            }

            .print-card {
              box-shadow: none !important;
              border-color: #d9cfbd !important;
            }

            .print-section {
              break-inside: auto !important;
              page-break-inside: auto !important;
            }

            .print-avoid {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .print-grid-4 {
              grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              gap: 6px !important;
            }

            .print-grid-3 {
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              gap: 6px !important;
            }

            .print-grid-2 {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 6px !important;
            }

            .print-tight {
              padding: 8px !important;
            }

            .print-report h1 {
              font-size: 22px !important;
              line-height: 1.1 !important;
            }

            .print-report h2 {
              font-size: 16px !important;
              line-height: 1.15 !important;
              margin: 0 !important;
            }

            .print-report h3 {
              font-size: 14px !important;
              line-height: 1.15 !important;
              margin: 0 !important;
            }

            .print-report p,
            .print-report td,
            .print-report th {
              font-size: 10px !important;
              line-height: 1.35 !important;
            }

            .print-score {
              font-size: 24px !important;
              line-height: 1 !important;
            }

            .print-table {
              min-width: 0 !important;
              font-size: 9px !important;
            }

            .print-table th,
            .print-table td {
              padding: 5px 6px !important;
            }

            .print-footer {
              display: block !important;
              margin-top: 8px !important;
              padding-top: 8px !important;
              border-top: 1px solid #d9cfbd !important;
            }
          }
        `}
      </style>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a7a19]">
            Client Report
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Compact SEO report for export or print.
          </p>
        </div>

        <PrintReportButton />
      </div>

      <div className="print-report space-y-4">
        <section className="print-avoid rounded-2xl border border-[#e6dcc8] bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="inline-flex rounded-full border border-[#d4af37]/40 bg-[#fff8df] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a5b00]">
                RankCraft Audit
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                SEO Audit Report
              </h1>

              <p className="mt-2 text-base font-semibold text-slate-950">
                {project.name}
              </p>

              <p className="text-sm text-slate-500">
                {normalizeDomainForDisplay(project.domain)}
              </p>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                {getOverallSummary(seoScore, issueCount, keywordList.length)}
              </p>
            </div>

            <div className="rounded-2xl border border-[#2b2413] bg-[#111111] p-4 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b6a46a]">
                    Overall SEO Score
                  </p>
                  <p className="print-score mt-2 text-5xl font-bold tracking-tight text-white">
                    {seoScore ?? "--"}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getScoreBadgeClass(
                    seoScore
                  )}`}
                >
                  {getScoreStatus(seoScore)}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-white/10 p-2">
                  <span className="text-slate-400">Report Date</span>
                  <span className="font-semibold text-white">{reportDate}</span>
                </div>

                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-white/10 p-2">
                  <span className="text-slate-400">Latest Audit</span>
                  <span className="text-right font-semibold text-white">
                    {formatDate(latestScanDate)}
                  </span>
                </div>

                <div className="flex justify-between gap-3 rounded-xl border border-white/10 bg-white/10 p-2">
                  <span className="text-slate-400">Keyword Data</span>
                  <span className="text-right font-semibold text-white">
                    {latestKeywordDate}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="print-section space-y-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Score Overview</h2>
            <p className="text-sm text-slate-500">
              Latest audit and PageSpeed summary.
            </p>
          </div>

          <div className="print-grid-4 grid gap-3 md:grid-cols-4">
            {[
              {
                label: "SEO",
                value: seoScore,
                helper: getScoreStatus(seoScore),
              },
              {
                label: "Performance",
                value: performanceScore,
                helper: getScoreStatus(performanceScore),
              },
              {
                label: "Accessibility",
                value: accessibilityScore,
                helper: getScoreStatus(accessibilityScore),
              },
              {
                label: "Best Practices",
                value: bestPracticesScore,
                helper: getScoreStatus(bestPracticesScore),
              },
            ].map((score) => (
              <Card
                key={score.label}
                className="print-card print-tight rounded-2xl border-[#e6dcc8] bg-white shadow-sm"
              >
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {score.label}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="print-score text-3xl font-bold tracking-tight text-slate-950">
                    {score.value ?? "--"}
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getScoreBadgeClass(
                      score.value
                    )}`}
                  >
                    {score.helper}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="print-avoid grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
            <h3 className="font-semibold text-slate-950">Executive Summary</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {getOverallSummary(seoScore, issueCount, keywordList.length)}
            </p>
          </div>

          <div className="rounded-2xl border border-[#d4af37]/50 bg-[#fff8df] p-4">
            <h3 className="font-semibold text-[#7a5b00]">
              Recommended Focus
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7a5b00]/80">
              Fix high and medium SEO issues first, improve keywords with
              impressions but weak clicks, then monitor ranking movement after
              updates.
            </p>
          </div>
        </section>

        <section className="print-section space-y-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Visibility & Issues
            </h2>
            <p className="text-sm text-slate-500">
              Keyword visibility and latest SEO issue summary.
            </p>
          </div>

          <div className="print-grid-4 grid gap-3 md:grid-cols-4">
            {[
              {
                label: "Keywords",
                value: keywordList.length,
                helper: "Latest synced.",
              },
              {
                label: "Clicks",
                value: formatNumber(totalClicks),
                helper: "Organic clicks.",
              },
              {
                label: "Impressions",
                value: formatNumber(totalImpressions),
                helper: "Search visibility.",
              },
              {
                label: "Avg. CTR",
                value: formatCtr(averageCtr),
                helper: "Click-through rate.",
              },
            ].map((item) => (
              <Card
                key={item.label}
                className="print-card print-tight rounded-2xl border-[#e6dcc8] bg-white shadow-sm"
              >
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="print-score text-3xl font-bold tracking-tight text-slate-950">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="print-grid-4 grid gap-3 md:grid-cols-4">
            {[
              {
                label: "Total Issues",
                value: issueCount,
                helper: "Latest findings.",
                className: "border-[#e6dcc8] bg-white",
              },
              {
                label: "High",
                value: highIssues,
                helper: "Fix first.",
                className: "border-red-200 bg-red-50",
              },
              {
                label: "Medium",
                value: mediumIssues,
                helper: "Review next.",
                className: "border-[#d4af37]/50 bg-[#fff8df]",
              },
              {
                label: "Low",
                value: lowIssues,
                helper: "Improve later.",
                className: "border-[#e6dcc8] bg-[#faf7ef]",
              },
            ].map((item) => (
              <Card
                key={item.label}
                className={`print-card print-tight rounded-2xl shadow-sm ${item.className}`}
              >
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="print-score text-3xl font-bold tracking-tight text-slate-950">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="print-grid-3 grid gap-3 md:grid-cols-3">
            {[
              {
                label: "Page 1 Keywords",
                value: pageOneKeywords.length,
                helper: "Positions 1–10.",
              },
              {
                label: "Opportunities",
                value: opportunityKeywords.length,
                helper: "Positions 4–15.",
              },
              {
                label: "Low CTR Keywords",
                value: lowCtrKeywords.length,
                helper: "Weak clicks.",
              },
            ].map((item) => (
              <Card
                key={item.label}
                className="print-card print-tight rounded-2xl border-[#e6dcc8] bg-white shadow-sm"
              >
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="print-score text-3xl font-bold tracking-tight text-slate-950">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="print-avoid rounded-2xl border border-[#e6dcc8] bg-white p-4 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Action Plan
          </h2>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {[
              {
                title: "1. Resolve SEO blockers",
                description:
                  "Fix high and medium issues first, especially metadata, headings, canonical tags, and technical SEO gaps.",
              },
              {
                title: "2. Improve keyword pages",
                description:
                  "Focus on keywords ranking between positions 4–15 because they are close enough to improve with targeted optimization.",
              },
              {
                title: "3. Rewrite weak snippets",
                description:
                  "For keywords with impressions but no clicks, rewrite title tags and meta descriptions to better match search intent.",
              },
              {
                title: "4. Track after changes",
                description:
                  "Run another audit and sync Search Console after updates to measure ranking and CTR movement.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-3"
              >
                <p className="font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="print-section grid gap-4 lg:grid-cols-2">
          <Card className="print-card rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-950">
                Latest SEO Issues
              </CardTitle>
            </CardHeader>

            <CardContent>
              {topIssues.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d4af37]/50 bg-[#faf7ef] p-4">
                  <p className="text-sm text-slate-500">
                    No SEO issues found in the latest audit.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-xl border border-[#e6dcc8] bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {issue.title}
                          </p>
                          <p className="mt-1 text-sm leading-5 text-slate-500">
                            {issue.description || "No description available."}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${getSeverityClass(
                            issue.severity
                          )}`}
                        >
                          {issue.severity || "medium"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="print-card rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-950">
                Top Keywords
              </CardTitle>
            </CardHeader>

            <CardContent>
              {topKeywords.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d4af37]/50 bg-[#faf7ef] p-4">
                  <p className="text-sm text-slate-500">
                    No keyword data imported yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#e6dcc8]">
                  <Table className="print-table min-w-[760px]">
                    <TableHeader>
                      <TableRow className="bg-[#faf7ef]">
                        <TableHead>Keyword</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Clicks</TableHead>
                        <TableHead className="text-center">Impr.</TableHead>
                        <TableHead className="text-center">CTR</TableHead>
                        <TableHead className="text-center">Pos.</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {topKeywords.map((keyword) => (
                        <TableRow key={keyword.id}>
                          <TableCell className="font-medium text-slate-950">
                            {keyword.query}
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getKeywordStatusClass(
                                keyword.status
                              )}`}
                            >
                              {keyword.status}
                            </span>
                          </TableCell>

                          <TableCell className="text-center font-medium">
                            {formatNumber(keyword.clicks)}
                          </TableCell>

                          <TableCell className="text-center font-medium">
                            {formatNumber(keyword.impressions)}
                          </TableCell>

                          <TableCell className="text-center font-medium">
                            {formatCtr(keyword.ctr)}
                          </TableCell>

                          <TableCell className="text-center font-medium">
                            {formatPosition(keyword.position)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <footer className="print-footer hidden">
          <p className="text-xs text-slate-500">
            Generated by RankCraft Audit for{" "}
            {normalizeDomainForDisplay(project.domain)}. Based on the latest
            available audit, PageSpeed data, and Google Search Console keyword
            sync.
          </p>
        </footer>
      </div>
    </div>
  );
}