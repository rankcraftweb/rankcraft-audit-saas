import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuditRunner from "./audit-runner";
import { Button } from "@/components/ui/button";
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
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  if (score >= 90) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (score >= 70) {
    return "border-amber-200 bg-amber-50 text-amber-700";
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
    .single();

  const { data: latestAudit } = await supabase
    .from("audits")
    .select("id, score, status, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: issues } = latestAudit?.id
    ? await supabase
        .from("audit_issues")
        .select("id, severity")
        .eq("audit_id", latestAudit.id)
    : { data: [] };

  const issueList = issues || [];

  const highIssues = issueList.filter(
    (issue: AuditIssue) => issue.severity === "high"
  ).length;

  const mediumIssues = issueList.filter(
    (issue: AuditIssue) => issue.severity === "medium"
  ).length;

  const lowIssues = issueList.filter(
    (issue: AuditIssue) => issue.severity === "low"
  ).length;

  const seoScore = latestPageSpeedReport?.seo_score ?? latestAudit?.score;
  const performanceScore = latestPageSpeedReport?.performance_score;
  const accessibilityScore = latestPageSpeedReport?.accessibility_score;
  const bestPracticesScore = latestPageSpeedReport?.best_practices_score;
  const latestScanDate =
    latestAudit?.created_at || latestPageSpeedReport?.created_at || null;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/80">
              SEO Audit Runner
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Run a fresh SEO audit.
              </h1>

              <p className="text-base text-slate-300">
                {project.name} · {normalizeDomainForDisplay(project.domain)}
              </p>

              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                Scan the website for technical SEO issues, PageSpeed scores,
                on-page metadata gaps, and report-ready recommendations.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="rounded-xl bg-white text-slate-950 hover:bg-slate-100"
              >
                <Link href={`/dashboard/projects/${project.id}`}>
                  Project Overview
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={`/dashboard/projects/${project.id}/history`}>
                  Audit History
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={`/dashboard/projects/${project.id}/reports`}>
                  Client Report
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-slate-300">Latest SEO Score</p>

            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="text-6xl font-bold">{seoScore ?? "--"}</p>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getScoreBadgeClass(
                  seoScore
                )}`}
              >
                {getScoreLabel(seoScore)}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-slate-400">Issues</p>
                <p className="mt-1 text-xl font-semibold">
                  {issueList.length}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-slate-400">Performance</p>
                <p className="mt-1 text-xl font-semibold">
                  {performanceScore ?? "--"}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-slate-400">Status</p>
                <p className="mt-1 text-xl font-semibold capitalize">
                  {latestAudit?.status || "Ready"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              SEO Score
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {seoScore ?? "--"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {getScoreLabel(seoScore)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Performance
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {performanceScore ?? "--"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {getScoreLabel(performanceScore)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Accessibility
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {accessibilityScore ?? "--"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {getScoreLabel(accessibilityScore)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Best Practices
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {bestPracticesScore ?? "--"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {getScoreLabel(bestPracticesScore)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <AuditRunner
          projectId={project.id}
          projectName={project.name}
          projectDomain={project.domain}
        />

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Audit Snapshot</CardTitle>
            <p className="text-sm text-slate-500">
              Latest scan status and issue breakdown.
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Latest Scan</p>
              <p className="mt-1 font-medium text-slate-950">
                {formatDate(latestScanDate)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">High</p>
                <p className="mt-1 text-2xl font-bold text-red-900">
                  {highIssues}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-700">Medium</p>
                <p className="mt-1 text-2xl font-bold text-amber-900">
                  {mediumIssues}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Low</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {lowIssues}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-medium text-slate-950">
                What this audit checks
              </p>

              <div className="mt-3 grid gap-2 text-sm text-slate-500">
                <p>• Title tag and metadata quality</p>
                <p>• PageSpeed and Lighthouse scores</p>
                <p>• SEO score and technical issues</p>
                <p>• Report-ready recommendations</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={`/dashboard/projects/${project.id}/history`}>
                  View History
                </Link>
              </Button>

              <Button asChild variant="outline" className="rounded-xl">
                <Link href={`/dashboard/projects/${project.id}/reports`}>
                  View Report
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}