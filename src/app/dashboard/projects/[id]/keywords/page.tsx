import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGscConnectionStatus } from "@/lib/gsc/connection-status";
import GscStatusBadge from "@/components/gsc-status-badge";
import KeywordsSyncButton from "./sync-button";

type KeywordsPageProps = {
  params: Promise<{ id: string }>;
};

type Project = {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  user_id: string;
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

function normalizeDomain(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

function getKeywordIntent(query: string) {
  const q = query.toLowerCase();

  if (
    q.includes("near me") ||
    q.includes("services") ||
    q.includes("consultant") ||
    q.includes("designer") ||
    q.includes("developer") ||
    q.includes("agency") ||
    q.includes("company")
  ) {
    return "Commercial";
  }

  if (
    q.includes("how") ||
    q.includes("what") ||
    q.includes("guide") ||
    q.includes("tips") ||
    q.includes("best")
  ) {
    return "Informational";
  }

  if (
    q.includes("rankcraft") ||
    q.includes("rank craft") ||
    q.includes("rankcraftweb")
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
  if (status === "Ranking Well" || status === "Opportunity") {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  if (status === "Low CTR" || status === "CTR Gap") {
    return "border-amber-200 bg-amber-50 text-amber-700";
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

    const impressionDiff =
      Number(b.impressions || 0) - Number(a.impressions || 0);

    if (impressionDiff !== 0) {
      return impressionDiff;
    }

    return Number(a.position || 999) - Number(b.position || 999);
  });
}

function getLatestKeywordRange(rows: GscKeywordRow[]) {
  const latestRow = [...rows].sort((a, b) => {
    const aTime = new Date(a.created_at || a.end_date || 0).getTime();
    const bTime = new Date(b.created_at || b.end_date || 0).getTime();

    return bTime - aTime;
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
  const range = getLatestKeywordRange(rows);

  if (!range) {
    return [];
  }

  return rows.filter(
    (row) => row.start_date === range.startDate && row.end_date === range.endDate
  );
}

function getBestRankingKeyword(rows: GscKeywordRow[]) {
  return rows
    .filter((row) => Number(row.position || 0) > 0)
    .sort(
      (a, b) => Number(a.position || 999) - Number(b.position || 999)
    )[0];
}

function getTopOpportunityKeyword(rows: GscKeywordRow[]) {
  return rows
    .filter((row) => {
      const position = Number(row.position || 0);
      return position >= 4 && position <= 15;
    })
    .sort((a, b) => {
      const impressionDiff =
        Number(b.impressions || 0) - Number(a.impressions || 0);

      if (impressionDiff !== 0) {
        return impressionDiff;
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
  const gscStatus = await getGscConnectionStatus(supabase, user.id);

  const { data: gscKeywordRows } = await supabase
    .from("gsc_keyword_rows")
    .select(
      "id, query, clicks, impressions, ctr, position, start_date, end_date, created_at"
    )
    .eq("project_id", currentProject.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const allKeywordRows = (gscKeywordRows || []) as GscKeywordRow[];
  const latestKeywordRows = getLatestKeywordRows(allKeywordRows);
  const keywordList = sortKeywords(latestKeywordRows);

  const latestRange = getLatestKeywordRange(allKeywordRows);
  const latestKeywordDate = latestRange
    ? `${formatShortDate(latestRange.startDate)} – ${formatShortDate(
        latestRange.endDate
      )}`
    : "No keyword data yet";

  const totalClicks = keywordList.reduce(
    (sum, keyword) => sum + Number(keyword.clicks || 0),
    0
  );

  const totalImpressions = keywordList.reduce(
    (sum, keyword) => sum + Number(keyword.impressions || 0),
    0
  );

  const averageCtr =
    totalImpressions > 0 ? totalClicks / totalImpressions : null;

  const averagePosition =
    keywordList.length > 0
      ? keywordList.reduce(
          (sum, keyword) => sum + Number(keyword.position || 0),
          0
        ) / keywordList.length
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/dashboard/projects/${currentProject.id}`}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            ← Overview
          </Link>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Search performance
            </h1>

            <GscStatusBadge connected={gscStatus.connected} />
          </div>

          <p className="text-xs text-slate-500">
            {currentProject.name} · {normalizeDomain(currentProject.domain)}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {gscStatus.connected ? (
            <KeywordsSyncButton projectId={currentProject.id} />
          ) : (
            <a
              href="/api/gsc/connect"
              className="inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black"
            >
              Connect Google Search Console
            </a>
          )}

          <Link
            href={`/dashboard/projects/${currentProject.id}/reports`}
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            Report
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Keywords
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {formatNumber(keywordList.length)}
          </p>

          <p className="mt-1 text-xs text-slate-500">Latest synced queries</p>
        </div>

        <div className="rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
            Impressions
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {formatNumber(totalImpressions)}
          </p>

          <p className="mt-1 text-xs text-[#7a5b00]/70">Search visibility</p>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Clicks
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {formatNumber(totalClicks)}
          </p>

          <p className="mt-1 text-xs text-slate-500">Organic clicks</p>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Avg. Position
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {formatPosition(averagePosition)}
          </p>

          <p className="mt-1 text-xs text-slate-500">Lower is better</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e6dcc8] bg-[#111111] p-5 text-white">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
              Latest Sync
            </p>

            <p className="mt-1 text-lg font-bold tracking-tight text-white">
              {keywordList.length > 0 ? "Keyword data available" : "No data yet"}
            </p>

            <p className="mt-2 text-xs text-slate-300">
              Date range:{" "}
              <span className="font-semibold text-white">
                {latestKeywordDate}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                Last Imported
              </p>

              <p className="mt-1 text-xs font-semibold text-white">
                {formatDate(allKeywordRows[0]?.created_at)}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                Average CTR
              </p>

              <p className="mt-1 text-lg font-bold text-white">
                {formatCtr(averageCtr)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {keywordList.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d4af37]/40 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-950">
            No keyword data yet
          </p>

          <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
            {gscStatus.connected
              ? "Sync Google Search Console data to show clicks, impressions, CTR, ranking positions, and keyword opportunities."
              : "Connect Google Search Console to start syncing clicks, impressions, CTR, ranking positions, and keyword opportunities."}
          </p>

          {!gscStatus.connected ? (
            <a
              href="/api/gsc/connect"
              className="mt-4 inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black"
            >
              Connect Google Search Console
            </a>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
              <p className="text-xs font-semibold text-slate-950">
                Best Ranking Keyword
              </p>

              <p className="mt-2 text-base font-bold text-slate-950">
                {bestRankingKeyword?.query || "No ranking data yet"}
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {bestRankingKeyword
                  ? `Position ${formatPosition(
                      bestRankingKeyword.position
                    )} with ${formatNumber(
                      bestRankingKeyword.impressions
                    )} impressions.`
                  : "Ranking wins will appear here once position data is available."}
              </p>
            </div>

            <div className="rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] p-4">
              <p className="text-xs font-semibold text-[#7a5b00]">
                Top Opportunity
              </p>

              <p className="mt-2 text-base font-bold text-[#7a5b00]">
                {topOpportunityKeyword?.query || "No opportunity keyword yet"}
              </p>

              <p className="mt-2 text-xs leading-5 text-[#7a5b00]/70">
                {topOpportunityKeyword
                  ? `Position ${formatPosition(
                      topOpportunityKeyword.position
                    )} with ${formatNumber(
                      topOpportunityKeyword.impressions
                    )} impressions.`
                  : "Keywords in positions 4–15 will appear here."}
              </p>
            </div>

            <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
              <p className="text-xs font-semibold text-slate-950">
                CTR Review
              </p>

              <p className="mt-2 text-base font-bold text-slate-950">
                {lowCtrKeyword?.query || "No CTR issue yet"}
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {lowCtrKeyword
                  ? `${formatCtr(lowCtrKeyword.ctr)} CTR from ${formatNumber(
                      lowCtrKeyword.impressions
                    )} impressions.`
                  : "CTR issues appear when impressions are available."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Page 1 Keywords
              </p>

              <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">
                {pageOneKeywords.length}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                Positions 1–10.
              </p>
            </div>

            <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Opportunities
              </p>

              <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">
                {opportunityKeywords.length}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                Close to stronger movement.
              </p>
            </div>

            <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Low CTR Keywords
              </p>

              <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">
                {lowCtrKeywords.length}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                Visibility with weak clicks.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e6dcc8] bg-white">
            <div className="border-b border-[#eee5d4] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                Opportunities
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-950">
                Top keyword opportunities
              </p>
            </div>

            <div className="p-4">
              {topOpportunities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#d4af37]/40 bg-[#faf7ef] p-4">
                  <p className="text-xs text-slate-500">
                    No keyword opportunities found in the latest synced data.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {topOpportunities.map((keyword, index) => (
                    <div
                      key={keyword.id}
                      className="rounded-xl border border-[#e6dcc8] bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a7a19]">
                            Opportunity #{index + 1}
                          </p>

                          <h3 className="mt-1 text-sm font-bold text-slate-950">
                            {keyword.query}
                          </h3>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getIntentClass(
                              keyword.intent
                            )}`}
                          >
                            {keyword.intent}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getKeywordStatusClass(
                              keyword.status
                            )}`}
                          >
                            {keyword.status}
                          </span>

                          <span className="rounded-full border border-[#2b2413] bg-[#111111] px-2.5 py-0.5 text-[11px] font-semibold text-[#d4af37]">
                            Score {keyword.opportunityScore}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-4 gap-2">
                        <div className="rounded-lg border border-[#e6dcc8] bg-[#faf7ef] p-2.5">
                          <p className="text-[10px] text-slate-500">
                            Impressions
                          </p>

                          <p className="mt-0.5 text-xs font-semibold text-slate-950">
                            {formatNumber(keyword.impressions)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-[#e6dcc8] bg-[#faf7ef] p-2.5">
                          <p className="text-[10px] text-slate-500">Clicks</p>

                          <p className="mt-0.5 text-xs font-semibold text-slate-950">
                            {formatNumber(keyword.clicks)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-[#e6dcc8] bg-[#faf7ef] p-2.5">
                          <p className="text-[10px] text-slate-500">CTR</p>

                          <p className="mt-0.5 text-xs font-semibold text-slate-950">
                            {formatCtr(keyword.ctr)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-[#e6dcc8] bg-[#faf7ef] p-2.5">
                          <p className="text-[10px] text-slate-500">
                            Position
                          </p>

                          <p className="mt-0.5 text-xs font-semibold text-slate-950">
                            {formatPosition(keyword.position)}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {keyword.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e6dcc8] bg-white">
            <div className="border-b border-[#eee5d4] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                Keyword Rows
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-950">
                All keywords
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-xs">
                <thead>
                  <tr className="border-b border-[#eee5d4] bg-[#faf7ef]">
                    <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Keyword
                    </th>

                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Intent
                    </th>

                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Status
                    </th>

                    <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Clicks
                    </th>

                    <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Impressions
                    </th>

                    <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-[0.1em] text-slate-500">
                      CTR
                    </th>

                    <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Position
                    </th>

                    <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Date Range
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eee5d4]">
                  {keywordRows.map((keyword) => (
                    <tr key={keyword.id} className="hover:bg-[#faf7ef]">
                      <td className="max-w-[280px] px-5 py-2.5 font-medium text-slate-950">
                        {keyword.query}
                      </td>

                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${getIntentClass(
                            keyword.intent
                          )}`}
                        >
                          {keyword.intent}
                        </span>
                      </td>

                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex min-w-[100px] justify-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getKeywordStatusClass(
                            keyword.status
                          )}`}
                        >
                          {keyword.status}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-center font-medium text-slate-950">
                        {formatNumber(keyword.clicks)}
                      </td>

                      <td className="px-3 py-2.5 text-center font-medium text-slate-950">
                        {formatNumber(keyword.impressions)}
                      </td>

                      <td className="px-3 py-2.5 text-center font-medium text-slate-950">
                        {formatCtr(keyword.ctr)}
                      </td>

                      <td className="px-3 py-2.5 text-center font-medium text-slate-950">
                        {formatPosition(keyword.position)}
                      </td>

                      <td className="px-5 py-2.5 text-slate-500">
                        {formatShortDate(keyword.start_date)} –{" "}
                        {formatShortDate(keyword.end_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}