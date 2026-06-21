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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type KeywordsPageProps = {
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

type KeywordInsight = GscKeywordRow & {
  opportunityScore: number;
  intent: string;
  status: string;
  reason: string;
};

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

function getKeywordStatusClass(status: string) {
  if (status === "Ranking Well") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Opportunity") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "Low CTR" || status === "CTR Gap") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "Needs Work") {
    return "border-orange-200 bg-orange-50 text-orange-700";
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

function getOpportunityReason(keyword: GscKeywordRow) {
  const impressions = Number(keyword.impressions || 0);
  const clicks = Number(keyword.clicks || 0);
  const ctr = Number(keyword.ctr || 0);
  const position = Number(keyword.position || 0);

  if (position > 3 && position <= 15) {
    return "Close to page one. Improve content depth, internal links, and page targeting.";
  }

  if (position > 15 && position <= 50) {
    return "Visible but weak. Strengthen relevance, supporting sections, and internal links.";
  }

  if (impressions >= 10 && clicks === 0) {
    return "Getting impressions but no clicks. Rewrite the title tag and meta description.";
  }

  if (ctr < 0.02 && impressions >= 10) {
    return "Weak CTR. Improve the search snippet and match the page closer to intent.";
  }

  if (position > 0 && position <= 3) {
    return "Ranking well. Keep content fresh and protect the page with internal links.";
  }

  return "Keep monitoring this keyword as more Search Console data comes in.";
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

function sortKeywords(rows: GscKeywordRow[]) {
  return [...rows].sort((a, b) => {
    const clicksDiff = Number(b.clicks || 0) - Number(a.clicks || 0);

    if (clicksDiff !== 0) {
      return clicksDiff;
    }

    const impressionsDiff =
      Number(b.impressions || 0) - Number(a.impressions || 0);

    if (impressionsDiff !== 0) {
      return impressionsDiff;
    }

    return Number(a.position || 999) - Number(b.position || 999);
  });
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

function getBestRankingKeyword(rows: GscKeywordRow[]) {
  return rows
    .filter((row) => Number(row.position || 0) > 0)
    .sort((a, b) => Number(a.position || 999) - Number(b.position || 999))[0];
}

function getTopOpportunityKeyword(rows: GscKeywordRow[]) {
  return rows
    .filter((row) => {
      const position = Number(row.position || 0);
      return position >= 4 && position <= 15;
    })
    .sort((a, b) => {
      const impressionsDiff =
        Number(b.impressions || 0) - Number(a.impressions || 0);

      if (impressionsDiff !== 0) {
        return impressionsDiff;
      }

      return Number(a.position || 999) - Number(b.position || 999);
    })[0];
}

function getLowCtrKeyword(rows: GscKeywordRow[]) {
  return rows
    .filter((row) => Number(row.impressions || 0) > 0)
    .sort((a, b) => {
      const ctrDiff = Number(a.ctr || 0) - Number(b.ctr || 0);

      if (ctrDiff !== 0) {
        return ctrDiff;
      }

      return Number(b.impressions || 0) - Number(a.impressions || 0);
    })[0];
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "No date available";
  }

  return new Date(date).toLocaleString();
}

function formatShortDate(date: string | null | undefined) {
  if (!date) {
    return "--";
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

export default async function KeywordsPage({ params }: KeywordsPageProps) {
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

  const { data: gscKeywordRows } = await supabase
    .from("gsc_keyword_rows")
    .select(
      "id, query, clicks, impressions, ctr, position, start_date, end_date, created_at"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const allKeywordRows = (gscKeywordRows || []) as GscKeywordRow[];
  const latestKeywordRows = getLatestKeywordRows(allKeywordRows);
  const keywordList = sortKeywords(latestKeywordRows);

  const latestKeywordRange = getLatestKeywordRange(allKeywordRows);
  const latestKeywordDate = latestKeywordRange
    ? `${formatShortDate(latestKeywordRange.startDate)} - ${formatShortDate(
        latestKeywordRange.endDate
      )}`
    : "No keyword data yet";

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

  const pageOneKeywords = keywordList.filter((keyword) => {
    const position = Number(keyword.position || 0);
    return position > 0 && position <= 10;
  });

  const opportunityKeywords = keywordList.filter((keyword) => {
    const position = Number(keyword.position || 0);
    return position >= 4 && position <= 15;
  });

  const lowCtrKeywords = keywordList.filter((keyword) => {
    const impressions = Number(keyword.impressions || 0);
    const clicks = Number(keyword.clicks || 0);
    const ctr = Number(keyword.ctr || 0);

    return impressions > 0 && (clicks === 0 || ctr < 0.02);
  });

  const bestRankingKeyword = getBestRankingKeyword(keywordList);
  const topOpportunityKeyword = getTopOpportunityKeyword(keywordList);
  const lowCtrKeyword = getLowCtrKeyword(keywordList);

  const topOpportunities: KeywordInsight[] = keywordList
    .map((keyword) => ({
      ...keyword,
      opportunityScore: getOpportunityScore(keyword),
      intent: getKeywordIntent(keyword.query),
      status: getKeywordStatus(keyword),
      reason: getOpportunityReason(keyword),
    }))
    .filter((keyword) => keyword.opportunityScore > 0)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 5);

  const keywordRows: KeywordInsight[] = keywordList.map((keyword) => ({
    ...keyword,
    opportunityScore: getOpportunityScore(keyword),
    intent: getKeywordIntent(keyword.query),
    status: getKeywordStatus(keyword),
    reason: getOpportunityReason(keyword),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Google Search Console
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">
            Keyword Performance
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Track search visibility, clicks, CTR gaps, and ranking opportunities
            for {project.name}.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/dashboard/projects/${project.id}`}>Overview</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/dashboard/projects/${project.id}/reports`}>
              Reports
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/dashboard/projects/${project.id}/recommendations`}>
              Recommendations
            </Link>
          </Button>

          <Button asChild>
            <Link href={`/dashboard/projects/${project.id}/audit`}>
              Run Audit
            </Link>
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border bg-white shadow-sm">
        <div className="relative p-8">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-blue-100 blur-3xl" />
          <div className="absolute right-28 top-10 h-36 w-36 rounded-full bg-emerald-100 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {project.domain}
                </p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight">
                  Search visibility dashboard
                </h1>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Use this page to find which keywords are already working, which
                ones are close to improving, and which search snippets need CTR
                optimization.
              </p>
            </div>

            <Card className="border-slate-200 bg-background/90 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Latest Keyword Sync</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Date Range</span>
                  <span className="font-medium">{latestKeywordDate}</span>
                </div>

                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Rows Loaded</span>
                  <span className="font-medium">
                    {formatNumber(keywordList.length)}
                  </span>
                </div>

                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Last Imported</span>
                  <span className="font-medium">
                    {formatDate(allKeywordRows[0]?.created_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {keywordList.length === 0 ? (
        <Card className="border-dashed bg-slate-50 shadow-sm">
          <CardContent className="flex min-h-[340px] flex-col items-center justify-center p-10 text-center">
            <div className="rounded-full border bg-white px-4 py-2 text-sm font-medium text-muted-foreground">
              No GSC keyword data yet
            </div>

            <h3 className="mt-5 text-2xl font-bold tracking-tight">
              Sync Google Search Console keywords first
            </h3>

            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Once keyword rows are imported, this page will show clicks,
              impressions, CTR, average position, ranking wins, and SEO
              opportunities.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href={`/dashboard/projects/${project.id}/audit`}>
                  Run Audit
                </Link>
              </Button>

              <Button asChild variant="outline">
                <Link href={`/dashboard/projects/${project.id}/recommendations`}>
                  Recommendations
                </Link>
              </Button>

              <Button asChild variant="outline">
                <Link href={`/dashboard/projects/${project.id}/reports`}>
                  View Report
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              {
                label: "Tracked Keywords",
                value: formatNumber(keywordList.length),
                helper: "Latest synced queries",
              },
              {
                label: "Total Clicks",
                value: formatNumber(totalClicks),
                helper: "From organic search",
              },
              {
                label: "Impressions",
                value: formatNumber(totalImpressions),
                helper: "Search visibility",
              },
              {
                label: "Average CTR",
                value: formatCtr(averageCtr),
                helper: "Click-through rate",
              },
              {
                label: "Avg. Position",
                value: formatPosition(averagePosition),
                helper: "Lower is better",
              },
            ].map((item) => (
              <Card key={item.label} className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.helper}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm text-emerald-900">
                  Best Ranking Keyword
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-emerald-950">
                  {bestRankingKeyword?.query || "No ranking data yet"}
                </p>
                <p className="mt-3 text-sm leading-6 text-emerald-800">
                  {bestRankingKeyword
                    ? `Position ${formatPosition(
                        bestRankingKeyword.position
                      )} with ${formatNumber(
                        bestRankingKeyword.impressions
                      )} impressions.`
                    : "Ranking wins will appear here once position data is available."}
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm text-blue-900">
                  Top Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-blue-950">
                  {topOpportunityKeyword?.query || "No opportunity keyword yet"}
                </p>
                <p className="mt-3 text-sm leading-6 text-blue-800">
                  {topOpportunityKeyword
                    ? `Position ${formatPosition(
                        topOpportunityKeyword.position
                      )} with ${formatNumber(
                        topOpportunityKeyword.impressions
                      )} impressions.`
                    : "Keywords in positions 4–15 will appear here."}
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm text-amber-900">
                  CTR Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-amber-950">
                  {lowCtrKeyword?.query || "No CTR issue yet"}
                </p>
                <p className="mt-3 text-sm leading-6 text-amber-800">
                  {lowCtrKeyword
                    ? `${formatCtr(lowCtrKeyword.ctr)} CTR from ${formatNumber(
                        lowCtrKeyword.impressions
                      )} impressions.`
                    : "CTR issues appear when impressions are available."}
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Page 1 Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tracking-tight">
                  {pageOneKeywords.length}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Keywords ranking from positions 1–10.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tracking-tight">
                  {opportunityKeywords.length}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Keywords close to page one movement.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Low CTR Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tracking-tight">
                  {lowCtrKeywords.length}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Visibility with weak click performance.
                </p>
              </CardContent>
            </Card>
          </section>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Top Keyword Opportunities</CardTitle>
            </CardHeader>

            <CardContent>
              {topOpportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No keyword opportunities found in the latest synced data.
                </p>
              ) : (
                <div className="grid gap-3">
                  {topOpportunities.map((keyword, index) => (
                    <div
                      key={keyword.id}
                      className="rounded-2xl border bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Opportunity #{index + 1}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold">
                            {keyword.query}
                          </h3>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${getIntentClass(
                              keyword.intent
                            )}`}
                          >
                            {keyword.intent}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${getKeywordStatusClass(
                              keyword.status
                            )}`}
                          >
                            {keyword.status}
                          </span>

                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                            Score {keyword.opportunityScore}
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

                      <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        {keyword.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>All Keywords</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Intent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Clicks</TableHead>
                      <TableHead className="text-center">Impressions</TableHead>
                      <TableHead className="text-center">CTR</TableHead>
                      <TableHead className="text-center">Position</TableHead>
                      <TableHead>Date Range</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {keywordRows.map((keyword) => (
                      <TableRow key={keyword.id}>
                        <TableCell className="max-w-[320px] font-medium">
                          {keyword.query}
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getIntentClass(
                              keyword.intent
                            )}`}
                          >
                            {keyword.intent}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex min-w-[112px] justify-center rounded-full border px-3 py-1 text-xs font-medium ${getKeywordStatusClass(
                              keyword.status
                            )}`}
                          >
                            {keyword.status}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          {formatNumber(keyword.clicks)}
                        </TableCell>

                        <TableCell className="text-center">
                          {formatNumber(keyword.impressions)}
                        </TableCell>

                        <TableCell className="text-center">
                          {formatCtr(keyword.ctr)}
                        </TableCell>

                        <TableCell className="text-center">
                          {formatPosition(keyword.position)}
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {formatShortDate(keyword.start_date)} -{" "}
                          {formatShortDate(keyword.end_date)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}