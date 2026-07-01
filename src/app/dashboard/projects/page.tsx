import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Project = {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  user_id?: string | null;
};

type AuditRow = {
  id: string;
  project_id: string;
  score: number | null;
  status: string | null;
  created_at: string | null;
};

type KeywordRow = {
  id: string;
  project_id: string;
  clicks: number | null;
  impressions: number | null;
  created_at: string | null;
};

type ProjectSummary = {
  project: Project;
  latestAudit: AuditRow | null;
  keywordCount: number;
  totalClicks: number;
  totalImpressions: number;
};

function normalizeDomain(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

function formatDate(date: string | null | undefined) {
  if (!date) return "No scan yet";
  return new Date(date).toLocaleDateString();
}

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function getScoreLabel(score: number | null | undefined) {
  if (score === null || score === undefined) return "Not scanned";
  if (score >= 90) return "Strong";
  if (score >= 70) return "Needs work";
  return "Needs attention";
}

function getScoreBadgeClass(score: number | null | undefined) {
  if (score === null || score === undefined)
    return "border-[#e6dcc8] bg-[#faf7ef] text-slate-500";
  if (score >= 90)
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  if (score >= 70)
    return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

export default async function ProjectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, domain, created_at, user_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const projectList = (projects || []) as Project[];
  const projectIds = projectList.map((p) => p.id);

  const { data: audits } =
    projectIds.length > 0
      ? await supabase
          .from("audits")
          .select("id, project_id, score, status, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { data: keywordRows } =
    projectIds.length > 0
      ? await supabase
          .from("gsc_keyword_rows")
          .select("id, project_id, clicks, impressions, created_at")
          .in("project_id", projectIds)
      : { data: [] };

  const auditList = (audits || []) as AuditRow[];
  const keywordList = (keywordRows || []) as KeywordRow[];

  const summaries: ProjectSummary[] = projectList.map((project) => {
    const projectAudits = auditList.filter(
      (a) => a.project_id === project.id
    );
    const latestAudit = projectAudits[0] || null;
    const projectKeywords = keywordList.filter(
      (k) => k.project_id === project.id
    );
    const totalClicks = projectKeywords.reduce(
      (sum, k) => sum + Number(k.clicks || 0),
      0
    );
    const totalImpressions = projectKeywords.reduce(
      (sum, k) => sum + Number(k.impressions || 0),
      0
    );
    return {
      project,
      latestAudit,
      keywordCount: projectKeywords.length,
      totalClicks,
      totalImpressions,
    };
  });

  const totalProjects = summaries.length;
  const scannedProjects = summaries.filter((s) => s.latestAudit).length;
  const averageScore =
    scannedProjects > 0
      ? Math.round(
          summaries.reduce(
            (sum, s) => sum + Number(s.latestAudit?.score || 0),
            0
          ) / scannedProjects
        )
      : null;
  const totalKeywordRows = summaries.reduce(
    (sum, s) => sum + s.keywordCount,
    0
  );
  const totalImpressions = summaries.reduce(
    (sum, s) => sum + s.totalImpressions,
    0
  );

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
            SEO Audit
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-950">
            Audit workflow
          </h1>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="inline-flex h-9 w-fit items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black"
        >
          + Add Project
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Websites",
            value: totalProjects,
            sub: "Available to audit",
            cls: "border-[#e6dcc8] bg-white",
            labelCls: "text-slate-500",
          },
          {
            label: "Scanned",
            value: scannedProjects,
            sub: "With audit data",
            cls: "border-[#d4af37]/40 bg-[#fff8df]",
            labelCls: "text-[#7a5b00]",
          },
          {
            label: "Avg. SEO Score",
            value: averageScore ?? "--",
            sub: "Across scanned sites",
            cls: "border-[#e6dcc8] bg-white",
            labelCls: "text-slate-500",
          },
          {
            label: "Keyword Rows",
            value: formatNumber(totalKeywordRows),
            sub: `${formatNumber(totalImpressions)} impressions`,
            cls: "border-[#e6dcc8] bg-white",
            labelCls: "text-slate-500",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-4 ${stat.cls}`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${stat.labelCls}`}
            >
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Project list */}
      {summaries.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d4af37]/40 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-950">
            No websites yet
          </p>
          <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
            Add a project to start the audit workflow — run scans, review
            keywords, and export reports.
          </p>
          <Link
            href="/dashboard/projects/new"
            className="mt-5 inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black"
          >
            Add Project
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((summary) => {
            const { project, latestAudit } = summary;
            const score = latestAudit?.score ?? null;

            return (
              <div
                key={project.id}
                className="rounded-2xl border border-[#e6dcc8] bg-white p-5"
              >
                <div className="grid gap-4 xl:grid-cols-[1fr_auto]">

                  {/* Left — project info */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getScoreBadgeClass(score)}`}
                      >
                        {getScoreLabel(score)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Added {formatDate(project.created_at)}
                      </span>
                    </div>

                    <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
                      {project.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {normalizeDomain(project.domain)}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Last scan:{" "}
                      <span className="font-semibold text-slate-700">
                        {formatDate(latestAudit?.created_at)}
                      </span>
                    </p>

                    {/* Quick action links */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="inline-flex h-7 items-center rounded-lg bg-[#111111] px-3 text-[11px] font-semibold text-white hover:bg-black"
                      >
                        Overview
                      </Link>
                      <Link
                        href={`/dashboard/projects/${project.id}/audit`}
                        className="inline-flex h-7 items-center rounded-lg border border-[#e6dcc8] bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-[#faf7ef]"
                      >
                        Run Audit
                      </Link>
                      <Link
                        href={`/dashboard/projects/${project.id}/keywords`}
                        className="inline-flex h-7 items-center rounded-lg border border-[#e6dcc8] bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-[#faf7ef]"
                      >
                        Keywords
                      </Link>
                      <Link
                        href={`/dashboard/projects/${project.id}/reports`}
                        className="inline-flex h-7 items-center rounded-lg border border-[#e6dcc8] bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-[#faf7ef]"
                      >
                        Report
                      </Link>
                      <Link
                        href={`/dashboard/projects/${project.id}/recommendations`}
                        className="inline-flex h-7 items-center rounded-lg border border-[#e6dcc8] bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-[#faf7ef]"
                      >
                        Recommendations
                      </Link>
                    </div>
                  </div>

                  {/* Right — mini stats */}
                  <div className="grid grid-cols-3 gap-2 xl:w-[340px] xl:grid-cols-3">
                    <div className="rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        SEO Score
                      </p>
                      <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">
                        {score ?? "--"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#e6dcc8] bg-white p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Keywords
                      </p>
                      <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">
                        {formatNumber(summary.keywordCount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#d4af37]/40 bg-[#fff8df] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a5b00]">
                        Impressions
                      </p>
                      <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">
                        {formatNumber(summary.totalImpressions)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}