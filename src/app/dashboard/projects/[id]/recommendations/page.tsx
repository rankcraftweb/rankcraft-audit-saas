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

type RecommendationsPageProps = {
  params: Promise<{
    id: string;
  }>;
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

type KeywordRecommendation = GscKeywordRow & {
  intent: string;
  status: string;
  priority: string;
  action: string;
  opportunityScore: number;
};

function getSeverityClass(severity: string | null | undefined) {
  if (severity === "high") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (severity === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getPriorityClass(priority: string) {
  if (priority === "High") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (priority === "Medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (priority === "Opportunity") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getIntentClass(intent: string) {
  if (intent === "Commercial") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  if (intent === "Informational") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }

  if (intent === "Brand") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getKeywordIntent(query: string) {
  const lowerQuery = query.toLowerCase();

  if (
    lowerQuery.includes("near me") ||
    lowerQuery.includes("services") ||
    lowerQuery.includes("consultant") ||
    lowerQuery.includes("designer") ||
    lowerQuery.includes("developer") ||
    lowerQuery.includes("agency") ||
    lowerQuery.includes("company")
  ) {
    return "Commercial";
  }

  if (
    lowerQuery.includes("how") ||
    lowerQuery.includes("what") ||
    lowerQuery.includes("guide") ||
    lowerQuery.includes("tips") ||
    lowerQuery.includes("best")
  ) {
    return "Informational";
  }

  if (
    lowerQuery.includes("rankcraft") ||
    lowerQuery.includes("rank craft") ||
    lowerQuery.includes("rankcraftweb")
  ) {
    return "Brand";
  }

  return "General";
}

function getKeywordStatus(keyword: GscKeywordRow) {
  const impressions = Number(keyword.impressions || 0);
  const clicks = Number(keyword.clicks || 0);
  const ctr = Number(keyword.ctr || 0);
  const position = Number(keyword.position || 0);

  if (position > 0 && position <= 3) {
    return "Ranking Well";
  }

  if (position > 3 && position <= 15) {
    return "Opportunity";
  }

  if (impressions >= 10 && clicks === 0) {
    return "Low CTR";
  }

  if (ctr < 0.02 && impressions >= 10) {
    return "CTR Gap";
  }

  if (position > 15 && position <= 50) {
    return "Needs Work";
  }

  return "Monitor";
}

function getKeywordPriority(keyword: GscKeywordRow) {
  const impressions = Number(keyword.impressions || 0);
  const clicks = Number(keyword.clicks || 0);
  const ctr = Number(keyword.ctr || 0);
  const position = Number(keyword.position || 0);

  if (position > 3 && position <= 15 && impressions >= 10) {
    return "High";
  }

  if (impressions >= 10 && clicks === 0) {
    return "High";
  }

  if (ctr < 0.02 && impressions >= 10) {
    return "Medium";
  }

  if (position > 15 && position <= 50) {
    return "Opportunity";
  }

  return "Low";
}

function getKeywordAction(keyword: GscKeywordRow) {
  const impressions = Number(keyword.impressions || 0);
  const clicks = Number(keyword.clicks || 0);
  const ctr = Number(keyword.ctr || 0);
  const position = Number(keyword.position || 0);

  if (position > 3 && position <= 15) {
    return "Optimize the target page with stronger headings, better content depth, and more internal links. This keyword is close enough to improve.";
  }

  if (impressions >= 10 && clicks === 0) {
    return "Rewrite the title tag and meta description. This keyword is visible in search but is not earning clicks yet.";
  }

  if (ctr < 0.02 && impressions >= 10) {
    return "Improve the search snippet and match the page more closely to the keyword intent to increase CTR.";
  }

  if (position > 15 && position <= 50) {
    return "Build stronger page relevance with supporting content, internal links, and clearer keyword targeting.";
  }

  if (position > 0 && position <= 3) {
    return "Protect this ranking by keeping the page updated and adding internal links from relevant pages.";
  }

  return "Monitor this keyword as more Google Search Console data becomes available.";
}

function getOpportunityScore(keyword: GscKeywordRow) {
  const impressions = Number(keyword.impressions || 0);
  const clicks = Number(keyword.clicks || 0);
  const ctr = Number(keyword.ctr || 0);
  const position = Number(keyword.position || 100);

  let score = 0;

  if (position > 3 && position <= 15) {
    score += 45;
  }

  if (position > 15 && position <= 50) {
    score += 25;
  }

  if (impressions >= 50) {
    score += 30;
  } else if (impressions >= 10) {
    score += 20;
  } else if (impressions > 0) {
    score += 10;
  }

  if (clicks === 0 && impressions > 0) {
    score += 20;
  }

  if (ctr < 0.02 && impressions >= 10) {
    score += 15;
  }

  return score;
}

function getLatestKeywordRange(rows: GscKeywordRow[]) {
  const latestRow = [...rows].sort((a, b) => {
    const aCreated = new Date(a.created_at || a.end_date || 0).getTime();
    const bCreated = new Date(b.created_at || b.end_date || 0).getTime();

    return bCreated - aCreated;
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

function formatShortDate(date: string | null | undefined) {
  if (!date) {
    return "--";
  }

  return new Date(date).toLocaleDateString();
}

export default async function RecommendationsPage({
  params,
}: RecommendationsPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, domain")
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

  const { data: issues } = latestAudit?.id
    ? await supabase
        .from("audit_issues")
        .select(
          "id, title, description, severity, category, recommendation, created_at"
        )
        .eq("audit_id", latestAudit.id)
        .order("created_at", { ascending: true })
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

  const highIssues = issueList.filter((issue) => issue.severity === "high");
  const mediumIssues = issueList.filter((issue) => issue.severity === "medium");
  const lowIssues = issueList.filter((issue) => issue.severity === "low");

  const keywordRecommendations: KeywordRecommendation[] = keywordList
    .map((keyword) => ({
      ...keyword,
      intent: getKeywordIntent(keyword.query),
      status: getKeywordStatus(keyword),
      priority: getKeywordPriority(keyword),
      action: getKeywordAction(keyword),
      opportunityScore: getOpportunityScore(keyword),
    }))
    .filter((keyword) => keyword.opportunityScore > 0)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 8);

  const topIssues = [...issueList].sort((a, b) => {
    const severityOrder: Record<string, number> = {
      high: 1,
      medium: 2,
      low: 3,
    };

    return (
      (severityOrder[a.severity || "low"] || 3) -
      (severityOrder[b.severity || "low"] || 3)
    );
  });

  const latestKeywordRange = getLatestKeywordRange(allKeywordRows);
  const latestKeywordDate = latestKeywordRange
    ? `${formatShortDate(latestKeywordRange.startDate)} - ${formatShortDate(
        latestKeywordRange.endDate
      )}`
    : "No keyword data yet";

  const hasAnyData = issueList.length > 0 || keywordRecommendations.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            SEO Action Plan
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">
            Recommendations
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Prioritized SEO fixes and keyword actions for {project.name}.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/dashboard/projects/${project.id}`}>Overview</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/dashboard/projects/${project.id}/audit`}>Audit</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/dashboard/projects/${project.id}/keywords`}>
              Keywords
            </Link>
          </Button>

          <Button asChild>
            <Link href={`/dashboard/projects/${project.id}/reports`}>
              Report
            </Link>
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border bg-white shadow-sm">
        <div className="relative p-8">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-rose-100 blur-3xl" />
          <div className="absolute right-28 top-10 h-36 w-36 rounded-full bg-blue-100 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {project.domain}
                </p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight">
                  What should be fixed next?
                </h1>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                This page turns audit issues and Google Search Console keyword
                data into a clear action plan. Start with high-priority blockers,
                then improve keywords with visibility and ranking potential.
              </p>
            </div>

            <Card className="border-slate-200 bg-background/90 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Latest Data</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Audit Score</span>
                  <span className="font-medium">
                    {latestAudit?.score ?? "--"}
                  </span>
                </div>

                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Audit Status</span>
                  <span className="font-medium capitalize">
                    {latestAudit?.status || "No audit yet"}
                  </span>
                </div>

                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Keyword Data</span>
                  <span className="font-medium">{latestKeywordDate}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "High Priority",
            value: highIssues.length,
            helper: "Fix these first",
            className: "border-rose-200 bg-rose-50",
          },
          {
            label: "Medium Priority",
            value: mediumIssues.length,
            helper: "Review next",
            className: "border-amber-200 bg-amber-50",
          },
          {
            label: "Low Priority",
            value: lowIssues.length,
            helper: "Improve later",
            className: "border-slate-200 bg-slate-50",
          },
          {
            label: "Keyword Actions",
            value: keywordRecommendations.length,
            helper: "GSC opportunities",
            className: "border-blue-200 bg-blue-50",
          },
        ].map((item) => (
          <Card key={item.label} className={`shadow-sm ${item.className}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold tracking-tight">{item.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.helper}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {!hasAnyData ? (
        <Card className="border-dashed bg-slate-50 shadow-sm">
          <CardContent className="flex min-h-[340px] flex-col items-center justify-center p-10 text-center">
            <div className="rounded-full border bg-white px-4 py-2 text-sm font-medium text-muted-foreground">
              No recommendations yet
            </div>

            <h3 className="mt-5 text-2xl font-bold tracking-tight">
              Run an audit and sync keyword data first
            </h3>

            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Recommendations will appear after the project has audit issues,
              PageSpeed data, or Google Search Console keyword rows.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href={`/dashboard/projects/${project.id}/audit`}>
                  Run Audit
                </Link>
              </Button>

              <Button asChild variant="outline">
                <Link href={`/dashboard/projects/${project.id}/keywords`}>
                  View Keywords
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Recommended Action Plan</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold">
                    1. Fix SEO blockers first
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Start with high and medium audit issues because they can
                    affect crawlability, metadata quality, and page relevance.
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold">
                    2. Improve close-ranking keywords
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Focus on keywords in positions 4–15. These are usually the
                    fastest opportunities to move with better content and links.
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold">
                    3. Rewrite weak snippets
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    For keywords with impressions but low clicks, improve the
                    title tag and meta description to increase CTR.
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold">
                    4. Rerun audit after updates
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    After applying fixes, run another audit and compare keyword
                    movement in the next Search Console sync.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>SEO Issue Recommendations</CardTitle>
            </CardHeader>

            <CardContent>
              {topIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No SEO issues found in the latest audit.
                </p>
              ) : (
                <div className="grid gap-3">
                  {topIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-2xl border bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold">
                            {issue.title}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {issue.description || "No description available."}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${getSeverityClass(
                              issue.severity
                            )}`}
                          >
                            {issue.severity || "medium"}
                          </span>

                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium capitalize text-slate-600">
                            {issue.category || "general"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Recommended Fix
                        </p>

                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {issue.recommendation ||
                            "Review this issue and apply the appropriate SEO fix."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Keyword Recommendations</CardTitle>
            </CardHeader>

            <CardContent>
              {keywordRecommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No keyword recommendations found in the latest synced data.
                </p>
              ) : (
                <div className="grid gap-3">
                  {keywordRecommendations.map((keyword) => (
                    <div
                      key={keyword.id}
                      className="rounded-2xl border bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold">
                            {keyword.query}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {keyword.action}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${getPriorityClass(
                              keyword.priority
                            )}`}
                          >
                            {keyword.priority}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${getIntentClass(
                              keyword.intent
                            )}`}
                          >
                            {keyword.intent}
                          </span>

                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                            {keyword.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-muted-foreground">
                            Impressions
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatNumber(keyword.impressions)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-muted-foreground">
                            Clicks
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatNumber(keyword.clicks)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-muted-foreground">CTR</p>
                          <p className="mt-1 font-semibold">
                            {formatCtr(keyword.ctr)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-muted-foreground">
                            Position
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatPosition(keyword.position)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}