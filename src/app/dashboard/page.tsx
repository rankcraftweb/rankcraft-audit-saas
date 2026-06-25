import Link from "next/link";
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

type Project = {
  id: string;
  name: string;
  domain: string;
  created_at: string;
};

type PageSpeedReport = {
  project_id: string;
  seo_score: number | null;
  performance_score: number | null;
  created_at: string;
};

type Audit = {
  id: string;
  project_id: string;
  score: number | null;
  status: string | null;
  created_at: string;
};

type AuditIssue = {
  audit_id: string;
};

type Keyword = {
  project_id: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
};

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return Math.round(value).toString();
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "--";
  }

  return new Date(date).toLocaleDateString();
}

function getScoreLabel(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "No audit yet";
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
    return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
  }

  if (score >= 90) {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  if (score >= 70) {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function normalizeDomainForDisplay(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, domain, created_at")
    .order("created_at", { ascending: false });

  if (projectsError) {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-950">Dashboard</h2>
        <p className="text-sm text-red-600">{projectsError.message}</p>
      </div>
    );
  }

  const projectList = projects || [];
  const projectIds = projectList.map((project: Project) => project.id);

  const { data: pageSpeedReports } =
    projectIds.length > 0
      ? await supabase
          .from("pagespeed_reports")
          .select("project_id, seo_score, performance_score, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { data: audits } =
    projectIds.length > 0
      ? await supabase
          .from("audits")
          .select("id, project_id, score, status, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const auditIds = audits?.map((audit: Audit) => audit.id) || [];

  const { data: auditIssues } =
    auditIds.length > 0
      ? await supabase
          .from("audit_issues")
          .select("audit_id")
          .in("audit_id", auditIds)
      : { data: [] };

  const { data: keywords } =
    projectIds.length > 0
      ? await supabase
          .from("keywords")
          .select("project_id, clicks, impressions, ctr, position")
          .in("project_id", projectIds)
      : { data: [] };

  const latestReportByProject = new Map<string, PageSpeedReport>();

  pageSpeedReports?.forEach((report: PageSpeedReport) => {
    if (!latestReportByProject.has(report.project_id)) {
      latestReportByProject.set(report.project_id, report);
    }
  });

  const latestAuditByProject = new Map<string, Audit>();

  audits?.forEach((audit: Audit) => {
    if (!latestAuditByProject.has(audit.project_id)) {
      latestAuditByProject.set(audit.project_id, audit);
    }
  });

  const issueCountByAudit = new Map<string, number>();

  auditIssues?.forEach((issue: AuditIssue) => {
    issueCountByAudit.set(
      issue.audit_id,
      (issueCountByAudit.get(issue.audit_id) || 0) + 1
    );
  });

  const latestReports = Array.from(latestReportByProject.values());

  const totalProjects = projectList.length;
  const totalIssues = auditIssues?.length || 0;
  const totalKeywords = keywords?.length || 0;

  const totalClicks =
    keywords?.reduce((sum: number, keyword: Keyword) => {
      return sum + (keyword.clicks || 0);
    }, 0) || 0;

  const totalImpressions =
    keywords?.reduce((sum: number, keyword: Keyword) => {
      return sum + (keyword.impressions || 0);
    }, 0) || 0;

  const averageSeoScore =
    latestReports.length > 0
      ? latestReports.reduce(
          (sum: number, report: PageSpeedReport) =>
            sum + Number(report.seo_score || 0),
          0
        ) / latestReports.length
      : null;

  const latestAudit = audits?.[0] || null;
  const latestProjectForAudit = latestAudit
    ? projectList.find(
        (project: Project) => project.id === latestAudit.project_id
      )
    : null;

  const recentProjects = projectList.slice(0, 5);
  const recentAudits = audits?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e6dcc8] bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex rounded-full border border-[#d4af37]/40 bg-[#fff8df] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a5b00]">
              Technical SEO Dashboard
            </div>

            <div>
              <h1 className="max-w-2xl text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Monitor SEO health and keyword visibility.
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Track project audits, PageSpeed scores, Google Search Console
                visibility, and client-ready reports in one workspace.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2b2413] bg-[#111111] p-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b6a46a]">
                  Average SEO Score
                </p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-white">
                  {formatScore(averageSeoScore)}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getScoreBadgeClass(
                  averageSeoScore
                )}`}
              >
                {getScoreLabel(averageSeoScore)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                {
                  label: "Projects",
                  value: totalProjects,
                },
                {
                  label: "Issues",
                  value: totalIssues,
                },
                {
                  label: "Keywords",
                  value: totalKeywords,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-white/10 p-3"
                >
                  <p className="text-[11px] text-slate-400">{item.label}</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          {
            label: "Projects",
            value: totalProjects,
            helper: "Active websites.",
          },
          {
            label: "Avg. SEO Score",
            value: formatScore(averageSeoScore),
            helper: getScoreLabel(averageSeoScore),
          },
          {
            label: "Open Issues",
            value: totalIssues,
            helper: "Detected issues.",
          },
          {
            label: "Keywords",
            value: totalKeywords,
            helper: "Imported from GSC.",
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {item.label}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-bold tracking-tight text-slate-950">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            label: "GSC Clicks",
            value: formatNumber(totalClicks),
            helper: "From imported keywords.",
          },
          {
            label: "GSC Impressions",
            value: formatNumber(totalImpressions),
            helper: "Search visibility.",
          },
          {
            label: "Latest Audit",
            value: latestAudit?.score ?? "--",
            helper: latestProjectForAudit
              ? latestProjectForAudit.name
              : "No audit yet",
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {item.label}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-bold tracking-tight text-slate-950">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base text-slate-950">
                  Recent Projects
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Latest websites being monitored.
                </p>
              </div>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-[#e6dcc8] bg-white px-3 text-xs text-slate-700 hover:bg-[#faf7ef]"
              >
                <Link href="/dashboard/projects">View All</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d4af37]/50 bg-[#faf7ef] p-6">
                <p className="text-sm text-slate-500">
                  No projects yet. Create your first project from the header to
                  start running audits and tracking keyword visibility.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#e6dcc8]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#faf7ef]">
                      <TableHead>Project</TableHead>
                      <TableHead>SEO</TableHead>
                      <TableHead>Perf.</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {recentProjects.map((project: Project) => {
                      const latestReport =
                        latestReportByProject.get(project.id);
                      const latestAuditForProject =
                        latestAuditByProject.get(project.id);
                      const issueCount = latestAuditForProject?.id
                        ? issueCountByAudit.get(latestAuditForProject.id) || 0
                        : null;

                      return (
                        <TableRow key={project.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-950">
                                {project.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {normalizeDomainForDisplay(project.domain)}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getScoreBadgeClass(
                                latestReport?.seo_score
                              )}`}
                            >
                              {latestReport?.seo_score ?? "--"}
                            </span>
                          </TableCell>

                          <TableCell>
                            {latestReport?.performance_score ?? "--"}
                          </TableCell>

                          <TableCell>{issueCount ?? "--"}</TableCell>

                          <TableCell className="text-right">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-xl border-[#e6dcc8] bg-white px-3 text-xs hover:bg-[#faf7ef]"
                            >
                              <Link
                                href={`/dashboard/projects/${project.id}`}
                              >
                                View
                              </Link>
                            </Button>
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

        <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader>
            <div>
              <CardTitle className="text-base text-slate-950">
                Recent Audit Activity
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Latest saved SEO scans.
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {recentAudits.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d4af37]/50 bg-[#faf7ef] p-6">
                <p className="text-sm text-slate-500">
                  No audit activity yet. Open a project and run a full SEO
                  audit.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#e6dcc8]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#faf7ef]">
                      <TableHead>Project</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {recentAudits.map((audit: Audit) => {
                      const project = projectList.find(
                        (item: Project) => item.id === audit.project_id
                      );

                      return (
                        <TableRow key={audit.id}>
                          <TableCell>
                            {project ? (
                              <Link
                                href={`/dashboard/projects/${project.id}/history`}
                                className="font-medium text-slate-950 hover:text-[#9a7a19]"
                              >
                                {project.name}
                              </Link>
                            ) : (
                              "Unknown project"
                            )}
                          </TableCell>

                          <TableCell>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getScoreBadgeClass(
                                audit.score
                              )}`}
                            >
                              {audit.score ?? "--"}
                            </span>
                          </TableCell>

                          <TableCell className="capitalize">
                            {audit.status || "completed"}
                          </TableCell>

                          <TableCell className="text-slate-500">
                            {formatDate(audit.created_at)}
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
      </div>
    </div>
  );
}