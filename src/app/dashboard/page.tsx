import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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

type Audit = {
  id: string;
  project_id: string;
  score: number | null;
  status: string | null;
  created_at: string | null;
};

type PageSpeedReport = {
  id: string;
  project_id: string;
  seo_score: number | null;
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  created_at: string | null;
};

type GscKeywordRow = {
  id: string;
  project_id: string;
  query: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
};

function normalizeDomainForDisplay(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "No data yet";
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

function getLatestByProjectId<
  T extends { project_id: string; created_at: string | null },
>(rows: T[]) {
  const map = new Map<string, T>();

  rows.forEach((row) => {
    const current = map.get(row.project_id);

    if (!current) {
      map.set(row.project_id, row);
      return;
    }

    const rowTime = new Date(row.created_at || 0).getTime();
    const currentTime = new Date(current.created_at || 0).getTime();

    if (rowTime > currentTime) {
      map.set(row.project_id, row);
    }
  });

  return map;
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

function getKeywordStats(rows: GscKeywordRow[]) {
  const latestRows = getLatestKeywordRows(rows);

  return {
    keywordCount: latestRows.length,
    clicks: latestRows.reduce((sum, row) => sum + Number(row.clicks || 0), 0),
    impressions: latestRows.reduce(
      (sum, row) => sum + Number(row.impressions || 0),
      0
    ),
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, domain, created_at")
    .order("created_at", { ascending: false });

  const projectList = (projects || []) as Project[];
  const projectIds = projectList.map((project) => project.id);

  const { data: audits } =
    projectIds.length > 0
      ? await supabase
          .from("audits")
          .select("id, project_id, score, status, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { data: pageSpeedReports } =
    projectIds.length > 0
      ? await supabase
          .from("pagespeed_reports")
          .select(
            "id, project_id, seo_score, performance_score, accessibility_score, best_practices_score, created_at"
          )
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { data: gscKeywordRows } =
    projectIds.length > 0
      ? await supabase
          .from("gsc_keyword_rows")
          .select(
            "id, project_id, query, clicks, impressions, ctr, position, start_date, end_date, created_at"
          )
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
          .limit(1000)
      : { data: [] };

  const auditList = (audits || []) as Audit[];
  const pageSpeedList = (pageSpeedReports || []) as PageSpeedReport[];
  const keywordRows = (gscKeywordRows || []) as GscKeywordRow[];

  const latestAuditByProject = getLatestByProjectId(auditList);
  const latestPageSpeedByProject = getLatestByProjectId(pageSpeedList);

  const scannedProjects = projectList.filter((project) => {
    return (
      latestAuditByProject.has(project.id) ||
      latestPageSpeedByProject.has(project.id)
    );
  }).length;

  const averageSeoScore =
    scannedProjects > 0
      ? Math.round(
          projectList.reduce((sum, project) => {
            const latestAudit = latestAuditByProject.get(project.id);
            const latestPageSpeed = latestPageSpeedByProject.get(project.id);
            const score = latestPageSpeed?.seo_score ?? latestAudit?.score ?? 0;

            return sum + Number(score || 0);
          }, 0) / scannedProjects
        )
      : null;

  const totalLatestKeywordRows = projectList.flatMap((project) => {
    const rows = keywordRows.filter((row) => row.project_id === project.id);
    return getLatestKeywordRows(rows);
  });

  const totalClicks = totalLatestKeywordRows.reduce((sum, row) => {
    return sum + Number(row.clicks || 0);
  }, 0);

  const totalImpressions = totalLatestKeywordRows.reduce((sum, row) => {
    return sum + Number(row.impressions || 0);
  }, 0);

  const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : null;

  const recentProjects = projectList.slice(0, 4);

  const projectsNeedingAudit = projectList.filter((project) => {
    return (
      !latestAuditByProject.has(project.id) &&
      !latestPageSpeedByProject.has(project.id)
    );
  }).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[#e6dcc8] bg-white shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#d4af37]/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-slate-100 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                RankCraft Audit
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                SEO audit dashboard
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Manage SEO audit projects, review technical scores, monitor
                keyword visibility, export client reports, and open prioritized
                recommendations from one dashboard.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/dashboard/projects">View Projects</Link>
                </Button>

                <Button asChild variant="outline">
                  <Link href="/dashboard/projects/new">Add Project</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-[#2b2413] bg-[#111111] p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b6a46a]">
                Workspace Health
              </p>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-5xl font-bold tracking-tight text-white">
                    {averageSeoScore ?? "--"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Average SEO score
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getScoreBadgeClass(
                    averageSeoScore
                  )}`}
                >
                  {getScoreStatus(averageSeoScore)}
                </span>
              </div>

              <div className="mt-5 grid gap-2 text-sm">
                <div className="flex justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 p-3">
                  <span className="text-slate-400">Projects</span>
                  <span className="font-semibold text-white">
                    {projectList.length}
                  </span>
                </div>

                <div className="flex justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 p-3">
                  <span className="text-slate-400">Scanned</span>
                  <span className="font-semibold text-white">
                    {scannedProjects}
                  </span>
                </div>

                <div className="flex justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 p-3">
                  <span className="text-slate-400">Needs Audit</span>
                  <span className="font-semibold text-white">
                    {projectsNeedingAudit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Total Projects",
            value: projectList.length,
            helper: "Client websites",
            className: "border-[#e6dcc8] bg-white",
          },
          {
            label: "Scanned Projects",
            value: scannedProjects,
            helper: "With audit data",
            className: "border-[#d4af37]/50 bg-[#fff8df]",
          },
          {
            label: "Total Keywords",
            value: formatNumber(totalLatestKeywordRows.length),
            helper: "Latest synced rows",
            className: "border-[#e6dcc8] bg-[#faf7ef]",
          },
          {
            label: "Average CTR",
            value: formatCtr(averageCtr),
            helper: `${formatNumber(totalImpressions)} impressions`,
            className: "border-[#e6dcc8] bg-white",
          },
        ].map((item) => (
          <Card
            key={item.label}
            className={`rounded-2xl shadow-sm ${item.className}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {item.label}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-4xl font-bold tracking-tight text-slate-950">
                {item.value}
              </p>

              <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {[
          {
            title: "Projects",
            description:
              "Open all client projects, check scan status, and continue work from the project list.",
            href: "/dashboard/projects",
            label: "Open Projects",
            stat: `${projectList.length} total`,
          },
          {
            title: "Add Project",
            description:
              "Create a new client website project and start the first SEO audit workflow.",
            href: "/dashboard/projects/new",
            label: "Add New",
            stat: "Start tracking",
          },
          {
            title: "Reports",
            description:
              "Use each project report page to export compact SEO reports for clients.",
            href: "/dashboard/projects",
            label: "Choose Project",
            stat: "Client-ready",
          },
          {
            title: "Recommendations",
            description:
              "Open project action plans based on audit issues and GSC keyword opportunities.",
            href: "/dashboard/projects",
            label: "View Actions",
            stat: "Prioritized fixes",
          },
        ].map((card) => (
          <Card
            key={card.title}
            className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardContent className="flex h-full flex-col p-5">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] text-sm font-bold text-[#7a5b00]">
                {card.title.slice(0, 1)}
              </div>

              <h2 className="text-lg font-bold tracking-tight text-slate-950">
                {card.title}
              </h2>

              <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                {card.description}
              </p>

              <div className="mt-5 rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-3">
                <p className="text-xs font-medium text-slate-500">
                  {card.stat}
                </p>
              </div>

              <Button asChild className="mt-4 w-full">
                <Link href={card.href}>{card.label}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-950">
              Recent Projects
            </CardTitle>
          </CardHeader>

          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d4af37]/50 bg-[#faf7ef] p-6 text-center">
                <p className="font-semibold text-slate-950">
                  No projects yet
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Add your first website to start running audits, syncing
                  keywords, and exporting reports.
                </p>

                <Button asChild className="mt-5">
                  <Link href="/dashboard/projects/new">Add First Project</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => {
                  const latestAudit = latestAuditByProject.get(project.id);
                  const latestPageSpeed = latestPageSpeedByProject.get(
                    project.id
                  );

                  const seoScore =
                    latestPageSpeed?.seo_score ?? latestAudit?.score;

                  const projectKeywordRows = keywordRows.filter((row) => {
                    return row.project_id === project.id;
                  });

                  const keywordStats = getKeywordStats(projectKeywordRows);

                  return (
                    <div
                      key={project.id}
                      className="rounded-2xl border border-[#e6dcc8] bg-white p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getScoreBadgeClass(
                                seoScore
                              )}`}
                            >
                              {getScoreStatus(seoScore)}
                            </span>

                            <span className="rounded-full border border-[#e6dcc8] bg-[#faf7ef] px-3 py-1 text-xs font-medium text-slate-600">
                              {keywordStats.keywordCount} keywords
                            </span>
                          </div>

                          <h3 className="mt-3 font-bold text-slate-950">
                            {project.name}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {normalizeDomainForDisplay(project.domain)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm">
                            <Link href={`/dashboard/projects/${project.id}`}>
                              Open
                            </Link>
                          </Button>

                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/dashboard/projects/${project.id}/reports`}
                            >
                              Report
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-950">
              Next Best Action
            </CardTitle>
          </CardHeader>

          <CardContent>
            {projectList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d4af37]/50 bg-[#faf7ef] p-5">
                <p className="font-semibold text-slate-950">
                  Add your first project
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Start by creating one project. After that, run the first audit
                  and generate the first SEO report.
                </p>

                <Button asChild className="mt-4">
                  <Link href="/dashboard/projects/new">Add Project</Link>
                </Button>
              </div>
            ) : projectsNeedingAudit > 0 ? (
              <div className="rounded-2xl border border-[#d4af37]/50 bg-[#fff8df] p-5">
                <p className="font-semibold text-[#7a5b00]">
                  Run audits for unscanned projects
                </p>

                <p className="mt-2 text-sm leading-6 text-[#7a5b00]/80">
                  {projectsNeedingAudit} project(s) still need an initial audit.
                  Open the Projects page and run audits to generate scores,
                  issues, reports, and recommendations.
                </p>

                <Button asChild className="mt-4">
                  <Link href="/dashboard/projects">Open Projects</Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-5">
                <p className="font-semibold text-slate-950">
                  Review reports and recommendations
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Your projects have scan data. Use each project report and
                  recommendations page to decide the next SEO actions.
                </p>

                <Button asChild className="mt-4">
                  <Link href="/dashboard/projects">View Projects</Link>
                </Button>
              </div>
            )}

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Organic Clicks
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {formatNumber(totalClicks)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Organic Impressions
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {formatNumber(totalImpressions)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}