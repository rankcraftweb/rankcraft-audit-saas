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

function normalizeUrl(domain: string) {
  const trimmed = domain.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
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

function getLatestByProjectId<T extends { project_id: string; created_at: string | null }>(
  rows: T[]
) {
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

function getKeywordStats(rows: GscKeywordRow[]) {
  const latestRangeRow = [...rows].sort((a, b) => {
    const aTime = new Date(a.created_at || a.end_date || 0).getTime();
    const bTime = new Date(b.created_at || b.end_date || 0).getTime();

    return bTime - aTime;
  })[0];

  if (!latestRangeRow?.start_date || !latestRangeRow?.end_date) {
    return {
      keywordCount: 0,
      clicks: 0,
      impressions: 0,
    };
  }

  const latestRows = rows.filter((row) => {
    return (
      row.start_date === latestRangeRow.start_date &&
      row.end_date === latestRangeRow.end_date
    );
  });

  return {
    keywordCount: latestRows.length,
    clicks: latestRows.reduce((sum, row) => sum + Number(row.clicks || 0), 0),
    impressions: latestRows.reduce(
      (sum, row) => sum + Number(row.impressions || 0),
      0
    ),
  };
}

export default async function ProjectsPage() {
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

  const totalProjects = projectList.length;
  const scannedProjects = projectList.filter((project) => {
    return latestAuditByProject.has(project.id) || latestPageSpeedByProject.has(project.id);
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

  const totalKeywords = keywordRows.length;
  const totalImpressions = keywordRows.reduce((sum, row) => {
    return sum + Number(row.impressions || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[#e6dcc8] bg-white shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-[#d4af37]/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-slate-100 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                Projects
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                SEO audit projects
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Manage client websites, run audits, review Google Search Console
                keyword data, export reports, and open prioritized recommendations.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/dashboard/projects/new">Add Project</Link>
              </Button>

              <Button asChild variant="outline">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Total Projects",
            value: totalProjects,
            helper: "Client websites",
            className: "border-[#e6dcc8] bg-white",
          },
          {
            label: "Scanned",
            value: scannedProjects,
            helper: "With audit data",
            className: "border-[#d4af37]/50 bg-[#fff8df]",
          },
          {
            label: "Avg. SEO Score",
            value: averageSeoScore ?? "--",
            helper: "Across scanned projects",
            className: "border-[#e6dcc8] bg-[#faf7ef]",
          },
          {
            label: "Keyword Rows",
            value: formatNumber(totalKeywords),
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

      {projectList.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-[#d4af37]/50 bg-[#faf7ef] shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#d4af37]/40 bg-white text-lg font-bold text-[#9a7a19]">
              +
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-950">
              No projects yet
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Add your first client website to start running audits, syncing
              keyword data, and creating client-ready reports.
            </p>

            <Button asChild className="mt-6">
              <Link href="/dashboard/projects/new">Add First Project</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4">
          {projectList.map((project) => {
            const latestAudit = latestAuditByProject.get(project.id);
            const latestPageSpeed = latestPageSpeedByProject.get(project.id);
            const seoScore = latestPageSpeed?.seo_score ?? latestAudit?.score;
            const latestScanDate =
              latestPageSpeed?.created_at || latestAudit?.created_at || null;

            const projectKeywordRows = keywordRows.filter((row) => {
              return row.project_id === project.id;
            });

            const keywordStats = getKeywordStats(projectKeywordRows);

            return (
              <Card
                key={project.id}
                className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="p-5">
                  <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
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
                          Created {formatDate(project.created_at)}
                        </span>
                      </div>

                      <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="underline-offset-4 hover:text-[#9a7a19] hover:underline"
                        >
                          {project.name}
                        </Link>
                      </h2>

                      <a
                        href={normalizeUrl(project.domain)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-sm font-medium text-slate-500 underline-offset-4 hover:text-[#9a7a19] hover:underline"
                      >
                        {normalizeDomainForDisplay(project.domain)}
                      </a>

                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                        Last scan:{" "}
                        <span className="font-semibold text-slate-950">
                          {formatDate(latestScanDate)}
                        </span>
                        . Open the project overview to continue audit, keyword,
                        report, and recommendation work.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          SEO Score
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-950">
                          {seoScore ?? "--"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Keywords
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-950">
                          {keywordStats.keywordCount}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#d4af37]/50 bg-[#fff8df] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a5b00]">
                          Impressions
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-950">
                          {formatNumber(keywordStats.impressions)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href={`/dashboard/projects/${project.id}`}>
                        Overview
                      </Link>
                    </Button>

                    <Button asChild variant="outline">
                      <Link href={`/dashboard/projects/${project.id}/audit`}>
                        Audit
                      </Link>
                    </Button>

                    <Button asChild variant="outline">
                      <Link href={`/dashboard/projects/${project.id}/keywords`}>
                        Keywords
                      </Link>
                    </Button>

                    <Button asChild variant="outline">
                      <Link href={`/dashboard/projects/${project.id}/reports`}>
                        Report
                      </Link>
                    </Button>

                    <Button asChild variant="outline">
                      <Link
                        href={`/dashboard/projects/${project.id}/recommendations`}
                      >
                        Actions
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}