import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuditRunner from "./audit-runner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type AuditIssue = {
  id: string;
  severity: string | null;
};

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "No scan yet";
  }

  return new Date(date).toLocaleString();
}

function normalizeDomainForDisplay(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
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

export default async function AuditPage({ params }: AuditPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, domain, created_at")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const { data: latestPageSpeedReport } = await supabase
    .from("pagespeed_reports")
    .select(
      "id, performance_score, accessibility_score, best_practices_score, seo_score, created_at"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestAudit } = await supabase
    .from("audits")
    .select("id, score, status, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: issues } = latestAudit?.id
    ? await supabase
        .from("audit_issues")
        .select("id, severity")
        .eq("audit_id", latestAudit.id)
    : { data: [] };

  const issueList = (issues || []) as AuditIssue[];

  const highIssues = issueList.filter((issue) => {
    return issue.severity === "high";
  }).length;

  const mediumIssues = issueList.filter((issue) => {
    return issue.severity === "medium";
  }).length;

  const lowIssues = issueList.filter((issue) => {
    return issue.severity === "low";
  }).length;

  const seoScore = latestPageSpeedReport?.seo_score ?? latestAudit?.score;
  const performanceScore = latestPageSpeedReport?.performance_score;
  const accessibilityScore = latestPageSpeedReport?.accessibility_score;
  const bestPracticesScore = latestPageSpeedReport?.best_practices_score;
  const latestScanDate =
    latestAudit?.created_at || latestPageSpeedReport?.created_at || null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e6dcc8] bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex rounded-full border border-[#d4af37]/40 bg-[#fff8df] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a5b00]">
              SEO Audit Runner
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Run a fresh SEO audit
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-600">
                {project.name} · {normalizeDomainForDisplay(project.domain)}
              </p>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Scan the website for technical SEO issues, PageSpeed scores,
                metadata gaps, and report-ready recommendations.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2b2413] bg-[#111111] p-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b6a46a]">
                  Latest SEO Score
                </p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-white">
                  {seoScore ?? "--"}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getScoreBadgeClass(
                  seoScore
                )}`}
              >
                {getScoreLabel(seoScore)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                {
                  label: "Issues",
                  value: issueList.length,
                },
                {
                  label: "Perf.",
                  value: performanceScore ?? "--",
                },
                {
                  label: "Status",
                  value: latestAudit?.status || "Ready",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-white/10 p-3"
                >
                  <p className="text-[11px] text-slate-400">{item.label}</p>
                  <p className="mt-1 truncate text-lg font-bold capitalize text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "SEO Score",
            value: seoScore ?? "--",
            helper: getScoreLabel(seoScore),
          },
          {
            label: "Performance",
            value: performanceScore ?? "--",
            helper: getScoreLabel(performanceScore),
          },
          {
            label: "Accessibility",
            value: accessibilityScore ?? "--",
            helper: getScoreLabel(accessibilityScore),
          },
          {
            label: "Best Practices",
            value: bestPracticesScore ?? "--",
            helper: getScoreLabel(bestPracticesScore),
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

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <AuditRunner
          projectId={project.id}
          projectName={project.name}
          projectDomain={project.domain}
        />

        <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-950">
              Audit Snapshot
            </CardTitle>
            <p className="text-sm text-slate-500">
              Latest scan status and issue breakdown.
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Latest Scan
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {formatDate(latestScanDate)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">
                  High
                </p>
                <p className="mt-1 text-2xl font-bold text-red-900">
                  {highIssues}
                </p>
              </div>

              <div className="rounded-2xl border border-[#d4af37]/50 bg-[#fff8df] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a5b00]">
                  Medium
                </p>
                <p className="mt-1 text-2xl font-bold text-[#7a5b00]">
                  {mediumIssues}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Low
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {lowIssues}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
              <p className="font-semibold text-slate-950">
                What this audit checks
              </p>

              <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-500">
                <p>• Title tag and metadata quality</p>
                <p>• PageSpeed and Lighthouse scores</p>
                <p>• SEO score and technical issues</p>
                <p>• Report-ready recommendations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}