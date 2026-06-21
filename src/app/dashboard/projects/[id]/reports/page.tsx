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

type Keyword = {
  id: string;
  query: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
  date: string | null;
};

function getScoreStatus(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "Not scanned yet";
  }

  if (score >= 90) {
    return "Strong";
  }

  if (score >= 70) {
    return "Needs improvement";
  }

  return "Needs attention";
}

function getOverallSummary(
  seoScore: number | null | undefined,
  issueCount: number
) {
  if (seoScore === null || seoScore === undefined) {
    return "No completed audit is available yet.";
  }

  if (seoScore >= 90 && issueCount <= 2) {
    return "The website is in strong condition overall, with only a small number of SEO items to review.";
  }

  if (seoScore >= 70) {
    return "The website has a solid SEO foundation, but several improvements should be completed to strengthen performance and search visibility.";
  }

  return "The website needs attention. Key technical and on-page SEO issues should be resolved before scaling content or campaigns.";
}

function getKeywordIntent(query: string) {
  const lowerQuery = query.toLowerCase();

  if (
    lowerQuery.includes("near me") ||
    lowerQuery.includes("services") ||
    lowerQuery.includes("consultant") ||
    lowerQuery.includes("designer") ||
    lowerQuery.includes("developer")
  ) {
    return "Commercial";
  }

  if (
    lowerQuery.includes("how") ||
    lowerQuery.includes("what") ||
    lowerQuery.includes("guide") ||
    lowerQuery.includes("tips")
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

function getKeywordStatus(keyword: Keyword) {
  const impressions = keyword.impressions || 0;
  const clicks = keyword.clicks || 0;
  const ctr = keyword.ctr || 0;
  const position = Number(keyword.position || 0);

  if (position > 0 && position <= 3) {
    return "Top 3";
  }

  if (position > 3 && position <= 10) {
    return "Page 1";
  }

  if (position > 10 && position <= 20) {
    return "Near Page 1";
  }

  if (impressions >= 5 && clicks === 0) {
    return "Low CTR";
  }

  if (ctr < 0.02 && impressions >= 5) {
    return "CTR Gap";
  }

  return "Monitor";
}

function getOpportunityReason(keyword: Keyword) {
  const impressions = keyword.impressions || 0;
  const clicks = keyword.clicks || 0;
  const ctr = keyword.ctr || 0;
  const position = Number(keyword.position || 0);

  if (position > 3 && position <= 10) {
    return "Already ranking on page 1. Improve title, meta description, and content match to win more clicks.";
  }

  if (position > 10 && position <= 20) {
    return "Close to page 1. Add supporting content, internal links, and improve page relevance.";
  }

  if (impressions >= 5 && clicks === 0) {
    return "Getting search visibility but no clicks. Improve title and meta description to increase CTR.";
  }

  if (ctr < 0.02 && impressions >= 5) {
    return "Low CTR compared to impressions. Improve SERP copy and strengthen keyword intent match.";
  }

  return "Keep monitoring this keyword as more Search Console data comes in.";
}

function getOpportunityScore(keyword: Keyword) {
  const impressions = keyword.impressions || 0;
  const clicks = keyword.clicks || 0;
  const ctr = keyword.ctr || 0;
  const position = Number(keyword.position || 100);

  let score = 0;

  if (position > 3 && position <= 10) {
    score += 40;
  }

  if (position > 10 && position <= 20) {
    score += 35;
  }

  if (impressions >= 10) {
    score += 25;
  } else if (impressions >= 5) {
    score += 15;
  } else if (impressions > 0) {
    score += 5;
  }

  if (clicks === 0 && impressions > 0) {
    score += 20;
  }

  if (ctr < 0.02 && impressions >= 5) {
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

function formatCtr(ctr: number | null | undefined) {
  if (ctr === null || ctr === undefined) {
    return "--";
  }

  return `${(Number(ctr) * 100).toFixed(2)}%`;
}

function formatPosition(position: number | null | undefined) {
  if (position === null || position === undefined) {
    return "--";
  }

  return Number(position).toFixed(1);
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
    .single();

  const { data: latestAudit } = await supabase
    .from("audits")
    .select("id, score, status, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: issues } = latestAudit?.id
    ? await supabase
        .from("audit_issues")
        .select(
          "id, title, description, severity, category, recommendation, created_at"
        )
        .eq("audit_id", latestAudit.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: keywords } = await supabase
    .from("keywords")
    .select("id, query, clicks, impressions, ctr, position, date")
    .eq("project_id", project.id)
    .order("impressions", { ascending: false });

  const keywordList = keywords || [];

  const issueCount = issues?.length || 0;

  const highIssues =
    issues?.filter((issue: AuditIssue) => issue.severity === "high").length ||
    0;

  const mediumIssues =
    issues?.filter((issue: AuditIssue) => issue.severity === "medium").length ||
    0;

  const lowIssues =
    issues?.filter((issue: AuditIssue) => issue.severity === "low").length || 0;

  const seoScore = latestPageSpeedReport?.seo_score ?? latestAudit?.score;
  const performanceScore = latestPageSpeedReport?.performance_score;
  const accessibilityScore = latestPageSpeedReport?.accessibility_score;
  const bestPracticesScore = latestPageSpeedReport?.best_practices_score;

  const totalClicks = keywordList.reduce((sum: number, keyword: Keyword) => {
    return sum + (keyword.clicks || 0);
  }, 0);

  const totalImpressions = keywordList.reduce(
    (sum: number, keyword: Keyword) => {
      return sum + (keyword.impressions || 0);
    },
    0
  );

  const averagePosition =
    keywordList.length > 0
      ? keywordList.reduce((sum: number, keyword: Keyword) => {
          return sum + Number(keyword.position || 0);
        }, 0) / keywordList.length
      : null;

  const averageCtr =
    totalImpressions > 0 ? totalClicks / totalImpressions : null;

  const pageOneKeywords = keywordList.filter((keyword: Keyword) => {
    const position = Number(keyword.position || 0);
    return position > 0 && position <= 10;
  });

  const nearPageOneKeywords = keywordList.filter((keyword: Keyword) => {
    const position = Number(keyword.position || 0);
    return position > 10 && position <= 20;
  });

  const lowCtrKeywords = keywordList.filter((keyword: Keyword) => {
    const impressions = keyword.impressions || 0;
    const clicks = keyword.clicks || 0;
    const ctr = keyword.ctr || 0;

    return impressions >= 5 && (clicks === 0 || ctr < 0.02);
  });

  const topOpportunities = [...keywordList]
    .map((keyword: Keyword) => ({
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
    .sort((a: Keyword, b: Keyword) => {
      return (b.impressions || 0) - (a.impressions || 0);
    })
    .slice(0, 10);

  const reportDate = new Date().toLocaleString();
  const latestScanDate =
    latestAudit?.created_at || latestPageSpeedReport?.created_at;

  const latestKeywordDate = keywordList[0]?.date
    ? new Date(keywordList[0].date).toLocaleDateString()
    : "No keyword data yet";

  return (
    <div className="space-y-8">
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 8mm;
            }

            html,
            body {
              background: white !important;
              color: black !important;
              font-size: 9px !important;
            }

            aside,
            .no-print {
              display: none !important;
            }

            main {
              margin-left: 0 !important;
              padding: 0 !important;
            }

            .print-report {
              padding: 0 !important;
              max-width: 100% !important;
              display: block !important;
            }

            .print-hero {
              padding: 12px !important;
              margin-bottom: 8px !important;
              border: 1px solid #ddd !important;
              border-radius: 10px !important;
            }

            .print-compact-card {
              padding: 0 !important;
              box-shadow: none !important;
              border: 1px solid #ddd !important;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .print-compact-card > div {
              padding: 8px !important;
            }

            .print-grid-4 {
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 6px !important;
            }

            .print-grid-3 {
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 6px !important;
            }

            .print-grid-2 {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 6px !important;
            }

            .print-section {
              margin-top: 8px !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
            }

            .print-section-title {
              font-size: 13px !important;
              margin-bottom: 3px !important;
            }

            .print-muted {
              color: #444 !important;
            }

            h1 {
              font-size: 22px !important;
              line-height: 1.1 !important;
            }

            h2 {
              font-size: 18px !important;
              line-height: 1.1 !important;
            }

            h3 {
              font-size: 13px !important;
              line-height: 1.1 !important;
            }

            p {
              line-height: 1.3 !important;
            }

            .print-score {
              font-size: 22px !important;
              line-height: 1 !important;
            }

            table {
              width: 100% !important;
              font-size: 8px !important;
              page-break-inside: auto;
              table-layout: fixed !important;
            }

            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }

            th,
            td {
              color: black !important;
              padding: 4px !important;
              vertical-align: top !important;
              word-break: break-word !important;
              white-space: normal !important;
            }

            a {
              color: black !important;
              text-decoration: none !important;
            }

            .print-footer {
              margin-top: 8px !important;
              padding-top: 6px !important;
              border-top: 1px solid #ddd !important;
              font-size: 8px !important;
            }
          }
        `}
      </style>

      <div className="print-report space-y-8">
        <div className="no-print flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Client SEO Report</p>
            <h2 className="text-3xl font-bold">{project.name}</h2>
            <p className="text-muted-foreground">{project.domain}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <PrintReportButton />

            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${project.id}`}>
                Overview
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${project.id}/audit`}>
                Run New Audit
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${project.id}/history`}>
                History
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${project.id}/keywords`}>
                Keywords
              </Link>
            </Button>
          </div>
        </div>

        <section className="print-hero rounded-2xl border bg-muted/20 p-8">
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground print-muted">
                  RankCraft Audit
                </p>
                <h1 className="text-4xl font-bold tracking-tight">
                  SEO Audit Report
                </h1>
              </div>

              <div>
                <p className="text-lg font-medium">{project.name}</p>
                <p className="text-muted-foreground print-muted">
                  {project.domain}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-background p-4">
              <div className="space-y-2 text-sm">
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
        </section>

        <Card className="print-compact-card">
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {!latestAudit && !latestPageSpeedReport ? (
              <p className="text-sm text-muted-foreground print-muted">
                No audit data is available yet. Run a full SEO audit to generate
                a client-ready report.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground print-muted">
                  {getOverallSummary(seoScore, issueCount)}
                </p>

                <p className="text-sm text-muted-foreground print-muted">
                  Latest audit shows an SEO score of{" "}
                  <span className="font-medium text-foreground">
                    {seoScore ?? "--"}
                  </span>{" "}
                  and{" "}
                  <span className="font-medium text-foreground">
                    {issueCount}
                  </span>{" "}
                  detected issue(s). Search Console currently shows{" "}
                  <span className="font-medium text-foreground">
                    {totalImpressions}
                  </span>{" "}
                  impressions and{" "}
                  <span className="font-medium text-foreground">
                    {totalClicks}
                  </span>{" "}
                  clicks from imported keyword data.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <section className="print-section space-y-4">
          <div>
            <h3 className="print-section-title text-2xl font-bold">
              Score Overview
            </h3>
            <p className="text-sm text-muted-foreground print-muted">
              Latest technical and performance scan.
            </p>
          </div>

          <div className="print-grid-4 grid gap-4 md:grid-cols-4">
            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">SEO Score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">
                  {seoScore ?? "--"}
                </p>
                <p className="text-sm text-muted-foreground print-muted">
                  {getScoreStatus(seoScore)}
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">
                  {performanceScore ?? "--"}
                </p>
                <p className="text-sm text-muted-foreground print-muted">
                  {getScoreStatus(performanceScore)}
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">Accessibility</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">
                  {accessibilityScore ?? "--"}
                </p>
                <p className="text-sm text-muted-foreground print-muted">
                  {getScoreStatus(accessibilityScore)}
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">Best Practices</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">
                  {bestPracticesScore ?? "--"}
                </p>
                <p className="text-sm text-muted-foreground print-muted">
                  {getScoreStatus(bestPracticesScore)}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="print-section space-y-4">
          <div>
            <h3 className="print-section-title text-2xl font-bold">
              Keyword Visibility
            </h3>
            <p className="text-sm text-muted-foreground print-muted">
              Imported from Google Search Console.
            </p>
          </div>

          <div className="print-grid-4 grid gap-4 md:grid-cols-4">
            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">Clicks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">{totalClicks}</p>
                <p className="text-sm text-muted-foreground print-muted">
                  Imported range.
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">Impressions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">
                  {totalImpressions}
                </p>
                <p className="text-sm text-muted-foreground print-muted">
                  Search visibility.
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">Average CTR</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">
                  {formatCtr(averageCtr)}
                </p>
                <p className="text-sm text-muted-foreground print-muted">
                  Click-through rate.
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">Avg. Position</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">
                  {formatPosition(averagePosition)}
                </p>
                <p className="text-sm text-muted-foreground print-muted">
                  Lower is better.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="print-grid-3 grid gap-4 md:grid-cols-3">
            <Card className="print-compact-card">
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

            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">Near Page 1</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">
                  {nearPageOneKeywords.length}
                </p>
                <p className="text-sm text-muted-foreground print-muted">
                  Positions 11–20.
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card">
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
              Issues grouped by priority.
            </p>
          </div>

          <div className="print-grid-4 grid gap-4 md:grid-cols-4">
            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">Total Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">{issueCount}</p>
                <p className="text-sm text-muted-foreground print-muted">
                  Latest findings.
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">High Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">{highIssues}</p>
                <p className="text-sm text-muted-foreground print-muted">
                  Fix first.
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">Medium Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">
                  {mediumIssues}
                </p>
                <p className="text-sm text-muted-foreground print-muted">
                  Review next.
                </p>
              </CardContent>
            </Card>

            <Card className="print-compact-card">
              <CardHeader>
                <CardTitle className="text-sm">Low Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="print-score text-4xl font-bold">{lowIssues}</p>
                <p className="text-sm text-muted-foreground print-muted">
                  Improve later.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card className="print-compact-card">
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
              <div className="print-grid-2 grid gap-3 md:grid-cols-2">
                {mediumIssues > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="font-medium">
                      1. Improve metadata and structure
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground print-muted">
                      Review page titles, descriptions, canonical tags, and
                      heading structure for better search clarity.
                    </p>
                  </div>
                )}

                {topOpportunities.length > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="font-medium">
                      2. Prioritize keyword opportunities
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground print-muted">
                      Improve pages ranking near page 1 and update titles/meta
                      descriptions for keywords with impressions but weak CTR.
                    </p>
                  </div>
                )}

                {highIssues > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="font-medium">3. Fix high-priority issues</p>
                    <p className="mt-1 text-sm text-muted-foreground print-muted">
                      Resolve missing key SEO elements first, such as title
                      tags, H1 headings, or crawl-related issues.
                    </p>
                  </div>
                )}

                {lowIssues > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="font-medium">4. Clean up minor SEO gaps</p>
                    <p className="mt-1 text-sm text-muted-foreground print-muted">
                      Address image alt text, minor length issues, and
                      lower-priority improvements.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="print-compact-card">
          <CardHeader>
            <CardTitle>Top Keyword Opportunities</CardTitle>
          </CardHeader>

          <CardContent>
            {topOpportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground print-muted">
                No keyword opportunity data is available yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Impr.</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Pos.</TableHead>
                    <TableHead>Recommended Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {topOpportunities.map((keyword) => (
                    <TableRow key={keyword.id}>
                      <TableCell className="font-medium">
                        {keyword.query}
                      </TableCell>

                      <TableCell>{keyword.status}</TableCell>

                      <TableCell>{keyword.impressions ?? 0}</TableCell>

                      <TableCell>{keyword.clicks ?? 0}</TableCell>

                      <TableCell>{formatPosition(keyword.position)}</TableCell>

                      <TableCell className="text-sm text-muted-foreground print-muted">
                        {keyword.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="print-compact-card">
          <CardHeader>
            <CardTitle>Latest SEO Issues</CardTitle>
          </CardHeader>

          <CardContent>
            {!issues || issues.length === 0 ? (
              <p className="text-sm text-muted-foreground print-muted">
                No issues found in the latest audit.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Recommended Fix</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {issues.map((issue: AuditIssue) => (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{issue.title}</p>
                          <p className="text-sm text-muted-foreground print-muted">
                            {issue.description || "No description available."}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="capitalize">
                        {issue.severity || "medium"}
                      </TableCell>

                      <TableCell className="capitalize">
                        {issue.category || "general"}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground print-muted">
                        {issue.recommendation ||
                          "Review this issue and apply the appropriate SEO fix."}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="print-compact-card">
          <CardHeader>
            <CardTitle>Top Keywords by Impressions</CardTitle>
          </CardHeader>

          <CardContent>
            {topKeywords.length === 0 ? (
              <p className="text-sm text-muted-foreground print-muted">
                No keyword data imported yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Impr.</TableHead>
                    <TableHead>CTR</TableHead>
                    <TableHead>Pos.</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {topKeywords.map((keyword: Keyword) => (
                    <TableRow key={keyword.id}>
                      <TableCell className="font-medium">
                        {keyword.query}
                      </TableCell>

                      <TableCell>{getKeywordIntent(keyword.query)}</TableCell>

                      <TableCell>{keyword.clicks ?? 0}</TableCell>

                      <TableCell>{keyword.impressions ?? 0}</TableCell>

                      <TableCell>{formatCtr(keyword.ctr)}</TableCell>

                      <TableCell>{formatPosition(keyword.position)}</TableCell>

                      <TableCell>{formatShortDate(keyword.date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <footer className="print-footer hidden print:block">
          <p className="text-xs text-muted-foreground print-muted">
            Generated by RankCraft Audit for {project.domain}. This report is
            based on the latest available audit and Google Search Console data
            at the time of generation.
          </p>
        </footer>
      </div>
    </div>
  );
}