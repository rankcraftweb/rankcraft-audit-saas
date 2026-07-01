import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AuditDetailPageProps = {
  params: Promise<{
    id: string;
    auditId: string;
  }>;
};

type Project = {
  id: string;
  name: string;
  domain: string;
};

type Audit = {
  id: string;
  project_id: string;
  score: number | null;
  status: string | null;
  created_at: string;
};

type AuditIssue = {
  id: string;
  title: string;
  description: string | null;
  severity: string | null;
  category: string | null;
  recommendation: string | null;
  created_at: string;
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

function getSeverityClass(severity: string | null | undefined) {
  const value = String(severity || "").toLowerCase();
  if (value === "high") return "border-red-200 bg-red-50 text-red-700";
  if (value === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "low") return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
}

export default async function AuditDetailPage({ params }: AuditDetailPageProps) {
  const { id, auditId } = await params;
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

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .select("id, project_id, score, status, created_at")
    .eq("id", auditId)
    .eq("project_id", currentProject.id)
    .single();

  if (auditError || !audit) notFound();

  const currentAudit = audit as Audit;

  const { data: issues } = await supabase
    .from("audit_issues")
    .select("id, title, description, severity, category, recommendation, created_at")
    .eq("audit_id", currentAudit.id)
    .order("created_at", { ascending: true });

  const issueList = (issues || []) as AuditIssue[];

  const highIssues = issueList.filter((i) => i.severity === "high").length;
  const mediumIssues = issueList.filter((i) => i.severity === "medium").length;
  const lowIssues = issueList.filter((i) => i.severity === "low").length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/dashboard/projects/${currentProject.id}/history`}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            ← History
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Audit details
          </h1>
          <p className="text-xs text-slate-500">
            {currentProject.name} · {normalizeDomain(currentProject.domain)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/projects/${currentProject.id}/audit`}
            className="inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black"
          >
            Run New Audit
          </Link>
          <Link
            href={`/dashboard/projects/${currentProject.id}`}
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            Overview
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Audit Date
          </p>
          <p className="mt-2 text-sm font-bold tracking-tight text-slate-950">
            {formatDate(currentAudit.created_at)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
            Status
          </p>
          <p className="mt-2 text-xl font-bold tracking-tight capitalize text-slate-950">
            {currentAudit.status || "completed"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            SEO Score
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {currentAudit.score ?? "--"}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getScoreBadgeClass(currentAudit.score)}`}
          >
            {getScoreStatus(currentAudit.score)}
          </span>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Issues Found
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {issueList.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {highIssues} high · {mediumIssues} medium · {lowIssues} low
          </p>
        </div>
      </div>

      {/* Issues list */}
      <div className="rounded-2xl border border-[#e6dcc8] bg-white">
        <div className="border-b border-[#eee5d4] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
            Findings
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-950">
            Detected SEO issues
          </p>
        </div>

        {issueList.length === 0 ? (
          <div className="p-5">
            <div className="rounded-xl border border-dashed border-[#d4af37]/40 bg-[#fff8df] p-4">
              <p className="text-sm font-semibold text-slate-950">
                No issues found
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                This scan did not detect any basic SEO issues.
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
                      {issue.title}
                    </p>
                    <p className="mt-0.5 text-[11px] capitalize text-slate-400">
                      {issue.category || "general"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${getSeverityClass(issue.severity)}`}
                  >
                    {issue.severity || "medium"}
                  </span>
                </div>

                <div className="mt-3 grid gap-2.5 md:grid-cols-2">
                  <div className="rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Problem
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-slate-600">
                      {issue.description || "No description available."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#d4af37]/40 bg-[#fff8df] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a5b00]">
                      Recommended Fix
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-[#7a5b00]/80">
                      {issue.recommendation ||
                        "Review this issue and apply the appropriate SEO fix."}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}