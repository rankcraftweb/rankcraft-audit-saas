import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import KeywordsSyncButton from "./sync-button";

type KeywordsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type KeywordRow = {
  id: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  start_date: string;
  end_date: string;
};

type KeywordStatus = {
  label: string;
  className: string;
};

function formatCtr(value: number) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function formatPosition(value: number) {
  if (!value) {
    return "—";
  }

  return Number(value).toFixed(1);
}

function getKeywordStatus(row: KeywordRow): KeywordStatus {
  const position = Number(row.position || 0);
  const impressions = Number(row.impressions || 0);
  const clicks = Number(row.clicks || 0);

  if (position > 0 && position <= 3) {
    return {
      label: "Ranking Well",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (position > 3 && position <= 15) {
    return {
      label: "Opportunity",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (impressions >= 10 && clicks === 0) {
    return {
      label: "Low CTR",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (position > 15 && position <= 50) {
    return {
      label: "Needs Work",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    };
  }

  return {
    label: "Low Visibility",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  };
}

function sortKeywordRows(rows: KeywordRow[]) {
  return [...rows].sort((a, b) => {
    const clickDiff = Number(b.clicks || 0) - Number(a.clicks || 0);

    if (clickDiff !== 0) {
      return clickDiff;
    }

    const impressionDiff =
      Number(b.impressions || 0) - Number(a.impressions || 0);

    if (impressionDiff !== 0) {
      return impressionDiff;
    }

    return Number(a.position || 999) - Number(b.position || 999);
  });
}

function getBestRankingKeyword(rows: KeywordRow[]) {
  return rows
    .filter((row) => Number(row.position || 0) > 0)
    .sort((a, b) => Number(a.position || 999) - Number(b.position || 999))[0];
}

function getTopOpportunityKeyword(rows: KeywordRow[]) {
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

function getLowCtrKeyword(rows: KeywordRow[]) {
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

export default async function KeywordsPage({ params }: KeywordsPageProps) {
  const { id } = await params;
  const projectId = id;

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, domain")
    .eq("id", projectId)
    .single();

  const { data: keywords } = await supabase
    .from("gsc_keyword_rows")
    .select("id, query, clicks, impressions, ctr, position, start_date, end_date")
    .eq("project_id", projectId)
    .order("clicks", { ascending: false })
    .limit(100);

  const rows = sortKeywordRows((keywords || []) as KeywordRow[]);

  const totalClicks = rows.reduce(
    (sum, row) => sum + Number(row.clicks || 0),
    0
  );

  const totalImpressions = rows.reduce(
    (sum, row) => sum + Number(row.impressions || 0),
    0
  );

  const averagePosition =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + Number(row.position || 0), 0) /
        rows.length
      : 0;

  const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  const opportunityCount = rows.filter((row) => {
    const position = Number(row.position || 0);
    return position >= 4 && position <= 15;
  }).length;

  const lowCtrCount = rows.filter((row) => {
    return Number(row.impressions || 0) > 0 && Number(row.clicks || 0) === 0;
  }).length;

  const bestRankingKeyword = getBestRankingKeyword(rows);
  const topOpportunityKeyword = getTopOpportunityKeyword(rows);
  const lowCtrKeyword = getLowCtrKeyword(rows);

  const latestDateRange =
    rows.length > 0
      ? `${rows[0].start_date} to ${rows[0].end_date}`
      : "No sync yet";

  const keywordStats = [
    {
      label: "Tracked Keywords",
      value: rows.length.toString(),
      helper: "Queries synced from GSC",
    },
    {
      label: "Avg. Position",
      value: averagePosition ? averagePosition.toFixed(1) : "—",
      helper: "Average ranking position",
    },
    {
      label: "Total Impressions",
      value: totalImpressions.toLocaleString(),
      helper: "Organic search visibility",
    },
    {
      label: "Avg. CTR",
      value: formatCtr(averageCtr),
      helper: "Clicks divided by impressions",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="relative border-b border-slate-200 px-6 py-7 sm:px-8">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-100 blur-3xl" />
            <div className="absolute right-28 top-8 h-24 w-24 rounded-full bg-blue-100 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Keyword Intelligence
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  Keyword Performance
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Real Google Search Console keyword data for{" "}
                  <span className="font-semibold text-slate-950">
                    {project?.name || project?.domain || "this project"}
                  </span>
                  .
                </p>

                <p className="mt-2 text-xs font-medium text-slate-500">
                  Latest data range: {latestDateRange}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/dashboard/projects/${projectId}`}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Project Overview
                </Link>

                <KeywordsSyncButton projectId={projectId} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
            {keywordStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>

                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  {stat.value}
                </p>

                <p className="mt-2 text-sm leading-5 text-slate-500">
                  {stat.helper}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-900">
              Top Opportunity
            </p>

            <p className="mt-3 text-lg font-semibold text-blue-950">
              {topOpportunityKeyword?.query || "No position 4–15 keyword yet"}
            </p>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              {topOpportunityKeyword
                ? `Position ${formatPosition(
                    topOpportunityKeyword.position
                  )} with ${Number(
                    topOpportunityKeyword.impressions || 0
                  ).toLocaleString()} impressions.`
                : "Keywords in positions 4–15 will appear here after more GSC data is available."}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-900">CTR Review</p>

            <p className="mt-3 text-lg font-semibold text-amber-950">
              {lowCtrKeyword?.query || "No CTR issue detected yet"}
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              {lowCtrKeyword
                ? `${formatCtr(Number(lowCtrKeyword.ctr || 0))} CTR from ${Number(
                    lowCtrKeyword.impressions || 0
                  ).toLocaleString()} impressions.`
                : "Low CTR keywords will appear here when impressions are available."}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-900">
              Best Ranking
            </p>

            <p className="mt-3 text-lg font-semibold text-emerald-950">
              {bestRankingKeyword?.query || "No ranking data yet"}
            </p>

            <p className="mt-2 text-sm leading-6 text-emerald-800">
              {bestRankingKeyword
                ? `Average position ${formatPosition(
                    bestRankingKeyword.position
                  )} from latest GSC sync.`
                : "Your best ranking keyword will appear here after sync."}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Search Queries
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Sorted by clicks, then impressions, then ranking position.
                </p>
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                Last 28 days
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-6 py-4 text-left font-semibold">
                      Keyword
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Clicks
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Impressions
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">CTR</th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Position
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      SEO Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.length > 0 ? (
                    rows.map((row) => {
                      const status = getKeywordStatus(row);

                      return (
                        <tr
                          key={row.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-6 py-5 text-left align-middle">
                            <div className="max-w-[360px] font-medium text-slate-950">
                              {row.query}
                            </div>

                            <div className="mt-1 text-sm text-slate-500">
                              {row.start_date} to {row.end_date}
                            </div>
                          </td>

                          <td className="px-6 py-5 text-center align-middle text-sm font-semibold text-slate-950">
                            {Number(row.clicks || 0).toLocaleString()}
                          </td>

                          <td className="px-6 py-5 text-center align-middle text-sm text-slate-700">
                            {Number(row.impressions || 0).toLocaleString()}
                          </td>

                          <td className="px-6 py-5 text-center align-middle text-sm text-slate-700">
                            {formatCtr(Number(row.ctr || 0))}
                          </td>

                          <td className="px-6 py-5 text-center align-middle text-sm text-slate-700">
                            {formatPosition(Number(row.position || 0))}
                          </td>

                          <td className="px-6 py-5 text-center align-middle">
                            <span
                              className={`inline-flex min-w-[112px] justify-center rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12">
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                          <p className="text-sm font-semibold text-slate-950">
                            No GSC keyword data yet
                          </p>

                          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                            Click Sync Keywords to pull real Google Search
                            Console query data for this project.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Keyword Insights
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use this data to find ranking wins, CTR gaps, and content
                improvement opportunities.
              </p>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">
                      Opportunities
                    </p>

                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {opportunityCount}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Keywords in positions 4–15 can often improve with better
                    titles, content, and internal links.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">
                      CTR Issues
                    </p>

                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {lowCtrCount}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Keywords with impressions but no clicks may need stronger
                    title tags or meta descriptions.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    Client Report Note
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Use opportunity keywords to explain what pages need content
                    improvements in the report.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6">
              <p className="text-sm font-semibold text-emerald-900">
                Real GSC data connected
              </p>

              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Keyword rows are saved in Supabase after every Search Console
                sync and displayed here for SEO reporting.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}