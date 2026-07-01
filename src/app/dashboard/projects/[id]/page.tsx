import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

type Project = {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  user_id: string;
};

type AuditRow = {
  id: string;
  score: number | null;
  status: string | null;
  created_at: string | null;
};

type KeywordRow = {
  id: string;
  query: string | null;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
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

function formatPosition(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return Number(value).toFixed(1);
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

export default async function ProjectOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, domain, created_at, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  const currentProject = project as Project;

  const { data: audits } = await supabase
    .from("audits")
    .select("id, score, status, created_at")
    .eq("project_id", currentProject.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const auditList = (audits || []) as AuditRow[];
  const latestAudit = auditList[0] || null;

  const { data: keywordRows } = await supabase
    .from("gsc_keyword_rows")
    .select("id, query, clicks, impressions, ctr, position")
    .eq("project_id", currentProject.id)
    .order("impressions", { ascending: false })
    .limit(5);

  const keywordList = (keywordRows || []) as KeywordRow[];

  const totalClicks = keywordList.reduce(
    (sum, k) => sum + Number(k.clicks || 0),
    0
  );
  const totalImpressions = keywordList.reduce(
    (sum, k) => sum + Number(k.impressions || 0),
    0
  );
  const avgPosition =
    keywordList.length > 0
      ? keywordList.reduce((sum, k) => sum + Number(k.position || 0), 0) /
        keywordList.length
      : null;

  const toolLinks = [
    {
      label: "Run Audit",
      href: `/dashboard/projects/${currentProject.id}/audit`,
      desc: "Scan for technical SEO issues and generate a score.",
    },
    {
      label: "Keywords",
      href: `/dashboard/projects/${currentProject.id}/keywords`,
      desc: "Review GSC keyword rows and search visibility.",
    },
    {
      label: "Report",
      href: `/dashboard/projects/${currentProject.id}/reports`,
      desc: "Open a compact client-ready report.",
    },
    {
      label: "Recommendations",
      href: `/dashboard/projects/${currentProject.id}/recommendations`,
      desc: "Prioritized next actions based on audit and keyword data.",
    },
    {
      label: "History",
      href: `/dashboard/projects/${currentProject.id}/history`,
      desc: "Past audit runs and score movement.",
    },
    {
      label: "Settings",
      href: `/dashboard/projects/${currentProject.id}/settings`,
      desc: "Edit project name, URL, or delete the project.",
    },
  ];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/projects"
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            ← SEO Audit
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            {currentProject.name}
          </h1>
          <p className="text-xs text-slate-500">
            {normalizeDomain(currentProject.domain)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/projects/${currentProject.id}/audit`}
            className="inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black"
          >
            Run Audit
          </Link>
          <Link
            href={`/dashboard/projects/${currentProject.id}/reports`}
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            Report
          </Link>
          <Link
            href={`/dashboard/projects/${currentProject.id}/settings`}
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            SEO Score
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {latestAudit?.score ?? "--"}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getScoreBadgeClass(latestAudit?.score)}`}
          >
            {getScoreLabel(latestAudit?.score)}
          </span>
        </div>

        <div className="rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
            Last Audit
          </p>
          <p className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            {formatDate(latestAudit?.created_at)}
          </p>
          <p className="mt-1 text-xs text-[#7a5b00]/70">
            {latestAudit ? "Audit data available" : "No audit yet"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Impressions
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {formatNumber(totalImpressions)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatNumber(totalClicks)} clicks
          </p>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Avg. Position
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {formatPosition(avgPosition)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            From {keywordList.length} keyword rows
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">

        {/* Workflow links */}
        <div className="rounded-2xl border border-[#e6dcc8] bg-white">
          <div className="border-b border-[#eee5d4] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Workflow
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-950">
              Continue audit work
            </p>
          </div>
          <div className="grid gap-2 p-4 sm:grid-cols-2">
            {toolLinks.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-4 transition hover:border-[#d4af37]/50 hover:bg-[#fff8df]"
              >
                <p className="text-xs font-bold text-slate-950">{tool.label}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  {tool.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Status panel */}
        <div className="rounded-2xl border border-[#2b2413] bg-[#111111] text-white">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
              Current Status
            </p>
            <p className="mt-0.5 text-sm font-bold text-white">
              Project summary
            </p>
          </div>
          <div className="space-y-2 p-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-semibold text-white">Audit</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-400">
                {latestAudit
                  ? `Score ${latestAudit.score ?? "--"} from ${formatDate(latestAudit.created_at)}.`
                  : "No audit run yet."}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-semibold text-white">
                Search data
              </p>
              <p className="mt-1 text-[11px] leading-4 text-slate-400">
                {keywordList.length > 0
                  ? `${keywordList.length} keyword rows — ${formatNumber(totalClicks)} clicks, ${formatNumber(totalImpressions)} impressions.`
                  : "No keyword rows loaded yet."}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-semibold text-white">Next step</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-400">
                Run an audit, sync keywords, export the report, then work
                through recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top keywords preview */}
      {keywordList.length > 0 && (
        <div className="rounded-2xl border border-[#e6dcc8] bg-white">
          <div className="flex items-center justify-between border-b border-[#eee5d4] px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                Keywords
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-950">
                Top keyword rows
              </p>
            </div>
            <Link
              href={`/dashboard/projects/${currentProject.id}/keywords`}
              className="text-xs font-semibold text-[#7a5b00] hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="border-b border-[#eee5d4] bg-[#faf7ef]">
                  <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Keyword
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Clicks
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Impressions
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Position
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee5d4]">
                {keywordList.map((keyword) => (
                  <tr key={keyword.id} className="hover:bg-[#faf7ef]">
                    <td className="px-5 py-2.5 font-medium text-slate-950">
                      {keyword.query || "--"}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-700">
                      {formatNumber(keyword.clicks)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-700">
                      {formatNumber(keyword.impressions)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-700">
                      {formatPosition(keyword.position)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}