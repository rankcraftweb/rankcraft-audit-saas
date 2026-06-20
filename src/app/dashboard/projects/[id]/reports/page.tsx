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

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "No date available";
  }

  return new Date(date).toLocaleString();
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

  const reportDate = new Date().toLocaleString();
  const latestScanDate =
    latestAudit?.created_at || latestPageSpeedReport?.created_at;

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
              font-size: 10px !important;
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
              padding: 14px !important;
              margin-bottom: 10px !important;
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
              padding: 10px !important;
            }

            .print-grid-4 {
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 8px !important;
            }

            .print-grid-2 {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 8px !important;
            }

            .print-section {
              margin-top: 10px !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
            }

            .print-section-title {
              font-size: 14px !important;
              margin-bottom: 4px !important;
            }

            .print-muted {
              color: #444 !important;
            }

            h1 {
              font-size: 24px !important;
              line-height: 1.1 !important;
            }

            h2 {
              font-size: 20px !important;
              line-height: 1.1 !important;
            }

            h3 {
              font-size: 14px !important;
              line-height: 1.1 !important;
            }

            p {
              line-height: 1.35 !important;
            }

            .print-score {
              font-size: 24px !important;
              line-height: 1 !important;
            }

            table {
              width: 100% !important;
              font-size: 9px !important;
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
              padding: 5px !important;
              vertical-align: top !important;
              word-break: break-word !important;
              white-space: normal !important;
            }

            a {
              color: black !important;
              text-decoration: none !important;
            }

            .print-footer {
              margin-top: 10px !important;
              padding-top: 8px !important;
              border-top: 1px solid #ddd !important;
              font-size: 9px !important;
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
                    Latest Scan
                  </span>
                  <span className="font-medium">
                    {formatDate(latestScanDate)}
                  </span>
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
                  Latest scan for{" "}
                  <span className="font-medium text-foreground">
                    {project.domain}
                  </span>{" "}
                  shows an SEO score of{" "}
                  <span className="font-medium text-foreground">
                    {seoScore ?? "--"}
                  </span>{" "}
                  and{" "}
                  <span className="font-medium text-foreground">
                    {issueCount}
                  </span>{" "}
                  detected issue(s). Latest scan date:{" "}
                  <span className="font-medium text-foreground">
                    {formatDate(latestScanDate)}
                  </span>
                  .
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
            {issueCount === 0 ? (
              <p className="text-sm text-muted-foreground print-muted">
                No SEO issues were found in the latest scan. Continue monitoring
                the website and rerun audits after major content or design
                updates.
              </p>
            ) : (
              <div className="print-grid-2 grid gap-3 md:grid-cols-2">
                {highIssues > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="font-medium">1. Fix high-priority issues</p>
                    <p className="mt-1 text-sm text-muted-foreground print-muted">
                      Resolve missing key SEO elements first, such as missing
                      title tags, H1 headings, or crawl-related issues.
                    </p>
                  </div>
                )}

                {mediumIssues > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="font-medium">
                      2. Improve metadata and structure
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground print-muted">
                      Review page titles, descriptions, canonical tags, and
                      heading structure for better search clarity.
                    </p>
                  </div>
                )}

                {lowIssues > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="font-medium">3. Clean up minor SEO gaps</p>
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

        <footer className="print-footer hidden print:block">
          <p className="text-xs text-muted-foreground print-muted">
            Generated by RankCraft Audit for {project.domain}. This report is
            based on the latest available audit data at the time of generation.
          </p>
        </footer>
      </div>
    </div>
  );
}