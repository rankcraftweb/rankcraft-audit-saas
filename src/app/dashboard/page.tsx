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

  return new Date(date).toLocaleString();
}

function getScoreLabel(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "No audit yet";
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

  return "border-red-200 bg-red-50 text-red-700";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, domain, created_at")
    .order("created_at", { ascending: false });

  if (projectsError) {
    return (
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="mt-4 text-sm text-red-500">
          {projectsError.message}
        </p>
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
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/80">
              Technical SEO SaaS Dashboard
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
                Monitor SEO health, keyword visibility, and client reports.
              </h1>

              <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                RankCraft Audit combines technical scans, PageSpeed data,
                Search Console keywords, and report-ready insights in one
                professional dashboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-xl bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/dashboard/projects">Open Projects</Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/dashboard/projects/new">Add Website</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-slate-300">Average SEO Score</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="text-6xl font-bold">
                {formatScore(averageSeoScore)}
              </p>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getScoreBadgeClass(
                  averageSeoScore
                )}`}
              >
                {getScoreLabel(averageSeoScore)}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-slate-400">Projects</p>
                <p className="mt-1 text-xl font-semibold">{totalProjects}</p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-slate-400">Issues</p>
                <p className="mt-1 text-xl font-semibold">{totalIssues}</p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-slate-400">Keywords</p>
                <p className="mt-1 text-xl font-semibold">{totalKeywords}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {totalProjects}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Active website projects.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Avg. SEO Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {formatScore(averageSeoScore)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {getScoreLabel(averageSeoScore)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Open Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {totalIssues}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Total detected SEO issues.
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
              {totalKeywords}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Imported from GSC.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              GSC Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {formatNumber(totalClicks)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              From imported keyword data.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              GSC Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {formatNumber(totalImpressions)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Search result visibility.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Latest Audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {latestAudit?.score ?? "--"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {latestProjectForAudit
                ? latestProjectForAudit.name
                : "No audit yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Recent Projects</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Latest websites being monitored.
                </p>
              </div>

              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href="/dashboard/projects">View All</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="space-y-4 rounded-2xl border border-dashed border-slate-300 p-6">
                <p className="text-sm text-slate-500">
                  No projects yet. Create your first project to start running
                  audits and tracking keyword visibility.
                </p>

                <Button asChild className="rounded-xl">
                  <Link href="/dashboard/projects/new">Create Project</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
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
                              <p className="text-sm text-slate-500">
                                {project.domain}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getScoreBadgeClass(
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
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/dashboard/projects/${project.id}`}>
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

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <div>
              <CardTitle>Recent Audit Activity</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Latest completed SEO scans.
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {recentAudits.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6">
                <p className="text-sm text-slate-500">
                  No audit activity yet. Run a full SEO audit from a project
                  page.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
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
                                href={`/dashboard/projects/${project.id}/history/${audit.id}`}
                                className="font-medium text-slate-950 hover:underline"
                              >
                                {project.name}
                              </Link>
                            ) : (
                              "Unknown project"
                            )}
                          </TableCell>

                          <TableCell>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getScoreBadgeClass(
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