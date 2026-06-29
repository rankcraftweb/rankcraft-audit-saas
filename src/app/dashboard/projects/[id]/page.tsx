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

type KeywordRow = {
  id: string;
  project_id: string;
  query?: string | null;
  page?: string | null;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
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

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function formatPosition(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return Number(value).toFixed(1);
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

export default async function ProjectOverviewPage({ params }: PageProps) {
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
    .order("created_at", { ascending: false });

  const auditList = (audits || []) as AuditRow[];
  const latestAudit = auditList[0] || null;

  const { data: keywordRows } = await supabase
    .from("gsc_keyword_rows")
    .select("id, project_id, query, page, clicks, impressions, ctr, position, created_at")
    .eq("project_id", currentProject.id)
    .order("impressions", { ascending: false })
    .limit(5);

  const keywordList = (keywordRows || []) as KeywordRow[];

  const totalClicks = keywordList.reduce((sum, keyword) => {
    return sum + Number(keyword.clicks || 0);
  }, 0);

  const totalImpressions = keywordList.reduce((sum, keyword) => {
    return sum + Number(keyword.impressions || 0);
  }, 0);

  const averagePosition =
    keywordList.length > 0
      ? keywordList.reduce((sum, keyword) => {
          return sum + Number(keyword.position || 0);
        }, 0) / keywordList.length
      : null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e6dcc8] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/projects">← Back to SEO Audit</Link>
            </Button>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Overview
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {currentProject.name}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {normalizeDomain(currentProject.domain)}
            </p>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
              Review the current audit status, keyword data, and next actions
              for this website.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
            <Button asChild>
              <Link href={`/dashboard/projects/${currentProject.id}/audit`}>
                Run Audit
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${currentProject.id}/reports`}>
                Report
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
              {latestAudit ? "Audit data available" : "Run your first audit"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Impressions
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {formatNumber(totalImpressions)}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              From latest keyword rows
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Avg. Position
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {formatPosition(averagePosition)}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Based on visible keyword data
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-4 border-b border-[#eee5d4] p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                Workflow
              </p>

              <CardTitle className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                Continue audit work
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="grid gap-3 p-5 md:grid-cols-2 md:p-6">
            <Link
              href={`/dashboard/projects/${currentProject.id}/audit`}
              className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-5 transition hover:border-[#d4af37]/60 hover:bg-[#fff8df]"
            >
              <p className="text-sm font-bold text-slate-950">Run Audit</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Scan the website for technical SEO issues and generate a score.
              </p>
            </Link>

            <Link
              href={`/dashboard/projects/${currentProject.id}/keywords`}
              className="rounded-2xl border border-[#e6dcc8] bg-white p-5 transition hover:border-[#d4af37]/60 hover:bg-[#fff8df]"
            >
              <p className="text-sm font-bold text-slate-950">Keywords</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review Google Search Console keyword rows and search visibility.
              </p>
            </Link>

            <Link
              href={`/dashboard/projects/${currentProject.id}/reports`}
              className="rounded-2xl border border-[#e6dcc8] bg-white p-5 transition hover:border-[#d4af37]/60 hover:bg-[#fff8df]"
            >
              <p className="text-sm font-bold text-slate-950">Report</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Open a compact client-ready report for review or printing.
              </p>
            </Link>

            <Link
              href={`/dashboard/projects/${currentProject.id}/recommendations`}
              className="rounded-2xl border border-[#e6dcc8] bg-white p-5 transition hover:border-[#d4af37]/60 hover:bg-[#fff8df]"
            >
              <p className="text-sm font-bold text-slate-950">
                Recommendations
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review prioritized next actions based on audit and keyword data.
              </p>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[#e6dcc8] bg-[#111111] text-white shadow-sm">
          <CardHeader className="border-b border-white/10 p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
              Summary
            </p>

            <CardTitle className="mt-2 text-xl font-bold tracking-tight text-white">
              Current status
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 p-5 md:p-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Audit</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {latestAudit
                  ? `Last audit score is ${latestAudit.score ?? "--"}.`
                  : "No audit has been run yet."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Search data</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {keywordList.length > 0
                  ? `${keywordList.length} keyword rows loaded with ${formatNumber(
                      totalClicks
                    )} clicks and ${formatNumber(totalImpressions)} impressions.`
                  : "No keyword rows loaded yet."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Next step</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Run an audit first, then review keywords, export the report, and
                work through recommendations.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}