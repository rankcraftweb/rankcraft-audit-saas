import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGscConnectionStatus } from "@/lib/gsc/connection-status";

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

type DashboardItem = {
  project: Project;
  latestAudit: AuditRow | null;
  keywordCount: number;
  totalImpressions: number;
};

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "No scan yet";
  }

  return new Date(date).toLocaleDateString();
}

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function normalizeDomain(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

function getScoreLabel(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "Not scanned";
  }

  if (score >= 90) {
    return "Strong";
  }

  if (score >= 70) {
    return "Needs work";
  }

  return "Needs attention";
}

function getScoreBadgeClass(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "border-[#e6dcc8] bg-[#faf7ef] text-slate-500";
  }

  if (score >= 90) {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  if (score >= 70) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const gscStatus = await getGscConnectionStatus(supabase, user.id);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, domain, created_at, user_id")
    .eq("user_id", user.id)
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

  const { data: keywordRows } =
    projectIds.length > 0
      ? await supabase
          .from("gsc_keyword_rows")
          .select("id, project_id, clicks, impressions, created_at")
          .in("project_id", projectIds)
      : { data: [] };

  const auditList = (audits || []) as AuditRow[];
  const keywordList = (keywordRows || []) as KeywordRow[];

  const dashboardItems: DashboardItem[] = projectList.map((project) => {
    const projectAudits = auditList.filter(
      (audit) => audit.project_id === project.id
    );

    const latestAudit = projectAudits[0] || null;

    const projectKeywords = keywordList.filter(
      (keyword) => keyword.project_id === project.id
    );

    const totalImpressions = projectKeywords.reduce(
      (sum, keyword) => sum + Number(keyword.impressions || 0),
      0
    );

    return {
      project,
      latestAudit,
      keywordCount: projectKeywords.length,
      totalImpressions,
    };
  });

  const totalProjects = dashboardItems.length;
  const scannedProjects = dashboardItems.filter(
    (item) => item.latestAudit
  ).length;

  const averageSeoScore =
    scannedProjects > 0
      ? Math.round(
          dashboardItems.reduce(
            (sum, item) => sum + Number(item.latestAudit?.score || 0),
            0
          ) / scannedProjects
        )
      : null;

  const totalKeywordRows = dashboardItems.reduce(
    (sum, item) => sum + item.keywordCount,
    0
  );

  const totalImpressions = dashboardItems.reduce(
    (sum, item) => sum + item.totalImpressions,
    0
  );

  const recentItems = dashboardItems.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
            Dashboard
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            SEO audit control center
          </h1>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/projects/new"
            className="inline-flex h-9 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black"
          >
            Add Project
          </Link>

          <Link
            href="/dashboard/projects"
            className="inline-flex h-9 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-[#faf7ef]"
          >
            SEO Audit
          </Link>
        </div>
      </div>

      {!gscStatus.connected ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7a5b00]">
              Google Search Console is not connected
            </p>

            <p className="mt-1 text-[11px] leading-4 text-[#7a5b00]/70">
              Connect your Google account to sync keyword data across your
              projects.
            </p>
          </div>

          <a
            href="/api/gsc/connect"
            className="inline-flex h-8 shrink-0 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black"
          >
            Connect Google
          </a>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Projects",
            value: totalProjects,
            sub: "Client websites added",
            className: "border-[#e6dcc8] bg-white",
            labelClass: "text-slate-500",
          },
          {
            label: "Scanned",
            value: scannedProjects,
            sub: "With audit results",
            className: "border-[#d4af37]/40 bg-[#fff8df]",
            labelClass: "text-[#7a5b00]",
          },
          {
            label: "Avg. SEO Score",
            value: averageSeoScore ?? "--",
            sub: "Across scanned sites",
            className: "border-[#e6dcc8] bg-white",
            labelClass: "text-slate-500",
          },
          {
            label: "Keyword Rows",
            value: formatNumber(totalKeywordRows),
            sub: `${formatNumber(totalImpressions)} impressions`,
            className: "border-[#e6dcc8] bg-white",
            labelClass: "text-slate-500",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-4 ${stat.className}`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${stat.labelClass}`}
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

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-[#e6dcc8] bg-white">
          <div className="flex items-center justify-between border-b border-[#eee5d4] px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                Recent Websites
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-950">
                Continue audit work
              </p>
            </div>

            <Link
              href="/dashboard/projects"
              className="text-xs font-semibold text-[#7a5b00] hover:underline"
            >
              View all →
            </Link>
          </div>

          {recentItems.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
              <p className="text-sm font-semibold text-slate-950">
                No projects yet
              </p>

              <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                Add a client website to start running audits, reviewing
                keywords, and exporting reports.
              </p>

              <Link
                href="/dashboard/projects/new"
                className="mt-4 inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black"
              >
                Add Project
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#eee5d4]">
              {recentItems.map((item) => {
                const score = item.latestAudit?.score ?? null;

                return (
                  <div
                    key={item.project.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getScoreBadgeClass(
                            score
                          )}`}
                        >
                          {getScoreLabel(score)}
                        </span>

                        <span className="text-[11px] text-slate-400">
                          Last scan {formatDate(item.latestAudit?.created_at)}
                        </span>
                      </div>

                      <p className="mt-1.5 truncate text-sm font-bold text-slate-950">
                        {item.project.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {normalizeDomain(item.project.domain)}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={`/dashboard/projects/${item.project.id}`}
                        className="inline-flex h-8 items-center rounded-xl bg-[#111111] px-3 text-xs font-semibold text-white hover:bg-black"
                      >
                        Overview
                      </Link>

                      <Link
                        href={`/dashboard/projects/${item.project.id}/audit`}
                        className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
                      >
                        Run Audit
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#2b2413] bg-[#111111] text-white">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
              Workflow
            </p>

            <p className="mt-0.5 text-sm font-bold text-white">
              How to use RankCraft Audit
            </p>
          </div>

          <div className="space-y-2 p-4">
            {[
              {
                step: "01",
                title: "Add Project",
                desc: "Add the client website from the Dashboard.",
              },
              {
                step: "02",
                title: "Open SEO Audit",
                desc: "Choose the website and open the audit workspace.",
              },
              {
                step: "03",
                title: "Run, review, report",
                desc: "Run audits, review keywords, export reports, follow recommendations.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 text-[10px] font-bold text-[#f5d56a]">
                    {item.step}
                  </span>

                  <div>
                    <p className="text-xs font-semibold text-white">
                      {item.title}
                    </p>

                    <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-2 space-y-2 pt-1">
              <Link
                href="/dashboard/projects/new"
                className="flex h-9 items-center justify-center rounded-xl bg-[#d4af37] text-xs font-semibold text-black transition hover:bg-[#c9a42e]"
              >
                Add Project
              </Link>

              <Link
                href="/dashboard/projects"
                className="flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Open SEO Audit
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}