import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ConnectGscButton from "@/components/connect-gsc-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  accessibility_score: number | null;
  best_practices_score: number | null;
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
};

type GscConnection = {
  id: string;
  updated_at: string | null;
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

  return new Date(date).toLocaleDateString();
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

function normalizeDomainForDisplay(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

export default async function ProjectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, domain, created_at")
    .order("created_at", { ascending: false });

  if (projectsError) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">Projects</h2>
        <p className="text-sm text-red-500">{projectsError.message}</p>
      </div>
    );
  }

  const projectList = projects || [];
  const projectIds = projectList.map((project: Project) => project.id);

  const { data: gscConnection } = user?.id
    ? await supabase
        .from("gsc_connections")
        .select("id, updated_at")
        .eq("user_id", user.id)
        .single()
    : { data: null };

  const { data: pageSpeedReports } =
    projectIds.length > 0
      ? await supabase
          .from("pagespeed_reports")
          .select(
            "project_id, seo_score, performance_score, accessibility_score, best_practices_score, created_at"
          )
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
          .select("project_id, clicks, impressions")
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

  const keywordCountByProject = new Map<string, number>();
  const clicksByProject = new Map<string, number>();
  const impressionsByProject = new Map<string, number>();

  keywords?.forEach((keyword: Keyword) => {
    keywordCountByProject.set(
      keyword.project_id,
      (keywordCountByProject.get(keyword.project_id) || 0) + 1
    );

    clicksByProject.set(
      keyword.project_id,
      (clicksByProject.get(keyword.project_id) || 0) + (keyword.clicks || 0)
    );

    impressionsByProject.set(
      keyword.project_id,
      (impressionsByProject.get(keyword.project_id) || 0) +
        (keyword.impressions || 0)
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

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
              Website Portfolio
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Projects
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Manage websites, run technical audits, review keyword
                visibility, and generate client-ready SEO reports.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/dashboard">Dashboard</Link>
            </Button>

            <Button asChild className="rounded-xl">
              <Link href="/dashboard/projects/new">Add Project</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Total Projects
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {totalProjects}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Websites monitored.
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
              {averageSeoScore ? Math.round(averageSeoScore) : "--"}
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
              Across all audits.
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

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Google Search Console</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Connection status for keyword visibility data.
              </p>
            </div>

            <ConnectGscButton />
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-600">
                Connection Status
              </p>

              <div className="mt-3">
                {gscConnection ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    Connected
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    Not connected
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm text-slate-500">
                {gscConnection
                  ? `Last connected: ${formatDate(
                      (gscConnection as GscConnection).updated_at
                    )}`
                  : "Connect GSC to pull real keyword data."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-600">
                Total Clicks
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight">
                {formatNumber(totalClicks)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                From imported keyword data.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-600">
                Total Impressions
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight">
                {formatNumber(totalImpressions)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Search visibility across projects.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {projectList.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-slate-300 shadow-sm">
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-xl font-bold text-white">
              RC
            </div>

            <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
              Add your first website
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create a project to run SEO audits, fetch PageSpeed scores, import
              Search Console keywords, and generate reports.
            </p>

            <Button asChild className="mt-6 rounded-xl">
              <Link href="/dashboard/projects/new">Create Project</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {projectList.map((project: Project) => {
            const latestReport = latestReportByProject.get(project.id);
            const latestAudit = latestAuditByProject.get(project.id);
            const issueCount = latestAudit?.id
              ? issueCountByAudit.get(latestAudit.id) || 0
              : 0;
            const keywordCount = keywordCountByProject.get(project.id) || 0;
            const clicks = clicksByProject.get(project.id) || 0;
            const impressions = impressionsByProject.get(project.id) || 0;

            return (
              <Card
                key={project.id}
                className="group rounded-3xl border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                          {project.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <CardTitle className="truncate text-xl">
                            {project.name}
                          </CardTitle>
                          <p className="truncate text-sm text-slate-500">
                            {normalizeDomainForDisplay(project.domain)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${getScoreBadgeClass(
                        latestReport?.seo_score
                      )}`}
                    >
                      SEO {latestReport?.seo_score ?? "--"} ·{" "}
                      {getScoreLabel(latestReport?.seo_score)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Performance</p>
                      <p className="mt-1 text-xl font-bold">
                        {latestReport?.performance_score ?? "--"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Issues</p>
                      <p className="mt-1 text-xl font-bold">{issueCount}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Keywords</p>
                      <p className="mt-1 text-xl font-bold">{keywordCount}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Impressions</p>
                      <p className="mt-1 text-xl font-bold">
                        {formatNumber(impressions)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-slate-500">Clicks</p>
                        <p className="mt-1 font-semibold text-slate-950">
                          {formatNumber(clicks)}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">Latest Audit</p>
                        <p className="mt-1 font-semibold text-slate-950">
                          {latestAudit
                            ? formatDate(latestAudit.created_at)
                            : "Not run yet"}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">Created</p>
                        <p className="mt-1 font-semibold text-slate-950">
                          {formatDate(project.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild className="rounded-xl">
                      <Link href={`/dashboard/projects/${project.id}`}>
                        Overview
                      </Link>
                    </Button>

                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href={`/dashboard/projects/${project.id}/audit`}>
                        Audit
                      </Link>
                    </Button>

                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href={`/dashboard/projects/${project.id}/keywords`}>
                        Keywords
                      </Link>
                    </Button>

                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href={`/dashboard/projects/${project.id}/reports`}>
                        Report
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}