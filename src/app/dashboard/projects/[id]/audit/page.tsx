import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AuditRunner from "./audit-runner";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
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
  if (!date) {
    return "No scan yet";
  }

  return new Date(date).toLocaleDateString();
}

function getScoreLabel(score: number | null | undefined) {
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

function getScoreClass(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
  }

  if (score >= 90) {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  if (score >= 70) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function getSeverityClass(severity: string | null | undefined) {
  const value = String(severity || "").toLowerCase();

  if (value === "high") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (value === "low") {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
}

export default async function RunAuditPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, domain, created_at, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    notFound();
  }

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
        .select(
          "id, audit_id, title, description, severity, recommendation, created_at"
        )
        .eq("audit_id", latestAudit.id)
        .order("created_at", { ascending: false })
        .limit(6)
    : { data: [] };

  const issueList = (issues || []) as AuditIssue[];

  const highIssues = issueList.filter((issue) => {
    return String(issue.severity || "").toLowerCase() === "high";
  }).length;

  const mediumIssues = issueList.filter((issue) => {
    return String(issue.severity || "").toLowerCase() === "medium";
  }).length;

  const lowIssues = issueList.filter((issue) => {
    return String(issue.severity || "").toLowerCase() === "low";
  }).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e6dcc8] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/projects/${currentProject.id}`}>
                ← Back to Overview
              </Link>
            </Button>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Run Audit
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Technical SEO scan
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {currentProject.name} · {normalizeDomain(currentProject.domain)}
            </p>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
              Run a fresh scan to update the SEO score, technical issues,
              PageSpeed data, and report summary for this website.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${currentProject.id}/reports`}>
                Report
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link
                href={`/dashboard/projects/${currentProject.id}/recommendations`}
              >
                Recommendations
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              SEO Score
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {latestAudit?.score ?? "--"}
            </p>

            <span
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getScoreClass(
                latestAudit?.score
              )}`}
            >
              {getScoreLabel(latestAudit?.score)}
            </span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#d4af37]/40 bg-[#fff8df] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
              Last Audit
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-bold tracking-tight text-slate-950">
              {formatDate(latestAudit?.created_at)}
            </p>

            <p className="mt-2 text-sm text-[#7a5b00]/80">
              {latestAudit ? "Latest scan saved" : "No audit yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              High Issues
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {highIssues}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              From latest visible issues
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Other Issues
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {mediumIssues + lowIssues}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Medium and low priority
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <AuditRunner
            projectId={currentProject.id}
            projectName={currentProject.name}
            projectDomain={currentProject.domain}
          />

          <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
            <CardHeader className="border-b border-[#eee5d4] p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                Latest Issues
              </p>

              <CardTitle className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                What the last scan found
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              {issueList.length === 0 ? (
                <div className="p-6">
                  <div className="rounded-2xl border border-dashed border-[#d4af37]/50 bg-[#fff8df] p-5">
                    <p className="font-semibold text-slate-950">
                      No issues loaded yet.
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Run a full audit to generate technical SEO findings for
                      this website.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[#eee5d4]">
                  {issueList.map((issue) => (
                    <div key={issue.id} className="p-5 md:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950">
                            {issue.title || "SEO issue"}
                          </p>

                          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                            {issue.description ||
                              "Review this item and apply the recommended fix."}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getSeverityClass(
                            issue.severity
                          )}`}
                        >
                          {issue.severity || "issue"}
                        </span>
                      </div>

                      {issue.recommendation ? (
                        <div className="mt-4 rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Recommendation
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {issue.recommendation}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-[#e6dcc8] bg-[#111111] text-white shadow-sm">
          <CardHeader className="border-b border-white/10 p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
              Audit Flow
            </p>

            <CardTitle className="mt-2 text-xl font-bold tracking-tight text-white">
              What happens here
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 p-5 md:p-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                1. Run full audit
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                The app checks technical SEO basics and requests PageSpeed data.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                2. Review findings
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Issues are saved with severity and recommendations.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                3. Export report
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Use the report page after running the scan to show the latest
                client-ready summary.
              </p>
            </div>

            <Button asChild className="w-full">
              <Link href={`/dashboard/projects/${currentProject.id}/reports`}>
                Open Report
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href={`/dashboard/projects/${currentProject.id}`}>
                Back to Overview
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}