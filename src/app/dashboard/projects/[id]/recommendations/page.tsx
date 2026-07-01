import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type RecommendationsPageProps = {
  params: Promise<{ id: string }>;
};

type Project = {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  user_id: string;
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

type RecommendationItem = {
  id: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  category: string;
  impact: string;
  action: string;
  source: string;
};

function normalizeDomain(domain: string) {
  return domain.replace("https://", "").replace("http://", "").replace(/\/$/, "");
}

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function formatCtr(ctr: number | null | undefined) {
  if (ctr === null || ctr === undefined) return "--";
  return `${(Number(ctr) * 100).toFixed(1)}%`;
}

function formatPosition(position: number | null | undefined) {
  if (position === null || position === undefined) return "--";
  return Number(position).toFixed(1);
}

function getPriorityClass(priority: string) {
  if (priority === "High") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "Medium") return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
}

function getCategoryClass(category: string) {
  const lower = category.toLowerCase();
  if (lower.includes("keyword")) return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  if (lower.includes("technical")) return "border-slate-300 bg-slate-100 text-slate-700";
  if (lower.includes("metadata")) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-[#e6dcc8] bg-white text-slate-600";
}

function getLatestKeywordRange(rows: GscKeywordRow[]) {
  const latestRow = [...rows].sort((a, b) => {
    const aDate = new Date(a.created_at || a.end_date || 0).getTime();
    const bDate = new Date(b.created_at || b.end_date || 0).getTime();
    return bDate - aDate;
  })[0];

  if (!latestRow?.start_date || !latestRow?.end_date) return null;
  return { startDate: latestRow.start_date, endDate: latestRow.end_date };
}

function getLatestKeywordRows(rows: GscKeywordRow[]) {
  const range = getLatestKeywordRange(rows);
  if (!range) return [];
  return rows.filter((r) => r.start_date === range.startDate && r.end_date === range.endDate);
}

function getKeywordStatus(keyword: GscKeywordRow) {
  const impressions = Number(keyword.impressions || 0);
  const clicks = Number(keyword.clicks || 0);
  const ctr = Number(keyword.ctr || 0);
  const position = Number(keyword.position || 0);

  if (position > 0 && position <= 3) return "Ranking Well";
  if (position > 3 && position <= 15) return "Opportunity";
  if (impressions >= 10 && clicks === 0) return "Low CTR";
  if (ctr < 0.02 && impressions >= 10) return "CTR Gap";
  if (position > 15 && position <= 50) return "Needs Work";
  return "Monitor";
}

function getKeywordAction(keyword: GscKeywordRow) {
  const impressions = Number(keyword.impressions || 0);
  const clicks = Number(keyword.clicks || 0);
  const ctr = Number(keyword.ctr || 0);
  const position = Number(keyword.position || 0);

  if (position > 3 && position <= 15)
    return "Improve the target page content, add internal links, and make sure the keyword intent is clearly matched on the page.";
  if (impressions >= 10 && clicks === 0)
    return "Rewrite the title tag and meta description to make the search result more clickable.";
  if (ctr < 0.02 && impressions >= 10)
    return "Improve the page snippet and make the title more specific to the search query.";
  if (position > 15 && position <= 50)
    return "Strengthen the page with supporting content, better headings, and internal links from relevant pages.";
  return "Keep tracking this keyword and review again after more Search Console data is available.";
}

function getKeywordPriority(keyword: GscKeywordRow): "High" | "Medium" | "Low" {
  const impressions = Number(keyword.impressions || 0);
  const clicks = Number(keyword.clicks || 0);
  const ctr = Number(keyword.ctr || 0);
  const position = Number(keyword.position || 0);

  if (
    (position >= 4 && position <= 15 && impressions >= 10) ||
    (impressions >= 25 && clicks === 0)
  )
    return "High";
  if ((position > 15 && position <= 50) || (ctr < 0.02 && impressions >= 10)) return "Medium";
  return "Low";
}

function getIssuePriority(severity: string | null | undefined): "High" | "Medium" | "Low" {
  if (severity === "high") return "High";
  if (severity === "medium") return "Medium";
  return "Low";
}

function buildIssueRecommendations(issues: AuditIssue[]) {
  return issues.map((issue) => {
    const priority = getIssuePriority(issue.severity);
    return {
      id: `issue-${issue.id}`,
      title: issue.title,
      description: issue.description || "This SEO issue was detected in the latest audit.",
      priority,
      category: issue.category || "Technical SEO",
      impact:
        priority === "High"
          ? "Can directly affect crawlability, relevance, or search visibility."
          : priority === "Medium"
            ? "Can improve SEO quality and reduce technical weaknesses."
            : "Useful cleanup item for a stronger SEO foundation.",
      action: issue.recommendation || "Review this issue and apply the appropriate SEO fix.",
      source: "Audit issue",
    } satisfies RecommendationItem;
  });
}

function buildKeywordRecommendations(keywords: GscKeywordRow[]) {
  return keywords
    .filter((keyword) => {
      const status = getKeywordStatus(keyword);
      return (
        status === "Opportunity" ||
        status === "Low CTR" ||
        status === "CTR Gap" ||
        status === "Needs Work"
      );
    })
    .map((keyword) => {
      const status = getKeywordStatus(keyword);
      const priority = getKeywordPriority(keyword);

      return {
        id: `keyword-${keyword.id}`,
        title: `Improve keyword: ${keyword.query}`,
        description: `${status}. ${formatNumber(keyword.impressions)} impressions, ${formatNumber(keyword.clicks)} clicks, ${formatCtr(keyword.ctr)} CTR, average position ${formatPosition(keyword.position)}.`,
        priority,
        category: "Keyword Opportunity",
        impact:
          status === "Opportunity"
            ? "This keyword is close enough to improve with focused page optimization."
            : status === "Low CTR" || status === "CTR Gap"
              ? "This keyword already has visibility but needs a better search snippet to earn clicks."
              : "This keyword has visibility but needs stronger page relevance.",
        action: getKeywordAction(keyword),
        source: "Google Search Console",
      } satisfies RecommendationItem;
    });
}

function sortRecommendations(recommendations: RecommendationItem[]) {
  const priorityWeight = { High: 3, Medium: 2, Low: 1 };
  return [...recommendations].sort(
    (a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]
  );
}

export default async function RecommendationsPage({ params }: RecommendationsPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, domain, created_at, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) notFound();

  const currentProject = project as Project;

  const { data: latestAudit } = await supabase
    .from("audits")
    .select("id, score, status, created_at")
    .eq("project_id", currentProject.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: issues } = latestAudit?.id
    ? await supabase
        .from("audit_issues")
        .select("id, title, description, severity, category, recommendation, created_at")
        .eq("audit_id", latestAudit.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: gscKeywordRows } = await supabase
    .from("gsc_keyword_rows")
    .select("id, query, clicks, impressions, ctr, position, start_date, end_date, created_at")
    .eq("project_id", currentProject.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const issueList = (issues || []) as AuditIssue[];
  const allKeywordRows = (gscKeywordRows || []) as GscKeywordRow[];
  const latestKeywordRows = getLatestKeywordRows(allKeywordRows);

  const issueRecommendations = buildIssueRecommendations(issueList);
  const keywordRecommendations = buildKeywordRecommendations(latestKeywordRows);

  const recommendations = sortRecommendations([
    ...issueRecommendations,
    ...keywordRecommendations,
  ]).slice(0, 12);

  const highCount = recommendations.filter((r) => r.priority === "High").length;
  const mediumCount = recommendations.filter((r) => r.priority === "Medium").length;
  const lowCount = recommendations.filter((r) => r.priority === "Low").length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/dashboard/projects/${currentProject.id}`}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            ← Overview
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Prioritized action plan
          </h1>
          <p className="text-xs text-slate-500">
            {currentProject.name} · {normalizeDomain(currentProject.domain)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/projects/${currentProject.id}/reports`}
            className="inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black"
          >
            Report
          </Link>
          <Link
            href={`/dashboard/projects/${currentProject.id}/audit`}
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            Run Audit
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Total Actions
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {recommendations.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Recommended next steps</p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700">
            High Priority
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {highCount}
          </p>
          <p className="mt-1 text-xs text-red-700/70">Fix first</p>
        </div>

        <div className="rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
            Medium Priority
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {mediumCount}
          </p>
          <p className="mt-1 text-xs text-[#7a5b00]/70">Review next</p>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Low Priority
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {lowCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Cleanup items</p>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d4af37]/40 bg-white p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#111111] text-sm font-bold text-[#d4af37]">
            ✓
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-950">
            No recommendations yet
          </p>
          <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
            Run an SEO audit and sync Google Search Console keyword data
            first. Once data is available, this page will show prioritized
            technical fixes, CTR opportunities, and keyword actions.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href={`/dashboard/projects/${currentProject.id}/audit`}
              className="inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black"
            >
              Run Audit
            </Link>
            <Link
              href={`/dashboard/projects/${currentProject.id}/keywords`}
              className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
            >
              Keywords
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {recommendations.map((item, index) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#e6dcc8] bg-white p-5"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-[#e6dcc8] bg-[#faf7ef] px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      #{index + 1}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getPriorityClass(item.priority)}`}
                    >
                      {item.priority}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getCategoryClass(item.category)}`}
                    >
                      {item.category}
                    </span>
                  </div>

                  <h2 className="mt-3 text-base font-bold tracking-tight text-slate-950">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>

                  <div className="mt-3 grid gap-2.5 md:grid-cols-2">
                    <div className="rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        Why this matters
                      </p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-600">
                        {item.impact}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#d4af37]/40 bg-[#fff8df] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a5b00]">
                        Recommended action
                      </p>
                      <p className="mt-1.5 text-xs leading-5 text-[#7a5b00]/80">
                        {item.action}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e6dcc8] bg-white p-3 xl:w-44">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Source
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-950">
                    {item.source}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}