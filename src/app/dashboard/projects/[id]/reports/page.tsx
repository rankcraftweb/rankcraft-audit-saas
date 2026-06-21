import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintReportButton from "@/components/print-report-button";
import { Button } from "@/components/ui/button";
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
  opportunityScore: number;
  intent: string;
  status: string;
  reason: string;
};

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
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  if (score >= 90) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (score >= 70) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function getSeverityClass(severity: string | null | undefined) {
  if (severity === "high") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (severity === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getKeywordStatusClass(status: string) {
  if (status === "Ranking Well") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Opportunity") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "Low CTR" || status === "CTR Gap") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "Needs Work") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
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
    return "The website has a workable SEO foundation. The biggest opportunities are improving technical gaps, strengthening page relevance, and targeting keywords already receiving impressions.";
  }

  if (keywordCount > 0) {
    return "Google Search Console data is connected, but the latest audit shows SEO issues that should be resolved before scaling content and keyword targeting.";
  }

  return "The website needs attention. Fix the core SEO issues first, then sync Google Search Console keyword data to track visibility and ranking opportunities.";
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
    lowerQuery.includes("how") ||
    lowerQuery.includes("what") ||
    lowerQuery.includes("guide") ||
    lowerQuery.includes("tips") ||
    lowerQuery.includes("best")
  ) {
    return "Informational";
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

function getOpportunityReason(keyword: GscKeywordRow) {
  const impressions = Number(keyword.impressions || 0);
  const clicks = Number(keyword.clicks || 0);
  const ctr = Number(keyword.ctr || 0);
  const position = Number(keyword.position || 0);

  if (position > 3 && position <= 15) {
    return "This keyword is close enough to improve with stronger content, internal links, and better page targeting.";
  }

  if (position > 15 && position <= 50) {
    return "This keyword has visibility but needs stronger page relevance, supporting content, and better internal linking.";
  }

  if (impressions >= 10 && clicks === 0) {
    return "This keyword is getting impressions but no clicks. Improve the title tag and meta description to increase CTR.";
  }

  if (ctr < 0.02 && impressions >= 10) {
    return "This keyword has a weak click-through rate. Improve the search snippet and match the page more closely to search intent.";
  }

  if (position > 0 && position <= 3) {
    return "This keyword is ranking well. Keep the page fresh and protect the ranking with internal links.";
  }

  return "Keep monitoring this keyword as more Search Console data comes in.";
}

function getOpportunityScore(keyword: GscKeywordRow) {
  const impressions = Number(keyword.impressions || 0);
  const clicks = Number(keyword.clicks || 0);
  const ctr = Number(keyword.ctr || 0);
  const position = Number(keyword.position || 100);

  let score = 0;

  if (position > 3 && position <= 15) {
    score += 45;
  }

  if (position > 15 && position <= 50) {
    score += 25;
  }

  if (impressions >= 50) {
    score += 30;
  } else if (impressions >= 10) {
    score += 20;
  } else if (impressions > 0) {
    score += 10;
  }

  if (clicks === 0 && impressions > 0) {
    score += 20;
  }

  if (ctr < 0.02 && impressions >= 10) {
    score += 15;
  }

  return score;
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "No date available";
  }

  return new Date(date).toLocaleString();
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

function sortKeywords(rows: GscKeywordRow[]) {
  return [...rows].sort((a, b) => {
    const clicksDiff = Number(b.clicks || 0) - Number(a.clicks || 0);

    if (clicksDiff !== 0) {
      return clicksDiff;
    }

    const impressionsDiff =
      Number(b.impressions || 0) - Number(a.impressions || 0);

    if (impressionsDiff !== 0) {
      return impressionsDiff;
    }

    return Number(a.position || 999) - Number(b.position || 999);
  });
}

function getLatestKeywordRange(rows: GscKeywordRow[]) {
  const latestRow = [...rows].sort((a, b) => {
    const aCreated = new Date(a.created_at || a.end_date || 0).getTime();
    const bCreated = new Date(b.created_at || b.end_date || 0).getTime();

    return bCreated - aCreated;
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

function getBestRankingKeyword(rows: GscKeywordRow[]) {
  return rows
    .filter((row) => Number(row.position || 0) > 0)
    .sort((a, b) => Number(a.position || 999) - Number(b.position || 999))[0];
}

function getTopOpportunityKeyword(rows: GscKeywordRow[]) {
  return rows
    .filter((row) => {
      const position = Number(row.position || 0);
      return position >= 4 && position <= 15;
    })
    .sort((a, b) => {
      const impressionsDiff =
        Number(b.impressions || 0) - Number(a.impressions || 0);

      if (impressionsDiff !== 0) {
        return impressionsDiff;
      }

      return Number(a.position || 999) - Number(b.position || 999);
    })[0];
}

function getLowCtrKeyword(rows: GscKeywordRow[]) {
  return rows
    .filter((row) => Number(row.impressions || 0) > 0)
    .sort((a, b) => {
      const ctrDiff = Number(a.ctr || 0) - Number(b.ctr || 0);

      if (ctrDiff !== 0) {
        return ctrDiff;
      }

      return Number(b.impressions || 0) - Number(a.impressions || 0);
    })[0];
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
    .limit(300);

  const allKeywordRows = (gscKeywordRows || []) as GscKeywordRow[];
  const latestKeywordRows = getLatestKeywordRows(allKeywordRows);
  const keywordList = sortKeywords(latestKeywordRows);
  const issueList = (issues || []) as AuditIssue[];

  const issueCount = issueList.length;
  const highIssues = issueList.filter((issue) => issue.severity === "high").length;
  const mediumIssues = issueList.filter(
    (issue) => issue.severity === "medium"
  ).length;
  const lowIssues = issueList.filter((issue) => issue.severity === "low").length;

  const seoScore = latestPageSpeedReport?.seo_score ?? latestAudit?.score;
  const performanceScore = latestPageSpeedReport?.performance_score;
  const accessibilityScore = latestPageSpeedReport?.accessibility_score;
  const bestPracticesScore = latestPageSpeedReport?.best_practices_score;

  const totalClicks = keywordList.reduce((sum, keyword) => {
    return sum + Number(keyword.clicks || 0);
  }, 0);

  const totalImpressions = keywordList.reduce((sum, keyword) => {
    return sum + Number(keyword.impressions || 0);
  }, 0);

  const averagePosition =
    keywordList.length > 0
      ? keywordList.reduce((sum, keyword) => {
          return sum + Number(keyword.position || 0);
        }, 0) / keywordList.length
      : null;

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

    return impressions > 0 && (clicks === 0 || ctr < 0.02);
  });

  const topOpportunities: KeywordInsight[] = keywordList
    .map((keyword) => ({
      ...keyword,
      opportunityScore: getOpportunityScore(keyword),
      intent: getKeywordIntent(keyword.query),
      status: getKeywordStatus(keyword),
      reason: getOpportunityReason(keyword),
    }))
    .filter((keyword) => keyword.opportunityScore > 0)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 5);

  const topKeywords = [...keywordList]
    .sort((a, b) => {
      const impressionsDiff =
        Number(b.impressions || 0) - Number(a.impressions || 0);

      if (impressionsDiff !== 0) {
        return impressionsDiff;
      }

      return Number(a.position || 999) - Number(b.position || 999);
    })
    .slice(0, 8);

  const bestRankingKeyword = getBestRankingKeyword(keywordList);
  const topOpportunityKeyword = getTopOpportunityKeyword(keywordList);
  const lowCtrKeyword = getLowCtrKeyword(keywordList);

  const reportDate = new Date().toLocaleString();
  const latestScanDate =
    latestAudit?.created_at || latestPageSpeedReport?.created_at;

  const latestKeywordRange = getLatestKeywordRange(allKeywordRows);

  const latestKeywordDate = latestKeywordRange
    ? `${formatShortDate(latestKeywordRange.startDate)} - ${formatShortDate(
        latestKeywordRange.endDate
      )}`
    : "No keyword data yet";

  return (
    <div className="space-y-8">
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 7mm;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-shadow: none !important;
            }

            html,
            body {
              background: white !important;
              color: black !important;
              font-size: 8.5px !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
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
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
              overflow: visible !important;
              background: white !important;
            }

            aside,
            header,
            nav,
            .no-print,
            [data-sidebar],
            [data-header],
            [role="banner"],
            [role="navigation"] {
              display: none !important;
              visibility: hidden !important;
            }

            main,
            main > div,
            section,
            article {
              margin: 0 !important;
              overflow: visible !important;
            }

            .print-hero,
            .print-compact-card {
              border: 1px solid #ddd !important;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .print-hero {
              padding: 0 !important;
              margin-bottom: 6px !important;
              border-radius: 10px !important;
            }

            .print-hero > div {
              padding: 10px !important;
            }

            .print-compact-card > div {
              padding: 7px !important;
            }

            .print-grid-4 {
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 5px !important;
            }

            .print-grid-3 {
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 5px !important;
            }

            .print-grid-2 {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 5px !important;
            }

            .print-section {
              margin-top: 6px !important;
              margin-bottom: 0 !important;
            }

            .print-section-title {
              font-size: 12px !important;
              margin-bottom: 2px !important;
            }

            .print-muted {
              color: #444 !important;
            }

            h1 {
              font-size: 20px !important;
              line-height: 1.05 !important;
            }

            h2 {
              font-size: 16px !important;
              line-height: 1.05 !important;
            }

            h3 {
              font-size: 12px !important;
              line-height: 1.05 !important;
            }

            h4 {
              font-size: 10px !important;
              line-height: 1.1 !important;
            }

            p {
              line-height: 1.25 !important;
            }

            .print-score {
              font-size: 20px !important;
              line-height: 1 !important;
            }

            .print-table-wrapper {
              overflow: visible !important;
              max-width: 100% !important;
            }

            .print-keyword-table {
              width: 100% !important;
              min-width: 0 !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
              font-size: 7.5px !important;
            }

            .print-keyword-table th,
            .print-keyword-table td {
              color: black !important;
              padding: 3px 4px !important;
              vertical-align: middle !important;
              word-break: break-word !important;
              white-space: normal !important;
            }

            .print-keyword-table th:nth-child(1),
            .print-keyword-table td:nth-child(1) {
              width: 31% !important;
            }

            .print-keyword-table th:nth-child(2),
            .print-keyword-table td:nth-child(2) {
              width: 13% !important;
            }

            .print-keyword-table th:nth-child(3),
            .print-keyword-table td:nth-child(3) {
              width: 16% !important;
            }

            .print-keyword-table th:nth-child(4),
            .print-keyword-table td:nth-child(4),
            .print-keyword-table th:nth-child(5),
            .print-keyword-table td:nth-child(5),
            .print-keyword-table th:nth-child(6),
            .print-keyword-table td:nth-child(6),
            .print-keyword-table th:nth-child(7),
            .print-keyword-table td:nth-child(7) {
              width: 8% !important;
              text-align: center !important;
            }

            .print-keyword-table th:nth-child(8),
            .print-keyword-table td:nth-child(8) {
              width: 8% !important;
              font-size: 6.5px !important;
            }

            table {
              page-break-inside: auto;
            }

            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }

            a {
              color: black !important;
              text-decoration: none !important;
            }

            .print-badge {
              min-width: 0 !important;
              padding: 2px 5px !important;
              font-size: 6.5px !important;
              line-height: 1 !important;
              white-space: nowrap !important;
            }

            .print-opportunity-card {
              padding: 7px !important;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .print-opportunity-metrics {
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 4px !important;
            }

            .print-opportunity-metrics > div {
              padding: 5px !important;
            }

            .print-footer {
              margin-top: 6px !important;
              padding-top: 5px !important;
              border-top: 1px solid #ddd !important;
              font-size: 7px !important;
            }
          }
        `}
      </style>

      <div className="print-report space-y-8">
        <div className="no-print flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Client SEO Report
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight">
              {project.name}
            </h2>
            <p className="mt-1 text-muted-foreground">{project.domain}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <PrintReportButton />

            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${project.id}`}>Overview</Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${project.id}/audit`}>
                Run New Audit
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${project.id}/keywords`}>
                Keywords
              </Link>
            </Button>
          </div>
        </div>

        <section className="print-hero overflow-hidden rounded-[2rem] border bg-white shadow-sm">
          <div className="relative p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-100 blur-3xl" />
            <div className="absolute right-32 top-8 h-32 w-32 rounded-full bg-blue-100 blur-3xl" />

            <div className="relative grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground print-muted">
                    RankCraft Audit
                  </p>
                  <h1 className="mt-2 text-4xl font-bold tracking-tight">
                    SEO Audit Report
                  </h1>
                </div>

                <div>
                  <p className="text-xl font-semibold">{project.name}</p>
                  <p className="text-muted-foreground print-muted">
                    {project.domain}
                  </p>
                </div>

                <p className="max-w-3xl text-sm leading-6 text-muted-foreground print-muted">
                  {getOverallSummary(seoScore, issueCount, keywordList.length)}
                </p>
              </div>

              <div className="rounded-2xl border bg-background/90 p-5 shadow-sm">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-6">
                    <span className="text-muted-foreground print-muted">
                      Report Date
                    </span>
                    <span className="font-medium">{reportDate}</span>
                  </div>

                  <div className="flex justify-between gap-6">
                    <span className="text-muted-foreground print-muted">
                      Latest Audit
                    </span>
                    <span className="font-medium">
                      {formatDate(latestScanDate)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-6">
                    <span className="text-muted-foreground print-muted">
                      Keyword Data
                    </span>
                    <span className="font-medium">{latestKeywordDate}</span>
                  </div>

                  <div className="flex justify-between gap-6">
                    <span className="text-muted-foreground print-muted">
                      Prepared By
                    </span>
                    <span className="font-medium">RankCraft Audit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="print-section space-y-4">
          <div>
            <h3 className="print-section-title text-2xl font-bold">
              Score Overview
            </h3>
            <p className="text-sm text-muted-foreground print-muted">
              Latest technical audit and PageSpeed scan summary.
            </p>
          </div>

          <div className="print-grid-4 grid gap-4 md:grid-cols-4">
            {[
              {
                label: "SEO Score",
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
              <Card key={score.label} className="print-compact-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    {score.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between gap-3">
                    <p className="print-score text-4xl font-bold tracking-tight">
                      {score.value ?? "--"}
                    </p>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium print-badge ${getScoreBadgeClass(
                        score.value
                      )}`}
                    >
                      {score.helper}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card className="print-compact-card border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground print-muted">
              Latest audit shows an SEO score of{" "}
              <span className="font-semibold text-foreground">
                {seoScore ?? "--"}
              </span>{" "}
              with{" "}
              <span className="font-semibold text-foreground">{issueCount}</span>{" "}
              detected issue(s). Google Search Console shows{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(totalImpressions)}
              </span>{" "}
              impressions,{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(totalClicks)}
              </span>{" "}
              clicks, and{" "}
              <span className="font-semibold text-foreground">
                {keywordList.length}
              </span>{" "}
              tracked keyword(s) from the latest sync.
            </p>

            <div className="print-grid-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-sm font-semibold">Technical Priority</p>
                <p className="mt-2 text-sm text-muted-foreground print-muted">
                  Fix high and medium SEO issues before scaling content.
                </p>
              </div>

              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-sm font-semibold">Keyword Priority</p>
                <p className="mt-2 text-sm text-muted-foreground print-muted">
                  Improve keywords already getting impressions and close-page-one
                  rankings.
                </p>
              </div>

              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-sm font-semibold">Reporting Priority</p>
                <p className="mt-2 text-sm text-muted-foreground print-muted">
                  Track keyword movement after every audit and content update.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="print-section space-y-4">
          <div>
            <h3 className="print-section-title text-2xl font-bold">
              Keyword Performance
            </h3>
            <p className="text-sm text-muted-foreground print-muted">
              Latest Google Search Console keyword visibility and ranking data.
            </p>
          </div>

          <div className="print-grid-4 grid gap-4 md:grid-cols-4">
            {[
              {
                label: "Tracked Keywords",
                value: keywordList.length,
                helper: "Latest synced queries",
              },
              {
                label: "Impressions",
                value: formatNumber(totalImpressions),
                helper: "Search visibility",
              },
              {
                label: "Average CTR",
                value: formatCtr(averageCtr),
                helper: "Click-through rate",
              },
              {
                label: "Avg. Position",
                value: formatPosition(averagePosition),
                helper: "Lower is better",
              },
            ].map((item) => (
              <Card key={item.label} className="print-compact-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="print-score text-4xl font-bold tracking-tight">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground print-muted">
                    {item.helper}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="print-grid-3 grid gap-4 md:grid-cols-3">
            <Card className="print-compact-card border-emerald-200 bg-emerald-50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm text-emerald-900">
                  Best Ranking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-emerald-950">
                  {bestRankingKeyword?.query || "No ranking data yet"}
                </p>
                <p className="mt-2 text-sm text-emerald-800">
                  {bestRankingKeyword
                    ? `Position ${formatPosition(bestRankingKeyword.position)}`
                    : "Sync GSC data to show ranking wins."}
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card border-blue-200 bg-blue-50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm text-blue-900">
                  Top Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-blue-950">
                  {topOpportunityKeyword?.query || "No opportunity keyword yet"}
                </p>
                <p className="mt-2 text-sm text-blue-800">
                  {topOpportunityKeyword
                    ? `Position ${formatPosition(
                        topOpportunityKeyword.position
                      )} with ${formatNumber(
                        topOpportunityKeyword.impressions
                      )} impressions`
                    : "Keywords in positions 4–15 will appear here."}
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card border-amber-200 bg-amber-50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm text-amber-900">
                  CTR Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-amber-950">
                  {lowCtrKeyword?.query || "No CTR issue yet"}
                </p>
                <p className="mt-2 text-sm text-amber-800">
                  {lowCtrKeyword
                    ? `${formatCtr(lowCtrKeyword.ctr)} CTR from ${formatNumber(
                        lowCtrKeyword.impressions
                      )} impressions`
                    : "CTR issues appear when impressions are available."}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="print-grid-3 grid gap-4 md:grid-cols-3">
            <Card className="print-compact-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Page 1 Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">
                  {pageOneKeywords.length}
                </p>
                <p className="text-sm text-muted-foreground print-muted">
                  Positions 1–10.
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">
                  {opportunityKeywords.length}
                </p>
                <p className="text-sm text-muted-foreground print-muted">
                  Positions 4–15.
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Low CTR Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">
                  {lowCtrKeywords.length}
                </p>
                <p className="text-sm text-muted-foreground print-muted">
                  Visibility with weak clicks.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="print-section space-y-4">
          <div>
            <h3 className="print-section-title text-2xl font-bold">
              Issue Summary
            </h3>
            <p className="text-sm text-muted-foreground print-muted">
              Latest SEO audit issues grouped by priority.
            </p>
          </div>

          <div className="print-grid-4 grid gap-4 md:grid-cols-4">
            {[
              {
                label: "Total Issues",
                value: issueCount,
                helper: "Latest findings",
                className: "border-slate-200 bg-white",
              },
              {
                label: "High Priority",
                value: highIssues,
                helper: "Fix first",
                className: "border-rose-200 bg-rose-50",
              },
              {
                label: "Medium Priority",
                value: mediumIssues,
                helper: "Review next",
                className: "border-amber-200 bg-amber-50",
              },
              {
                label: "Low Priority",
                value: lowIssues,
                helper: "Improve later",
                className: "border-slate-200 bg-slate-50",
              },
            ].map((item) => (
              <Card
                key={item.label}
                className={`print-compact-card shadow-sm ${item.className}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{item.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="print-score text-4xl font-bold">{item.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground print-muted">
                    {item.helper}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card className="print-compact-card shadow-sm">
          <CardHeader>
            <CardTitle>Recommended Action Plan</CardTitle>
          </CardHeader>

          <CardContent>
            {issueCount === 0 && topOpportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground print-muted">
                No major SEO issues or keyword opportunities were found in the
                latest imported data. Continue monitoring the website and rerun
                audits after major updates.
              </p>
            ) : (
              <div className="print-grid-2 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold">
                    1. Resolve SEO blockers
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground print-muted">
                    Fix high and medium issues first, especially metadata,
                    headings, canonical tags, and technical SEO gaps.
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold">
                    2. Improve keyword pages
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground print-muted">
                    Focus on keywords ranking between positions 4–15 because
                    they are close enough to move with targeted optimization.
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold">
                    3. Rewrite weak snippets
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground print-muted">
                    For keywords with impressions but no clicks, rewrite title
                    tags and meta descriptions to better match search intent.
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold">
                    4. Track after changes
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground print-muted">
                    Run another audit and sync Search Console after updates to
                    measure ranking and CTR movement.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="print-compact-card shadow-sm">
          <CardHeader>
            <CardTitle>Top Keyword Opportunities</CardTitle>
          </CardHeader>

          <CardContent>
            {topOpportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground print-muted">
                No keyword opportunity data is available yet. Sync Google Search
                Console keyword data first.
              </p>
            ) : (
              <div className="grid gap-3">
                {topOpportunities.map((keyword, index) => (
                  <div
                    key={keyword.id}
                    className="print-opportunity-card rounded-2xl border bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Opportunity #{index + 1}
                        </p>
                        <h4 className="mt-1 text-base font-semibold">
                          {keyword.query}
                        </h4>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 print-badge">
                          {keyword.intent}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium print-badge ${getKeywordStatusClass(
                            keyword.status
                          )}`}
                        >
                          {keyword.status}
                        </span>
                      </div>
                    </div>

                    <div className="print-opportunity-metrics mt-4 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-muted-foreground">
                          Impressions
                        </p>
                        <p className="mt-1 font-semibold">
                          {formatNumber(keyword.impressions)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-muted-foreground">Clicks</p>
                        <p className="mt-1 font-semibold">
                          {formatNumber(keyword.clicks)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-muted-foreground">CTR</p>
                        <p className="mt-1 font-semibold">
                          {formatCtr(keyword.ctr)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-muted-foreground">
                          Position
                        </p>
                        <p className="mt-1 font-semibold">
                          {formatPosition(keyword.position)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-muted-foreground print-muted">
                      {keyword.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="print-compact-card shadow-sm">
          <CardHeader>
            <CardTitle>Latest SEO Issues</CardTitle>
          </CardHeader>

          <CardContent>
            {issueList.length === 0 ? (
              <p className="text-sm text-muted-foreground print-muted">
                No issues found in the latest audit.
              </p>
            ) : (
              <div className="grid gap-3">
                {issueList.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-2xl border bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{issue.title}</h4>
                        <p className="mt-1 text-sm text-muted-foreground print-muted">
                          {issue.description || "No description available."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium capitalize print-badge ${getSeverityClass(
                            issue.severity
                          )}`}
                        >
                          {issue.severity || "medium"}
                        </span>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium capitalize text-slate-600 print-badge">
                          {issue.category || "general"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Recommended Fix
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground print-muted">
                        {issue.recommendation ||
                          "Review this issue and apply the appropriate SEO fix."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="print-compact-card shadow-sm">
          <CardHeader>
            <CardTitle>Top Keywords by Impressions</CardTitle>
          </CardHeader>

          <CardContent>
            {topKeywords.length === 0 ? (
              <p className="text-sm text-muted-foreground print-muted">
                No keyword data imported yet.
              </p>
            ) : (
              <div className="print-table-wrapper overflow-x-auto">
                <Table className="print-keyword-table min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Intent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Clicks</TableHead>
                      <TableHead className="text-center">Impr.</TableHead>
                      <TableHead className="text-center">CTR</TableHead>
                      <TableHead className="text-center">Pos.</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {topKeywords.map((keyword) => {
                      const status = getKeywordStatus(keyword);

                      return (
                        <TableRow key={keyword.id}>
                          <TableCell className="font-medium">
                            {keyword.query}
                          </TableCell>

                          <TableCell>{getKeywordIntent(keyword.query)}</TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex min-w-[104px] justify-center rounded-full border px-3 py-1 text-xs font-medium print-badge ${getKeywordStatusClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </TableCell>

                          <TableCell className="text-center">
                            {formatNumber(keyword.clicks)}
                          </TableCell>

                          <TableCell className="text-center">
                            {formatNumber(keyword.impressions)}
                          </TableCell>

                          <TableCell className="text-center">
                            {formatCtr(keyword.ctr)}
                          </TableCell>

                          <TableCell className="text-center">
                            {formatPosition(keyword.position)}
                          </TableCell>

                          <TableCell>
                            {formatShortDate(keyword.start_date)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <footer className="print-footer hidden print:block">
          <p className="text-xs text-muted-foreground print-muted">
            Generated by RankCraft Audit for {project.domain}. This report is
            based on the latest available audit, PageSpeed data, and Google
            Search Console keyword sync at the time of generation.
          </p>
        </footer>
      </div>
    </div>
  );
}