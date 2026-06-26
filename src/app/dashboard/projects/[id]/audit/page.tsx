import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProjectOverviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type GscKeywordRow = {
  id: string;
  query: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
};

type AuditIssue = {
  id: string;
  severity: string | null;
};

function normalizeDomainForDisplay(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

function normalizeUrl(domain: string) {
  const trimmed = domain.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "No data yet";
  }

  return new Date(date).toLocaleDateString();
}

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function formatCtr(ctr: number | null | undefined) {
  if (ctr === null || ctr === undefined) {
    return "--";
  }

  return `${(Number(ctr) * 100).toFixed(1)}%`;
}

function formatPosition(position: number | null | undefined) {
  if (position === null || position === undefined) {
    return "--";
  }

  return Number(position).toFixed(1);
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

function getScoreBadgeClass(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
  }

  if (score >= 70) {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function getHealthSummary(
  seoScore: number | null | undefined,
  issueCount: number,
  keywordCount: number
) {
  if (seoScore === null || seoScore === undefined) {
    return "Run the first audit to generate SEO score, technical findings, and reporting data.";
  }

  if (seoScore >= 90 && issueCount <= 2 && keywordCount > 0) {
    return "This project has a strong SEO foundation. Continue monitoring keyword movement and protect existing wins.";
  }

  if (seoScore >= 70) {
    return "This project has a workable SEO foundation. Fix technical issues and improve pages with keyword opportunities.";
  }

  return "This project needs attention. Start with high-priority audit issues before scaling keyword and content work.";
}

function getLatestKeywordRange(rows: GscKeywordRow[]) {
  const latestRow = [...rows].sort((a, b) => {
    const aDate = new Date(a.created_at || a.end_date || 0).getTime();
    const bDate = new Date(b.created_at || b.end_date || 0).getTime();

    return bDate - aDate;
  })[0];

  if (!latestRow?.start_date || !latestRow?.end_date) {
    return null;
  }

  return {
    startDate: latestRow.start_date,
    endDate: latestRow.end_date,
  };
}

function getLatestKeywordRows(rows: GscKeywordRow[]) {
  const latestRange = getLatestKeywordRange(rows);

  if (!latestRange) {
    return [];
  }

  return rows.filter((row) => {
    return (
      row.start_date === latestRange.startDate &&
      row.end_date === latestRange.endDate
    );
  });
}

function getTopKeyword(rows: GscKeywordRow[]) {
  return [...rows].sort((a, b) => {
    const impressionsDiff =
      Number(b.impressions || 0) - Number(a.impressions || 0);

    if (impressionsDiff !== 0) {
      return impressionsDiff;
    }

    return Number(a.position || 999) - Number(b.position || 999);
  })[0];
}

export default async function ProjectOverviewPage({
  params,
}: ProjectOverviewPageProps) {
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

  const { data: latestAudit } = await supabase
    .from("audits")
    .select("id, score, status, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestPageSpeedReport } = await supabase
    .from("pagespeed_reports")
    .select(
      "id, performance_score, accessibility_score, best_practices_score, seo_score, created_at"
    )
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

  const { data: gscKeywordRows } = await supabase
    .from("gsc_keyword_rows")
    .select(
      "id, query, clicks, impressions, ctr, position, start_date, end_date, created_at"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const issueList = (issues || []) as AuditIssue[];
  const allKeywordRows = (gscKeywordRows || []) as GscKeywordRow[];
  const keywordList = getLatestKeywordRows(allKeywordRows);

  const seoScore = latestPageSpeedReport?.seo_score ?? latestAudit?.score;
  const performanceScore = latestPageSpeedReport?.performance_score;
  const accessibilityScore = latestPageSpeedReport?.accessibility_score;
  const bestPracticesScore = latestPageSpeedReport?.best_practices_score;

  const highIssues = issueList.filter((issue) => issue.severity === "high")
    .length;

  const mediumIssues = issueList.filter((issue) => issue.severity === "medium")
    .length;

  const issueCount = issueList.length;

  const totalClicks = keywordList.reduce((sum, keyword) => {
    return sum + Number(keyword.clicks || 0);
  }, 0);

  const totalImpressions = keywordList.reduce((sum, keyword) => {
    return sum + Number(keyword.impressions || 0);
  }, 0);

  const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : null;

  const averagePosition =
    keywordList.length > 0
      ? keywordList.reduce((sum, keyword) => {
          return sum + Number(keyword.position || 0);
        }, 0) / keywordList.length
      : null;

  const opportunityKeywords = keywordList.filter((keyword) => {
    const position = Number(keyword.position || 0);

    return position >= 4 && position <= 15;
  });

  const lowCtrKeywords = keywordList.filter((keyword) => {
    const impressions = Number(keyword.impressions || 0);
    const clicks = Number(keyword.clicks || 0);
    const ctr = Number(keyword.ctr || 0);

    return impressions >= 10 && (clicks === 0 || ctr < 0.02);
  });

  const topKeyword = getTopKeyword(keywordList);

  const latestScanDate =
    latestAudit?.created_at || latestPageSpeedReport?.created_at || null;

  const projectUrl = normalizeUrl(project.domain);

  const workflowCards = [
    {
      title: "Run SEO Audit",
      description:
        "Scan the website for metadata, headings, canonical, mobile, and technical SEO issues.",
      href: `/dashboard/projects/${project.id}/audit`,
      label: latestAudit ? "Run New Audit" : "Start Audit",
      stat: latestAudit ? `Last scan: ${formatDate(latestScanDate)}` : "No audit yet",
    },
    {
      title: "Review Keywords",
      description:
        "Check Google Search Console keyword clicks, impressions, CTR, and average position.",
      href: `/dashboard/projects/${project.id}/keywords`,
      label: "View Keywords",
      stat: `${keywordList.length} tracked keywords`,
    },
    {
      title: "Export Report",
      description:
        "Open the compact client-ready SEO report with scores, issues, keyword data, and action plan.",
      href: `/dashboard/projects/${project.id}/reports`,
      label: "View Report",
      stat: seoScore ? `SEO score: ${seoScore}` : "Report needs audit data",
    },
    {
      title: "Recommendations",
      description:
        "See prioritized action cards based on audit issues and Search Console keyword opportunities.",
      href: `/dashboard/projects/${project.id}/recommendations`,
      label: "View Actions",
      stat: `${highIssues + mediumIssues + opportunityKeywords.length + lowCtrKeywords.length} possible actions`,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[#e6dcc8] bg-white shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-[#d4af37]/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-slate-100 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                Project Overview
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {project.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href={projectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-[#9a7a19] hover:underline"
                >
                  {normalizeDomainForDisplay(project.domain)}
                </a>

                <span className="rounded-full border border-[#e6dcc8] bg-[#faf7ef] px-2.5 py-1 text-xs font-medium text-slate-600">
                  Created {formatDate(project.created_at)}
                </span>
              </div>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">
                {getHealthSummary(seoScore, issueCount, keywordList.length)}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={`/dashboard/projects/${project.id}/audit`}>
                    Run Audit
                  </Link>
                </Button>

                <Button asChild variant="outline">
                  <Link href={`/dashboard/projects/${project.id}/reports`}>
                    View Report
                  </Link>
                </Button>

                <Button asChild variant="outline">
                  <Link href={`/dashboard/projects/${project.id}/recommendations`}>
                    Recommendations
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-[#2b2413] bg-[#111111] p-5 text-white shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b6a46a]">
                    Overall SEO Score
                  </p>
                  <p className="mt-2 text-5xl font-bold tracking-tight text-white">
                    {seoScore ?? "--"}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getScoreBadgeClass(
                    seoScore
                  )}`}
                >
                  {getScoreStatus(seoScore)}
                </span>
              </div>

              <div className="mt-5 grid gap-2 text-sm">
                <div className="flex justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 p-3">
                  <span className="text-slate-400">Latest Audit</span>
                  <span className="text-right font-semibold text-white">
                    {formatDate(latestScanDate)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 p-3">
                  <span className="text-slate-400">Issues Found</span>
                  <span className="font-semibold text-white">{issueCount}</span>
                </div>

                <div className="flex justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 p-3">
                  <span className="text-slate-400">Keywords</span>
                  <span className="font-semibold text-white">
                    {keywordList.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "SEO Score",
            value: seoScore ?? "--",
            helper: getScoreStatus(seoScore),
            className: "border-[#e6dcc8] bg-white",
          },
          {
            label: "Performance",
            value: performanceScore ?? "--",
            helper: getScoreStatus(performanceScore),
            className: "border-[#e6dcc8] bg-white",
          },
          {
            label: "Accessibility",
            value: accessibilityScore ?? "--",
            helper: getScoreStatus(accessibilityScore),
            className: "border-[#e6dcc8] bg-white",
          },
          {
            label: "Best Practices",
            value: bestPracticesScore ?? "--",
            helper: getScoreStatus(bestPracticesScore),
            className: "border-[#e6dcc8] bg-white",
          },
        ].map((item) => (
          <Card
            key={item.label}
            className={`rounded-2xl shadow-sm ${item.className}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {item.label}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-4xl font-bold tracking-tight text-slate-950">
                {item.value}
              </p>

              <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Total Issues",
            value: issueCount,
            helper: "Latest audit findings",
            className: "border-[#e6dcc8] bg-white",
          },
          {
            label: "High Priority",
            value: highIssues,
            helper: "Fix first",
            className: "border-red-200 bg-red-50",
          },
          {
            label: "Impressions",
            value: formatNumber(totalImpressions),
            helper: "Latest GSC sync",
            className: "border-[#d4af37]/50 bg-[#fff8df]",
          },
          {
            label: "Average CTR",
            value: formatCtr(averageCtr),
            helper: "Search click rate",
            className: "border-[#e6dcc8] bg-[#faf7ef]",
          },
        ].map((item) => (
          <Card
            key={item.label}
            className={`rounded-2xl shadow-sm ${item.className}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {item.label}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-4xl font-bold tracking-tight text-slate-950">
                {item.value}
              </p>

              <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {workflowCards.map((card) => (
          <Card
            key={card.title}
            className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardContent className="flex h-full flex-col p-5">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] text-sm font-bold text-[#7a5b00]">
                {card.title.slice(0, 1)}
              </div>

              <h2 className="text-lg font-bold tracking-tight text-slate-950">
                {card.title}
              </h2>

              <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                {card.description}
              </p>

              <div className="mt-5 rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-3">
                <p className="text-xs font-medium text-slate-500">
                  {card.stat}
                </p>
              </div>

              <Button asChild className="mt-4 w-full">
                <Link href={card.href}>{card.label}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-950">
              Next Best Action
            </CardTitle>
          </CardHeader>

          <CardContent>
            {seoScore === null || seoScore === undefined ? (
              <div className="rounded-2xl border border-dashed border-[#d4af37]/50 bg-[#faf7ef] p-5">
                <p className="font-semibold text-slate-950">
                  Run the first audit
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Start with an SEO audit so the project can generate issues,
                  scores, recommendations, and a client report.
                </p>

                <Button asChild className="mt-4">
                  <Link href={`/dashboard/projects/${project.id}/audit`}>
                    Run Audit
                  </Link>
                </Button>
              </div>
            ) : highIssues > 0 ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <p className="font-semibold text-red-700">
                  Fix high-priority SEO issues
                </p>
                <p className="mt-2 text-sm leading-6 text-red-700/80">
                  The latest audit found {highIssues} high-priority issue(s).
                  Review Recommendations and resolve these before scaling
                  keyword or content work.
                </p>

                <Button asChild className="mt-4">
                  <Link
                    href={`/dashboard/projects/${project.id}/recommendations`}
                  >
                    View Recommendations
                  </Link>
                </Button>
              </div>
            ) : opportunityKeywords.length > 0 || lowCtrKeywords.length > 0 ? (
              <div className="rounded-2xl border border-[#d4af37]/50 bg-[#fff8df] p-5">
                <p className="font-semibold text-[#7a5b00]">
                  Improve keyword opportunities
                </p>
                <p className="mt-2 text-sm leading-6 text-[#7a5b00]/80">
                  This project has keywords with visibility. Improve close
                  rankings, weak CTR, and pages already getting impressions.
                </p>

                <Button asChild className="mt-4">
                  <Link href={`/dashboard/projects/${project.id}/keywords`}>
                    View Keywords
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-5">
                <p className="font-semibold text-slate-950">
                  Keep monitoring this project
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  The project is ready for ongoing tracking. Sync keyword data
                  and rerun audits after website updates.
                </p>

                <Button asChild className="mt-4">
                  <Link href={`/dashboard/projects/${project.id}/reports`}>
                    View Report
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-950">
              Keyword Snapshot
            </CardTitle>
          </CardHeader>

          <CardContent>
            {topKeyword ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Top keyword by impressions
                  </p>

                  <p className="mt-2 text-lg font-bold text-slate-950">
                    {topKeyword.query}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
                    <p className="text-xs text-slate-500">Clicks</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {formatNumber(topKeyword.clicks)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
                    <p className="text-xs text-slate-500">Impressions</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {formatNumber(topKeyword.impressions)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
                    <p className="text-xs text-slate-500">CTR</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {formatCtr(topKeyword.ctr)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
                    <p className="text-xs text-slate-500">Position</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {formatPosition(topKeyword.position)}
                    </p>
                  </div>
                </div>

                <p className="text-sm leading-6 text-slate-500">
                  Average project position is{" "}
                  <span className="font-semibold text-slate-950">
                    {formatPosition(averagePosition)}
                  </span>
                  . Use the Keywords page to find CTR gaps and near-page-one
                  opportunities.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d4af37]/50 bg-[#faf7ef] p-5">
                <p className="font-semibold text-slate-950">
                  No keyword data yet
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Connect or sync Google Search Console data so this project can
                  show keyword clicks, impressions, CTR, and ranking position.
                </p>

                <Button asChild className="mt-4" variant="outline">
                  <Link href={`/dashboard/projects/${project.id}/keywords`}>
                    View Keywords
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}