import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

type ProjectPageProps = {
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

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "--";
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

function normalizeDomainForDisplay(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

function getScoreLabel(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "No scan";
  }

  if (score >= 90) {
    return "Strong";
  }

  if (score >= 70) {
    return "Needs work";
  }

  return "Attention";
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

  return "border-red-200 bg-red-50 text-red-700";
}

function getSeverityBadgeClass(severity: string | null | undefined) {
  if (severity === "high") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (severity === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (severity === "low") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
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

function getProjectHealthSummary(
  seoScore: number | null | undefined,
  issueCount: number,
  keywordCount: number
) {
  if (seoScore === null || seoScore === undefined) {
    return "Run the first audit to generate SEO, performance, and issue data for this project.";
  }

  if (seoScore >= 90 && issueCount <= 2 && keywordCount > 0) {
    return "This project has a strong technical foundation with live keyword visibility data available.";
  }

  if (seoScore >= 70) {
    return "This project has a solid foundation, but there are still SEO improvements and keyword opportunities to review.";
  }

  return "This project needs technical SEO attention before scaling content, rankings, or client reporting.";
}

export default async function ProjectPage({ params }: ProjectPageProps) {
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

  const issueList = issues || [];
  const keywordList = keywords || [];

  const seoScore = latestPageSpeedReport?.seo_score ?? latestAudit?.score;
  const performanceScore = latestPageSpeedReport?.performance_score;
  const accessibilityScore = latestPageSpeedReport?.accessibility_score;
  const bestPracticesScore = latestPageSpeedReport?.best_practices_score;

  const issueCount = issueList.length;
  const keywordCount = keywordList.length;

  const highIssues = issueList.filter(
    (issue: AuditIssue) => issue.severity === "high"
  ).length;

  const mediumIssues = issueList.filter(
    (issue: AuditIssue) => issue.severity === "medium"
  ).length;

  const lowIssues = issueList.filter(
    (issue: AuditIssue) => issue.severity === "low"
  ).length;

  const totalClicks = keywordList.reduce((sum: number, keyword: Keyword) => {
    return sum + (keyword.clicks || 0);
  }, 0);

  const totalImpressions = keywordList.reduce(
    (sum: number, keyword: Keyword) => {
      return sum + (keyword.impressions || 0);
    },
    0
  );

  const averageCtr =
    totalImpressions > 0 ? totalClicks / totalImpressions : null;

  const averagePosition =
    keywordList.length > 0
      ? keywordList.reduce((sum: number, keyword: Keyword) => {
          return sum + Number(keyword.position || 0);
        }, 0) / keywordList.length
      : null;

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

  const topIssues = issueList.slice(0, 5);
  const topKeywords = keywordList.slice(0, 6);

  const latestKeywordDate = keywordList[0]?.date
    ? formatShortDate(keywordList[0].date)
    : "No keyword data yet";

  const latestScanDate =
    latestAudit?.created_at || latestPageSpeedReport?.created_at || null;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/80">
              Project Overview
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                {project.name}
              </h1>

              <p className="text-base text-slate-300">
                {normalizeDomainForDisplay(project.domain)}
              </p>

              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                {getProjectHealthSummary(
                  seoScore,
                  issueCount,
                  keywordCount
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="rounded-xl bg-white text-slate-950 hover:bg-slate-100"
              >
                <Link href={`/dashboard/projects/${project.id}/audit`}>
                  Run Audit
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={`/dashboard/projects/${project.id}/keywords`}>
                  View Keywords
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={`/dashboard/projects/${project.id}/reports`}>
                  Open Report
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-slate-300">SEO Score</p>

            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="text-6xl font-bold">{seoScore ?? "--"}</p>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getScoreBadgeClass(
                  seoScore
                )}`}
              >
                {getScoreLabel(seoScore)}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-slate-400">Issues</p>
                <p className="mt-1 text-xl font-semibold">{issueCount}</p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-slate-400">Keywords</p>
                <p className="mt-1 text-xl font-semibold">{keywordCount}</p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-slate-400">Clicks</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatNumber(totalClicks)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              SEO Score
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {seoScore ?? "--"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {getScoreLabel(seoScore)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Performance
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {performanceScore ?? "--"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {getScoreLabel(performanceScore)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Issues
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">{issueCount}</p>
            <p className="mt-1 text-sm text-slate-500">
              {highIssues} high · {mediumIssues} medium · {lowIssues} low
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Keywords
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {keywordCount}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              GSC imported keywords.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Impressions
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {formatNumber(totalImpressions)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Search visibility.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Average CTR
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {formatCtr(averageCtr)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Click-through rate.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Avg. Position
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {formatPosition(averagePosition)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Lower is better.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Page 1 Keywords
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {pageOneKeywords.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Positions 1–10.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Project Snapshot</CardTitle>
            <p className="text-sm text-slate-500">
              Latest scan and keyword data status.
            </p>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Domain</span>
                <span className="text-sm font-medium text-slate-950">
                  {normalizeDomainForDisplay(project.domain)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Latest Audit</span>
                <span className="text-sm font-medium text-slate-950">
                  {formatDate(latestScanDate)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Keyword Data</span>
                <span className="text-sm font-medium text-slate-950">
                  {latestKeywordDate}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Accessibility</span>
                <span className="text-sm font-medium text-slate-950">
                  {accessibilityScore ?? "--"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Best Practices</span>
                <span className="text-sm font-medium text-slate-950">
                  {bestPracticesScore ?? "--"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Recommended Next Actions</CardTitle>
            <p className="text-sm text-slate-500">
              Suggested actions based on latest project data.
            </p>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3">
              {!latestAudit && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-950">
                    Run the first SEO audit
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Generate the first score, issue list, and report data for
                    this project.
                  </p>
                </div>
              )}

              {issueCount > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-950">
                    Fix detected SEO issues
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Review title, meta, heading, crawl, and on-page issues from
                    the latest audit.
                  </p>
                </div>
              )}

              {nearPageOneKeywords.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-950">
                    Improve near page 1 keywords
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Strengthen internal links and content relevance for keywords
                    ranking in positions 11–20.
                  </p>
                </div>
              )}

              {lowCtrKeywords.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-950">
                    Improve low CTR keywords
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Update title tags and meta descriptions for keywords with
                    impressions but weak clicks.
                  </p>
                </div>
              )}

              {latestAudit && issueCount === 0 && keywordCount === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-950">
                    Import keyword data
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Connect and fetch Google Search Console data to unlock
                    keyword visibility insights.
                  </p>
                </div>
              )}

              {latestAudit &&
                issueCount === 0 &&
                keywordCount > 0 &&
                lowCtrKeywords.length === 0 &&
                nearPageOneKeywords.length === 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="font-medium text-emerald-900">
                      Project is in good shape
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Continue monitoring audits and keyword data after major
                      website updates.
                    </p>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Latest SEO Issues</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Top issues from the latest audit.
                </p>
              </div>

              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href={`/dashboard/projects/${project.id}/history`}>
                  View History
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {topIssues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6">
                <p className="text-sm text-slate-500">
                  No SEO issues found yet. Run an audit to detect technical and
                  on-page issues.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Issue</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {topIssues.map((issue: AuditIssue) => (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-950">
                              {issue.title}
                            </p>
                            <p className="line-clamp-2 text-sm text-slate-500">
                              {issue.description || "No description available."}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${getSeverityBadgeClass(
                              issue.severity
                            )}`}
                          >
                            {issue.severity || "medium"}
                          </span>
                        </TableCell>

                        <TableCell className="capitalize text-slate-500">
                          {issue.category || "general"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Top Keywords</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Keywords with highest impressions.
                </p>
              </div>

              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href={`/dashboard/projects/${project.id}/keywords`}>
                  View Keywords
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {topKeywords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6">
                <p className="text-sm text-slate-500">
                  No keyword data yet. Fetch Google Search Console data from the
                  Keywords page.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Keyword</TableHead>
                      <TableHead>Impr.</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Pos.</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {topKeywords.map((keyword: Keyword) => (
                      <TableRow key={keyword.id}>
                        <TableCell className="font-medium text-slate-950">
                          {keyword.query}
                        </TableCell>

                        <TableCell>
                          {formatNumber(keyword.impressions)}
                        </TableCell>

                        <TableCell>{formatNumber(keyword.clicks)}</TableCell>

                        <TableCell>{formatPosition(keyword.position)}</TableCell>

                        <TableCell>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {getKeywordStatus(keyword)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Project Tools</CardTitle>
          <p className="text-sm text-slate-500">
            Continue working on this project.
          </p>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button asChild className="h-auto justify-start rounded-2xl p-4">
              <Link href={`/dashboard/projects/${project.id}/audit`}>
                <div className="text-left">
                  <p className="font-medium">Run Audit</p>
                  <p className="text-xs opacity-80">
                    Scan SEO and performance
                  </p>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto justify-start rounded-2xl p-4"
            >
              <Link href={`/dashboard/projects/${project.id}/keywords`}>
                <div className="text-left">
                  <p className="font-medium">Keywords</p>
                  <p className="text-xs text-slate-500">
                    Search Console data
                  </p>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto justify-start rounded-2xl p-4"
            >
              <Link href={`/dashboard/projects/${project.id}/history`}>
                <div className="text-left">
                  <p className="font-medium">History</p>
                  <p className="text-xs text-slate-500">
                    Previous audit runs
                  </p>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto justify-start rounded-2xl p-4"
            >
              <Link href={`/dashboard/projects/${project.id}/reports`}>
                <div className="text-left">
                  <p className="font-medium">Report</p>
                  <p className="text-xs text-slate-500">
                    Client-ready export
                  </p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}