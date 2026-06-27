import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  ctr: number | null;
  position: number | null;
  created_at: string | null;
};

type DashboardWebsite = {
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

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
          .select(
            "id, project_id, clicks, impressions, ctr, position, created_at"
          )
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const auditList = (audits || []) as AuditRow[];
  const keywordList = (keywordRows || []) as KeywordRow[];

  const dashboardWebsites: DashboardWebsite[] = projectList.map((project) => {
    const projectAudits = auditList.filter((audit) => {
      return audit.project_id === project.id;
    });

    const latestAudit = projectAudits[0] || null;

    const projectKeywords = keywordList.filter((keyword) => {
      return keyword.project_id === project.id;
    });

    const totalImpressions = projectKeywords.reduce((sum, keyword) => {
      return sum + Number(keyword.impressions || 0);
    }, 0);

    return {
      project,
      latestAudit,
      keywordCount: projectKeywords.length,
      totalImpressions,
    };
  });

  const totalProjects = dashboardWebsites.length;

  const scannedProjects = dashboardWebsites.filter((item) => {
    return item.latestAudit;
  }).length;

  const averageSeoScore =
    scannedProjects > 0
      ? Math.round(
          dashboardWebsites.reduce((sum, item) => {
            return sum + Number(item.latestAudit?.score || 0);
          }, 0) / scannedProjects
        )
      : null;

  const totalKeywordRows = dashboardWebsites.reduce((sum, item) => {
    return sum + item.keywordCount;
  }, 0);

  const totalImpressions = dashboardWebsites.reduce((sum, item) => {
    return sum + item.totalImpressions;
  }, 0);

  const recentWebsites = dashboardWebsites.slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e6dcc8] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Dashboard
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              SEO audit control center
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Add client websites, review audit activity, and jump into the SEO
              audit workflow when you are ready to scan, review, and report.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
            <Button asChild>
              <Link href="/dashboard/projects/new">Add Project</Link>
            </Button>

            <Button asChild variant="outline">
              <Link href="/dashboard/projects">SEO Audit</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Projects
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {totalProjects}
            </p>

            <p className="mt-2 text-sm text-slate-500">Client websites added</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#d4af37]/40 bg-[#fff8df] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
              Scanned
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {scannedProjects}
            </p>

            <p className="mt-2 text-sm text-[#7a5b00]/80">With audit results</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Avg. SEO Score
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {averageSeoScore ?? "--"}
            </p>

            <p className="mt-2 text-sm text-slate-500">Across scanned sites</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Search Data
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {formatNumber(totalKeywordRows)}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {formatNumber(totalImpressions)} impressions
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-4 border-b border-[#eee5d4] p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                Recent Websites
              </p>

              <CardTitle className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                Continue audit work
              </CardTitle>
            </div>

            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/projects">View SEO Audit</Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {recentWebsites.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                  No projects yet
                </p>

                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                  Add your first client website.
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                  After adding a project, you can run audits, review keyword
                  data, and export client-ready reports.
                </p>

                <Button asChild className="mt-6">
                  <Link href="/dashboard/projects/new">Add Project</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#eee5d4]">
                {recentWebsites.map((item) => {
                  const project = item.project;
                  const score = item.latestAudit?.score ?? null;

                  return (
                    <div
                      key={project.id}
                      className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getScoreClass(
                              score
                            )}`}
                          >
                            {getScoreLabel(score)}
                          </span>

                          <span className="rounded-full border border-[#e6dcc8] bg-[#faf7ef] px-3 py-1 text-xs font-medium text-slate-600">
                            Last scan {formatDate(item.latestAudit?.created_at)}
                          </span>
                        </div>

                        <h3 className="mt-3 truncate text-lg font-bold text-slate-950">
                          {project.name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {normalizeDomain(project.domain)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <Button asChild size="sm">
                          <Link href={`/dashboard/projects/${project.id}`}>
                            Overview
                          </Link>
                        </Button>

                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/projects/${project.id}/audit`}>
                            Run Audit
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[#e6dcc8] bg-[#111111] text-white shadow-sm">
          <CardHeader className="border-b border-white/10 p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
              Workflow
            </p>

            <CardTitle className="mt-2 text-xl font-bold tracking-tight text-white">
              How to use RankCraft Audit
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 p-5 md:p-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">1. Add Project</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Add the client website from the Dashboard.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                2. Open SEO Audit
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Open the audit workflow and choose the website you want to work
                on.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                3. Run, review, report
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Run audits, review keywords, export reports, and follow the
                recommendations.
              </p>
            </div>

            <Button asChild className="w-full">
              <Link href="/dashboard/projects/new">Add Project</Link>
            </Button>

            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/dashboard/projects">Open SEO Audit</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}