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

type WebsiteSummary = {
  website: Project;
  latestAudit: AuditRow | null;
  keywordCount: number;
  totalClicks: number;
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

function getScoreStatus(score: number | null | undefined) {
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

function getStatusClass(score: number | null | undefined) {
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

function normalizeDomain(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

export default async function SeoAuditPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: websites } = await supabase
    .from("projects")
    .select("id, name, domain, created_at, user_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const websiteList = (websites || []) as Project[];
  const websiteIds = websiteList.map((website) => website.id);

  const { data: audits } =
    websiteIds.length > 0
      ? await supabase
          .from("audits")
          .select("id, project_id, score, status, created_at")
          .in("project_id", websiteIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { data: keywordRows } =
    websiteIds.length > 0
      ? await supabase
          .from("gsc_keyword_rows")
          .select(
            "id, project_id, clicks, impressions, ctr, position, created_at"
          )
          .in("project_id", websiteIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const auditList = (audits || []) as AuditRow[];
  const keywordList = (keywordRows || []) as KeywordRow[];

  const websiteSummaries: WebsiteSummary[] = websiteList.map((website) => {
    const websiteAudits = auditList.filter((audit) => {
      return audit.project_id === website.id;
    });

    const latestAudit = websiteAudits[0] || null;

    const websiteKeywords = keywordList.filter((keyword) => {
      return keyword.project_id === website.id;
    });

    const totalClicks = websiteKeywords.reduce((sum, keyword) => {
      return sum + Number(keyword.clicks || 0);
    }, 0);

    const totalImpressions = websiteKeywords.reduce((sum, keyword) => {
      return sum + Number(keyword.impressions || 0);
    }, 0);

    return {
      website,
      latestAudit,
      keywordCount: websiteKeywords.length,
      totalClicks,
      totalImpressions,
    };
  });

  const totalWebsites = websiteSummaries.length;

  const scannedWebsites = websiteSummaries.filter((summary) => {
    return summary.latestAudit;
  }).length;

  const averageSeoScore =
    scannedWebsites > 0
      ? Math.round(
          websiteSummaries.reduce((sum, summary) => {
            return sum + Number(summary.latestAudit?.score || 0);
          }, 0) / scannedWebsites
        )
      : null;

  const totalKeywordRows = websiteSummaries.reduce((sum, summary) => {
    return sum + summary.keywordCount;
  }, 0);

  const totalImpressions = websiteSummaries.reduce((sum, summary) => {
    return sum + summary.totalImpressions;
  }, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e6dcc8] bg-white p-6 shadow-sm md:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
            SEO Audit
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Audit workflow
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Open a website workspace, run a technical audit, review keyword
            data, export a report, and work through recommendations.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Websites
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {totalWebsites}
            </p>
            <p className="mt-2 text-sm text-slate-500">Available to audit</p>
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
              {scannedWebsites}
            </p>
            <p className="mt-2 text-sm text-[#7a5b00]/80">With audit data</p>
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
              Keyword Rows
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

      <section className="space-y-4">
        {websiteSummaries.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-[#d4af37]/50 bg-white shadow-sm">
            <CardContent className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                No websites yet
              </p>

              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                Add a project from the Dashboard.
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                Once a website is added, it will appear here for audit,
                keyword, report, and recommendation work.
              </p>
            </CardContent>
          </Card>
        ) : (
          websiteSummaries.map((summary) => {
            const score = summary.latestAudit?.score ?? null;
            const website = summary.website;

            return (
              <Card
                key={website.id}
                className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm"
              >
                <CardContent className="p-5 md:p-6">
                  <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                            score
                          )}`}
                        >
                          {getScoreStatus(score)}
                        </span>

                        <span className="rounded-full border border-[#e6dcc8] bg-[#faf7ef] px-3 py-1 text-xs font-medium text-slate-600">
                          Added {formatDate(website.created_at)}
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                        {website.name}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {normalizeDomain(website.domain)}
                      </p>

                      <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                        Last scan:{" "}
                        <span className="font-semibold text-slate-950">
                          {formatDate(summary.latestAudit?.created_at)}
                        </span>
                        . Open the overview to continue the website audit
                        workflow.
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button asChild size="sm">
                          <Link href={`/dashboard/projects/${website.id}`}>
                            Overview
                          </Link>
                        </Button>

                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/projects/${website.id}/audit`}>
                            Run Audit
                          </Link>
                        </Button>

                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/dashboard/projects/${website.id}/keywords`}
                          >
                            Keywords
                          </Link>
                        </Button>

                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/projects/${website.id}/reports`}>
                            Report
                          </Link>
                        </Button>

                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/dashboard/projects/${website.id}/recommendations`}
                          >
                            Recommendations
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[440px]">
                      <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          SEO Score
                        </p>

                        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                          {score ?? "--"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Keywords
                        </p>

                        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                          {formatNumber(summary.keywordCount)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#d4af37]/50 bg-[#fff8df] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
                          Impressions
                        </p>

                        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                          {formatNumber(summary.totalImpressions)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}