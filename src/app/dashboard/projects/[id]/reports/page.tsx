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

  return (
    <div className="space-y-8">
      <style>
        {`
          @media print {
            body {
              background: white !important;
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
              padding: 24px !important;
            }

            .print-card {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            table {
              page-break-inside: auto;
            }

            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        `}
      </style>

      <div className="print-report space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Client SEO Report</p>
            <h2 className="text-3xl font-bold">{project.name}</h2>
            <p className="text-muted-foreground">{project.domain}</p>
          </div>

          <div className="no-print flex flex-wrap gap-3">
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

        <Card className="print-card">
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {!latestAudit && !latestPageSpeedReport ? (
              <p className="text-sm text-muted-foreground">
                No audit data is available yet. Run a full SEO audit to generate
                a client-ready report.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  This report summarizes the latest SEO audit for{" "}
                  <span className="font-medium text-foreground">
                    {project.domain}
                  </span>
                  . The current SEO score is{" "}
                  <span className="font-medium text-foreground">
                    {seoScore ?? "--"}
                  </span>
                  , with{" "}
                  <span className="font-medium text-foreground">
                    {issueCount}
                  </span>{" "}
                  detected issue(s) from the latest scan.
                </p>

                <p className="text-sm text-muted-foreground">
                  Report generated from latest scan:{" "}
                  <span className="font-medium text-foreground">
                    {formatDate(latestAudit?.created_at)}
                  </span>
                  .
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="print-card">
            <CardHeader>
              <CardTitle className="text-sm">SEO Score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{seoScore ?? "--"}</p>
              <p className="text-sm text-muted-foreground">
                {getScoreStatus(seoScore)}
              </p>
            </CardContent>
          </Card>

          <Card className="print-card">
            <CardHeader>
              <CardTitle className="text-sm">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {performanceScore ?? "--"}
              </p>
              <p className="text-sm text-muted-foreground">
                {getScoreStatus(performanceScore)}
              </p>
            </CardContent>
          </Card>

          <Card className="print-card">
            <CardHeader>
              <CardTitle className="text-sm">Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {accessibilityScore ?? "--"}
              </p>
              <p className="text-sm text-muted-foreground">
                {getScoreStatus(accessibilityScore)}
              </p>
            </CardContent>
          </Card>

          <Card className="print-card">
            <CardHeader>
              <CardTitle className="text-sm">Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {bestPracticesScore ?? "--"}
              </p>
              <p className="text-sm text-muted-foreground">
                {getScoreStatus(bestPracticesScore)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="print-card">
            <CardHeader>
              <CardTitle className="text-sm">Total Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{issueCount}</p>
              <p className="text-sm text-muted-foreground">
                Latest audit findings.
              </p>
            </CardContent>
          </Card>

          <Card className="print-card">
            <CardHeader>
              <CardTitle className="text-sm">High Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{highIssues}</p>
              <p className="text-sm text-muted-foreground">
                Fix these first.
              </p>
            </CardContent>
          </Card>

          <Card className="print-card">
            <CardHeader>
              <CardTitle className="text-sm">Medium Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{mediumIssues}</p>
              <p className="text-sm text-muted-foreground">
                Review after high issues.
              </p>
            </CardContent>
          </Card>

          <Card className="print-card">
            <CardHeader>
              <CardTitle className="text-sm">Low Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{lowIssues}</p>
              <p className="text-sm text-muted-foreground">
                Improve when possible.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="print-card">
          <CardHeader>
            <CardTitle>Recommended Action Plan</CardTitle>
          </CardHeader>

          <CardContent>
            {issueCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                No SEO issues were found in the latest scan. Continue monitoring
                the website and rerun audits after major content or design
                updates.
              </p>
            ) : (
              <div className="space-y-4">
                {highIssues > 0 && (
                  <div className="rounded-lg border p-4">
                    <p className="font-medium">1. Fix high-priority issues</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Resolve missing key SEO elements first, such as missing
                      title tags, missing H1 headings, or serious crawl-related
                      issues.
                    </p>
                  </div>
                )}

                {mediumIssues > 0 && (
                  <div className="rounded-lg border p-4">
                    <p className="font-medium">
                      2. Improve metadata and structure
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Review page titles, descriptions, canonical tags, and
                      heading structure to improve search visibility and
                      clarity.
                    </p>
                  </div>
                )}

                {lowIssues > 0 && (
                  <div className="rounded-lg border p-4">
                    <p className="font-medium">3. Clean up minor SEO gaps</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Address image alt text, minor length issues, and other
                      lower-priority improvements after core fixes are complete.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="print-card">
          <CardHeader>
            <CardTitle>Latest SEO Issues</CardTitle>
          </CardHeader>

          <CardContent>
            {!issues || issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">
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
                          <p className="text-sm text-muted-foreground">
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

                      <TableCell className="max-w-md text-sm text-muted-foreground">
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

        <div className="hidden print:block">
          <p className="text-xs text-muted-foreground">
            Generated by RankCraft Audit.
          </p>
        </div>
      </div>
    </div>
  );
}