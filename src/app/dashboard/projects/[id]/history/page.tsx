import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type HistoryPageProps = {
  params: Promise<{ id: string }>;
};

type Project = {
  id: string;
  name: string;
  domain: string;
};

type AuditRun = {
  id: string;
  score: number | null;
  status: string | null;
  created_at: string;
};

type AuditIssue = {
  id: string;
  audit_id: string;
  severity: string | null;
};

function normalizeDomain(domain: string) {
  return domain.replace("https://", "").replace("http://", "").replace(/\/$/, "");
}

function formatDate(date: string | null | undefined) {
  if (!date) return "No date";
  return new Date(date).toLocaleString();
}

function getScoreStatus(score: number | null | undefined) {
  if (score === null || score === undefined) return "Not scored";
  if (score >= 90) return "Strong";
  if (score >= 70) return "Needs work";
  return "Needs attention";
}

function getScoreBadgeClass(score: number | null | undefined) {
  if (score === null || score === undefined)
    return "border-[#e6dcc8] bg-[#faf7ef] text-slate-500";
  if (score >= 90) return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  if (score >= 70) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function getStatusClass(status: string | null | undefined) {
  if (status === "completed") return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  if (status === "running" || status === "pending")
    return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "failed") return "border-red-200 bg-red-50 text-red-700";
  return "border-[#e6dcc8] bg-[#faf7ef] text-slate-500";
}

function getIssueCounts(auditId: string, issues: AuditIssue[]) {
  const auditIssues = issues.filter((issue) => issue.audit_id === auditId);
  return {
    total: auditIssues.length,
    high: auditIssues.filter((i) => i.severity === "high").length,
    medium: auditIssues.filter((i) => i.severity === "medium").length,
    low: auditIssues.filter((i) => i.severity === "low").length,
  };
}

function getAverageScore(audits: AuditRun[]) {
  const scored = audits.filter((a) => a.score !== null && a.score !== undefined);
  if (scored.length === 0) return null;
  const total = scored.reduce((sum, a) => sum + Number(a.score || 0), 0);
  return Math.round(total / scored.length);
}

function getBestScore(audits: AuditRun[]) {
  const scores = audits
    .map((a) => a.score)
    .filter((s) => s !== null && s !== undefined) as number[];
  if (scores.length === 0) return null;
  return Math.max(...scores);
}

function getLatestScoreChange(audits: AuditRun[]) {
  if (audits.length < 2) return null;
  const latest = audits[0]?.score;
  const previous = audits[1]?.score;
  if (latest === null || latest === undefined || previous === null || previous === undefined)
    return null;
  return Number(latest) - Number(previous);
}

function formatScoreChange(change: number | null) {
  if (change === null) return "No comparison yet";
  if (change > 0) return `+${change} from previous audit`;
  if (change < 0) return `${change} from previous audit`;
  return "No score change";
}

export default async function ProjectHistoryPage({ params }: HistoryPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, domain")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) notFound();

  const currentProject = project as Project;

  const { data: audits } = await supabase
    .from("audits")
    .select("id, score, status, created_at")
    .eq("project_id", currentProject.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const auditList = (audits || []) as AuditRun[];
  const auditIds = auditList.map((a) => a.id);

  const { data: auditIssues } =
    auditIds.length > 0
      ? await supabase
          .from("audit_issues")
          .select("id, audit_id, severity")
          .in("audit_id", auditIds)
      : { data: [] };

  const issueList = (auditIssues || []) as AuditIssue[];

  const latestAudit = auditList[0];
  const averageScore = getAverageScore(auditList);
  const bestScore = getBestScore(auditList);
  const scoreChange = getLatestScoreChange(auditList);

  const totalIssues = issueList.length;
  const highIssues = issueList.filter((i) => i.severity === "high").length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/dashboard/projects/${currentProject.id}`}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            ← Overview
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Audit history
          </h1>
          <p className="text-xs text-slate-500">
            {currentProject.name} · {normalizeDomain(currentProject.domain)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/projects/${currentProject.id}/recommendations`}
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            Recommendations
          </Link>
          <Link
            href={`/dashboard/projects/${currentProject.id}/audit`}
            className="inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black"
          >
            Run New Audit
          </Link>
        </div>
      </div>

      {/* Latest audit summary */}
      <div className="rounded-2xl border border-[#e6dcc8] bg-[#111111] p-5 text-white">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
              Latest Audit
            </p>
            <p className="mt-1 text-lg font-bold tracking-tight text-white">
              Score {latestAudit?.score ?? "--"}
            </p>
            <p className="mt-2 text-xs text-slate-300">
              {formatDate(latestAudit?.created_at)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                Status
              </p>
              <p className="mt-1 text-xs font-semibold capitalize text-white">
                {latestAudit?.status || "No audit yet"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                Movement
              </p>
              <p className="mt-1 text-xs font-semibold text-white">
                {formatScoreChange(scoreChange)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Audit Runs
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {auditList.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Saved scans</p>
        </div>

        <div className="rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
            Average Score
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {averageScore ?? "--"}
          </p>
          <p className="mt-1 text-xs text-[#7a5b00]/70">Across saved audits</p>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Best Score
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {bestScore ?? "--"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Highest recorded</p>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            High Issues
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {highIssues}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {totalIssues} total issue records
          </p>
        </div>
      </div>

      {/* Audit runs table */}
      {auditList.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d4af37]/40 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-950">
            No audit history yet
          </p>
          <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
            Audit runs will appear here after you scan this project, showing
            score, status, date, and issue count.
          </p>
          <Link
            href={`/dashboard/projects/${currentProject.id}/audit`}
            className="mt-5 inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black"
          >
            Run Audit
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#e6dcc8] bg-white">
          <div className="border-b border-[#eee5d4] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Timeline
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-950">
              Previous audit runs
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="border-b border-[#eee5d4] bg-[#faf7ef]">
                  <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Score
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Health
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Issues
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-[0.1em] text-slate-500">
                    High
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Medium
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Low
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee5d4]">
                {auditList.map((audit) => {
                  const counts = getIssueCounts(audit.id, issueList);
                  return (
                    <tr key={audit.id} className="hover:bg-[#faf7ef]">
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/dashboard/projects/${currentProject.id}/history/${audit.id}`}
                          className="font-medium text-slate-950 hover:text-[#7a5b00] hover:underline"
                        >
                          {formatDate(audit.created_at)}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${getStatusClass(audit.status)}`}
                        >
                          {audit.status || "unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-sm font-bold text-slate-950">
                        {audit.score ?? "--"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${getScoreBadgeClass(audit.score)}`}
                        >
                          {getScoreStatus(audit.score)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium text-slate-950">
                        {counts.total}
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium text-red-700">
                        {counts.high}
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium text-amber-700">
                        {counts.medium}
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium text-slate-500">
                        {counts.low}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}