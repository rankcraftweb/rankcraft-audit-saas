import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuditRunner from "./audit-runner";

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
  project_id: string;
  score: number | null;
  status: string | null;
  created_at: string | null;
};

type AuditIssue = {
  id: string;
  audit_id: string;
  title: string | null;
  description: string | null;
  severity: string | null;
  recommendation: string | null;
  created_at: string | null;
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

function getScoreLabel(score: number | null | undefined) {
  if (score === null || score === undefined) return "Not scanned";
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

function getSeverityClass(severity: string | null | undefined) {
  const value = String(severity || "").toLowerCase();
  if (value === "high") return "border-red-200 bg-red-50 text-red-700";
  if (value === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "low") return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
}

export default async function RunAuditPage({ params }: PageProps) {
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
    .select("id, project_id, score, status, created_at")
    .eq("project_id", currentProject.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const auditList = (audits || []) as AuditRow[];
  const latestAudit = auditList[0] || null;

  const { data: issues } = latestAudit
    ? await supabase
        .from("audit_issues")
        .select("id, audit_id, title, description, severity, recommendation, created_at")
        .eq("audit_id", latestAudit.id)
        .order("created_at", { ascending: false })
        .limit(6)
    : { data: [] };

  const issueList = (issues || []) as AuditIssue[];

  const highIssues = issueList.filter(
    (i) => String(i.severity || "").toLowerCase() === "high"
  ).length;
  const mediumIssues = issueList.filter(
    (i) => String(i.severity || "").toLowerCase() === "medium"
  ).length;
  const lowIssues = issueList.filter(
    (i) => String(i.severity || "").toLowerCase() === "low"
  ).length;

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
            Run Audit
          </h1>
          <p className="text-xs text-slate-500">
            {currentProject.name} · {normalizeDomain(currentProject.domain)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/projects/${currentProject.id}/reports`}
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            Report
          </Link>
          <Link
            href={`/dashboard/projects/${currentProject.id}/recommendations`}
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            Recommendations
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
            {latestAudit ? "Latest scan saved" : "No audit yet"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            High Issues
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {highIssues}
          </p>
          <p className="mt-1 text-xs text-slate-500">From latest scan</p>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Other Issues
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {mediumIssues + lowIssues}
          </p>
          <p className="mt-1 text-xs text-slate-500">Medium and low</p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <AuditRunner
            projectId={currentProject.id}
            projectName={currentProject.name}
            projectDomain={currentProject.domain}
          />

          {/* Latest issues */}
          <div className="rounded-2xl border border-[#e6dcc8] bg-white">
            <div className="border-b border-[#eee5d4] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                Latest Issues
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-950">
                What the last scan found
              </p>
            </div>

            {issueList.length === 0 ? (
              <div className="p-5">
                <div className="rounded-xl border border-dashed border-[#d4af37]/40 bg-[#fff8df] p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    No issues loaded yet.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Run a full audit to generate technical SEO findings.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#eee5d4]">
                {issueList.map((issue) => (
                  <div key={issue.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950">
                          {issue.title || "SEO issue"}
                        </p>
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
                          {issue.description ||
                            "Review this item and apply the recommended fix."}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${getSeverityClass(issue.severity)}`}
                      >
                        {issue.severity || "issue"}
                      </span>
                    </div>

                    {issue.recommendation ? (
                      <div className="mt-3 rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Recommendation
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {issue.recommendation}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — how it works */}
        <div className="rounded-2xl border border-[#2b2413] bg-[#111111] text-white">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
              Audit Flow
            </p>
            <p className="mt-0.5 text-sm font-bold text-white">
              What happens here
            </p>
          </div>
          <div className="space-y-2 p-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-semibold text-white">
                1. Run full audit
              </p>
              <p className="mt-1 text-[11px] leading-4 text-slate-400">
                Checks technical SEO basics and requests PageSpeed data.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-semibold text-white">
                2. Review findings
              </p>
              <p className="mt-1 text-[11px] leading-4 text-slate-400">
                Issues are saved with severity and recommendations.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-semibold text-white">
                3. Export report
              </p>
              <p className="mt-1 text-[11px] leading-4 text-slate-400">
                Use the report page for a client-ready summary.
              </p>
            </div>

            <div className="mt-2 space-y-2 pt-1">
              <Link
                href={`/dashboard/projects/${currentProject.id}/reports`}
                className="flex h-9 items-center justify-center rounded-xl bg-[#d4af37] text-xs font-semibold text-black transition hover:bg-[#c9a42e]"
              >
                Open Report
              </Link>
              <Link
                href={`/dashboard/projects/${currentProject.id}`}
                className="flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Back to Overview
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}