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
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-950">Projects</h2>
        <p className="text-sm text-red-600">{projectsError.message}</p>
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
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e6dcc8] bg-white p-5 shadow-sm md:p-6">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex rounded-full border border-[#d4af37]/40 bg-[#fff8df] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a5b00]">
            Website Portfolio
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
              Projects
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage websites, run technical audits, review keyword visibility,
              and generate client-ready SEO reports.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          {
            label: "Total Projects",
            value: totalProjects,
            helper: "Websites monitored.",
          },
          {
            label: "Avg. SEO Score",
            value: averageSeoScore ? Math.round(averageSeoScore) : "--",
            helper: getScoreLabel(averageSeoScore),
          },
          {
            label: "Open Issues",
            value: totalIssues,
            helper: "Across all audits.",
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

      <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base text-slate-950">
                Google Search Console
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Connection status for keyword visibility data.
              </p>
            </div>

            <ConnectGscButton />
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Connection Status
              </p>

              <div className="mt-3">
                {gscConnection ? (
                  <span className="rounded-full border border-[#d4af37]/50 bg-[#fff8df] px-3 py-1 text-xs font-semibold text-[#7a5b00]">
                    Connected
                  </span>
                ) : (
                  <span className="rounded-full border border-[#d4af37]/50 bg-[#fff8df] px-3 py-1 text-xs font-semibold text-[#7a5b00]">
                    Not connected
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {gscConnection
                  ? `Last connected: ${formatDate(
                      (gscConnection as GscConnection).updated_at
                    )}`
                  : "Connect GSC to pull real keyword data."}
              </p>
            </div>

            <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Total Clicks
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                {formatNumber(totalClicks)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                From imported keyword data.
              </p>
            </div>

            <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Total Impressions
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                {formatNumber(totalImpressions)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Search visibility across projects.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {projectList.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-[#d4af37]/50 bg-white shadow-sm">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#111111] text-lg font-bold text-[#d4af37]">
              RC
            </div>

            <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-950">
              Add your first website
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create a project to run SEO audits, fetch PageSpeed scores, import
              Search Console keywords, and generate reports.
            </p>

            <Button
              asChild
              className="mt-5 rounded-xl bg-[#111111] text-white hover:bg-black"
            >
              <Link href="/dashboard/projects/new">Create Project</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
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
                className="group rounded-2xl border-[#e6dcc8] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#d4af37]/60 hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#111111] text-sm font-bold text-[#d4af37]">
                          {project.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <CardTitle className="truncate text-base text-slate-950">
                            {project.name}
                          </CardTitle>
                          <p className="truncate text-xs text-slate-500">
                            {normalizeDomainForDisplay(project.domain)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getScoreBadgeClass(
                        latestReport?.seo_score
                      )}`}
                    >
                      SEO {latestReport?.seo_score ?? "--"} ·{" "}
                      {getScoreLabel(latestReport?.seo_score)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-4">
                    {[
                      {
                        label: "Performance",
                        value: latestReport?.performance_score ?? "--",
                      },
                      {
                        label: "Issues",
                        value: issueCount,
                      },
                      {
                        label: "Keywords",
                        value: keywordCount,
                      },
                      {
                        label: "Impressions",
                        value: formatNumber(impressions),
                      },
                    ].map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-3"
                      >
                        <p className="text-[11px] font-medium text-slate-500">
                          {metric.label}
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-950">
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-[#e6dcc8] bg-white p-4">
                    <div className="grid gap-3 text-xs sm:grid-cols-3">
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
                    <Button
                      asChild
                      className="h-9 rounded-xl bg-[#111111] px-3 text-xs text-white hover:bg-black"
                    >
                      <Link href={`/dashboard/projects/${project.id}`}>
                        Open Project
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="h-9 rounded-xl border-[#e6dcc8] bg-white px-3 text-xs text-slate-700 hover:bg-[#faf7ef]"
                    >
                      <Link href={`/dashboard/projects/${project.id}/audit`}>
                        Audit
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="h-9 rounded-xl border-[#e6dcc8] bg-white px-3 text-xs text-slate-700 hover:bg-[#faf7ef]"
                    >
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