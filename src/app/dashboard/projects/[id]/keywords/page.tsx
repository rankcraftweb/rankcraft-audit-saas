import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

function normalizeDomainForDisplay(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
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

function getKeywordStatusClass(status: string) {
  if (status === "Ranking Well") {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  if (status === "Opportunity") {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  if (status === "Low CTR" || status === "CTR Gap") {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  if (status === "Needs Work") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
}

function getIntentClass(intent: string) {
  if (intent === "Commercial") {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  if (intent === "Informational") {
    return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
  }

  if (intent === "Brand") {
    return "border-[#2b2413] bg-[#111111] text-[#d4af37]";
  }

  return "border-[#e6dcc8] bg-white text-slate-600";
}

function getOpportunityReason(keyword: GscKeywordRow) {
  const impressions = Number(keyword.impressions || 0);
  const clicks = Number(keyword.clicks || 0);
  const ctr = Number(keyword.ctr || 0);
  const position = Number(keyword.position || 0);

  if (position > 3 && position <= 15) {
    return "Close to stronger ranking visibility. Improve content depth, internal links, and page targeting.";
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
    return "Ranking well. Keep the content fresh and protect the page with internal links.";
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
    return "No import yet";
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
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e6dcc8] bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex rounded-full border border-[#d4af37]/40 bg-[#fff8df] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a5b00]">
              Google Search Console
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Keyword Performance
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-600">
                {project.name} · {normalizeDomainForDisplay(project.domain)}
              </p>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Track search visibility, clicks, CTR gaps, ranking positions,
                and keyword opportunities from the latest GSC sync.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2b2413] bg-[#111111] p-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b6a46a]">
                  Latest Keyword Sync
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                  {formatNumber(keywordList.length)}
                </p>
              </div>

              <span className="rounded-full border border-[#d4af37]/50 bg-[#d4af37] px-3 py-1 text-xs font-semibold text-black">
                {keywordList.length > 0 ? "Synced" : "No Data"}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4 rounded-xl border border-white/10 bg-white/10 p-3">
                <span className="text-slate-400">Date Range</span>
                <span className="text-right font-semibold text-white">
                  {latestKeywordDate}
                </span>
              </div>

              <div className="flex justify-between gap-4 rounded-xl border border-white/10 bg-white/10 p-3">
                <span className="text-slate-400">Last Imported</span>
                <span className="text-right font-semibold text-white">
                  {formatDate(allKeywordRows[0]?.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {keywordList.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-[#d4af37]/50 bg-white shadow-sm">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#111111] text-lg font-bold text-[#d4af37]">
              GSC
            </div>

            <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-950">
              No keyword data yet
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Once Google Search Console keyword rows are imported, this page
              will show clicks, impressions, CTR, ranking positions, and
              optimization opportunities.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              {
                label: "Tracked Keywords",
                value: formatNumber(keywordList.length),
                helper: "Latest synced queries.",
              },
              {
                label: "Total Clicks",
                value: formatNumber(totalClicks),
                helper: "Organic search clicks.",
              },
              {
                label: "Impressions",
                value: formatNumber(totalImpressions),
                helper: "Search visibility.",
              },
              {
                label: "Average CTR",
                value: formatCtr(averageCtr),
                helper: "Click-through rate.",
              },
              {
                label: "Avg. Position",
                value: formatPosition(averagePosition),
                helper: "Lower is better.",
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

          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm text-slate-950">
                  Best Ranking Keyword
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-xl font-bold text-slate-950">
                  {bestRankingKeyword?.query || "No ranking data yet"}
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-500">
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

            <Card className="rounded-2xl border-[#d4af37]/50 bg-[#fff8df] shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm text-[#7a5b00]">
                  Top Opportunity
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-xl font-bold text-[#7a5b00]">
                  {topOpportunityKeyword?.query || "No opportunity keyword yet"}
                </p>

                <p className="mt-3 text-sm leading-6 text-[#7a5b00]/80">
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

            <Card className="rounded-2xl border-[#e6dcc8] bg-[#faf7ef] shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm text-slate-950">
                  CTR Review
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-xl font-bold text-slate-950">
                  {lowCtrKeyword?.query || "No CTR issue yet"}
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {lowCtrKeyword
                    ? `${formatCtr(lowCtrKeyword.ctr)} CTR from ${formatNumber(
                        lowCtrKeyword.impressions
                      )} impressions.`
                    : "CTR issues appear when impressions are available."}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                label: "Page 1 Keywords",
                value: pageOneKeywords.length,
                helper: "Ranking from positions 1–10.",
              },
              {
                label: "Opportunities",
                value: opportunityKeywords.length,
                helper: "Close to stronger movement.",
              },
              {
                label: "Low CTR Keywords",
                value: lowCtrKeywords.length,
                helper: "Visibility with weak clicks.",
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

          <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-slate-950">
                Top Keyword Opportunities
              </CardTitle>
              <p className="text-sm text-slate-500">
                Keywords with the strongest improvement potential from the
                latest sync.
              </p>
            </CardHeader>

            <CardContent>
              {topOpportunities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d4af37]/50 bg-[#faf7ef] p-6">
                  <p className="text-sm text-slate-500">
                    No keyword opportunities found in the latest synced data.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {topOpportunities.map((keyword, index) => (
                    <div
                      key={keyword.id}
                      className="rounded-2xl border border-[#e6dcc8] bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7a19]">
                            Opportunity #{index + 1}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-slate-950">
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

                          <span className="rounded-full border border-[#2b2413] bg-[#111111] px-3 py-1 text-xs font-medium text-[#d4af37]">
                            Score {keyword.opportunityScore}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-3">
                          <p className="text-xs text-slate-500">
                            Impressions
                          </p>
                          <p className="mt-1 font-semibold text-slate-950">
                            {formatNumber(keyword.impressions)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-3">
                          <p className="text-xs text-slate-500">Clicks</p>
                          <p className="mt-1 font-semibold text-slate-950">
                            {formatNumber(keyword.clicks)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-3">
                          <p className="text-xs text-slate-500">CTR</p>
                          <p className="mt-1 font-semibold text-slate-950">
                            {formatCtr(keyword.ctr)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-3">
                          <p className="text-xs text-slate-500">Position</p>
                          <p className="mt-1 font-semibold text-slate-950">
                            {formatPosition(keyword.position)}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-500">
                        {keyword.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-slate-950">
                All Keywords
              </CardTitle>
              <p className="text-sm text-slate-500">
                Latest synced keyword rows from Google Search Console.
              </p>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto rounded-2xl border border-[#e6dcc8]">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow className="bg-[#faf7ef]">
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
                        <TableCell className="max-w-[320px] font-medium text-slate-950">
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

                        <TableCell className="text-center font-medium text-slate-950">
                          {formatNumber(keyword.clicks)}
                        </TableCell>

                        <TableCell className="text-center font-medium text-slate-950">
                          {formatNumber(keyword.impressions)}
                        </TableCell>

                        <TableCell className="text-center font-medium text-slate-950">
                          {formatCtr(keyword.ctr)}
                        </TableCell>

                        <TableCell className="text-center font-medium text-slate-950">
                          {formatPosition(keyword.position)}
                        </TableCell>

                        <TableCell className="text-slate-500">
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