import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConnectGscButton from "@/components/connect-gsc-button";
import FetchGscKeywordsButton from "@/components/fetch-gsc-keywords-button";
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

type Keyword = {
  id: string;
  query: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
  date: string | null;
};

function formatCtr(ctr: number | null | undefined) {
  if (ctr === null || ctr === undefined) {
    return "--";
  }

  return `${(Number(ctr) * 100).toFixed(2)}%`;
}

function formatPosition(position: number | null | undefined) {
  if (position === null || position === undefined) {
    return "--";
  }

  return Number(position).toFixed(1);
}

function getKeywordIntent(query: string) {
  const lowerQuery = query.toLowerCase();

  if (
    lowerQuery.includes("near me") ||
    lowerQuery.includes("services") ||
    lowerQuery.includes("consultant") ||
    lowerQuery.includes("designer") ||
    lowerQuery.includes("developer")
  ) {
    return "Commercial";
  }

  if (
    lowerQuery.includes("how") ||
    lowerQuery.includes("what") ||
    lowerQuery.includes("guide") ||
    lowerQuery.includes("tips")
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

function getKeywordStatus(keyword: Keyword) {
  const impressions = keyword.impressions || 0;
  const clicks = keyword.clicks || 0;
  const ctr = keyword.ctr || 0;
  const position = Number(keyword.position || 0);

  if (position > 0 && position <= 3) {
    return "Top 3";
  }

  if (position > 3 && position <= 10) {
    return "Page 1";
  }

  if (position > 10 && position <= 20) {
    return "Near Page 1";
  }

  if (impressions >= 5 && clicks === 0) {
    return "Low CTR";
  }

  if (ctr < 0.02 && impressions >= 5) {
    return "CTR Gap";
  }

  return "Monitor";
}

function getOpportunityReason(keyword: Keyword) {
  const impressions = keyword.impressions || 0;
  const clicks = keyword.clicks || 0;
  const ctr = keyword.ctr || 0;
  const position = Number(keyword.position || 0);

  if (position > 3 && position <= 10) {
    return "Already ranking on page 1. Improve title, meta description, and content match to win more clicks.";
  }

  if (position > 10 && position <= 20) {
    return "Close to page 1. Add supporting content, internal links, and improve page relevance.";
  }

  if (impressions >= 5 && clicks === 0) {
    return "Getting search visibility but no clicks. Improve title and meta description to increase CTR.";
  }

  if (ctr < 0.02 && impressions >= 5) {
    return "Low CTR compared to impressions. Improve SERP copy and strengthen keyword intent match.";
  }

  return "Keep monitoring this keyword as more Search Console data comes in.";
}

function getOpportunityScore(keyword: Keyword) {
  const impressions = keyword.impressions || 0;
  const clicks = keyword.clicks || 0;
  const ctr = keyword.ctr || 0;
  const position = Number(keyword.position || 100);

  let score = 0;

  if (position > 3 && position <= 10) {
    score += 40;
  }

  if (position > 10 && position <= 20) {
    score += 35;
  }

  if (impressions >= 10) {
    score += 25;
  } else if (impressions >= 5) {
    score += 15;
  } else if (impressions > 0) {
    score += 5;
  }

  if (clicks === 0 && impressions > 0) {
    score += 20;
  }

  if (ctr < 0.02 && impressions >= 5) {
    score += 15;
  }

  return score;
}

export default async function KeywordsPage({ params }: KeywordsPageProps) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: gscConnection } = user?.id
    ? await supabase
        .from("gsc_connections")
        .select("id, expires_at, scope, updated_at")
        .eq("user_id", user.id)
        .single()
    : { data: null };

  const { data: keywords } = await supabase
    .from("keywords")
    .select("id, query, clicks, impressions, ctr, position, date")
    .eq("project_id", project.id)
    .order("impressions", { ascending: false });

  const keywordList = keywords || [];

  const totalClicks = keywordList.reduce((sum: number, keyword: Keyword) => {
    return sum + (keyword.clicks || 0);
  }, 0);

  const totalImpressions = keywordList.reduce(
    (sum: number, keyword: Keyword) => {
      return sum + (keyword.impressions || 0);
    },
    0
  );

  const averagePosition =
    keywordList.length > 0
      ? keywordList.reduce((sum: number, keyword: Keyword) => {
          return sum + Number(keyword.position || 0);
        }, 0) / keywordList.length
      : null;

  const averageCtr =
    totalImpressions > 0 ? totalClicks / totalImpressions : null;

  const pageOneKeywords = keywordList.filter((keyword: Keyword) => {
    const position = Number(keyword.position || 0);
    return position > 0 && position <= 10;
  });

  const nearPageOneKeywords = keywordList.filter((keyword: Keyword) => {
    const position = Number(keyword.position || 0);
    return position > 10 && position <= 20;
  });

  const lowCtrKeywords = keywordList.filter((keyword: Keyword) => {
    const impressions = keyword.impressions || 0;
    const clicks = keyword.clicks || 0;
    const ctr = keyword.ctr || 0;

    return impressions >= 5 && (clicks === 0 || ctr < 0.02);
  });

  const topOpportunities = [...keywordList]
    .map((keyword: Keyword) => ({
      ...keyword,
      opportunityScore: getOpportunityScore(keyword),
      intent: getKeywordIntent(keyword.query),
      status: getKeywordStatus(keyword),
      reason: getOpportunityReason(keyword),
    }))
    .filter((keyword) => keyword.opportunityScore > 0)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 8);

  const topKeywords = [...keywordList]
    .sort((a: Keyword, b: Keyword) => {
      return (b.impressions || 0) - (a.impressions || 0);
    })
    .slice(0, 50);

  const latestKeywordDate = keywordList[0]?.date
    ? new Date(keywordList[0].date).toLocaleDateString()
    : "No data yet";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Keyword Visibility</p>
          <h2 className="text-3xl font-bold">{project.name}</h2>
          <p className="text-muted-foreground">{project.domain}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/dashboard/projects/${project.id}`}>
              Overview
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/dashboard/projects/${project.id}/audit`}>
              Audit
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/dashboard/projects/${project.id}/reports`}>
              Reports
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Google Search Console Connection</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {gscConnection ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Google Search Console is connected. Fetch keyword data from your
                verified Search Console property.
              </p>

              <div className="grid gap-3 text-sm md:grid-cols-2">
                <p className="text-muted-foreground">
                  Last connected:{" "}
                  <span className="font-medium text-foreground">
                    {gscConnection.updated_at
                      ? new Date(gscConnection.updated_at).toLocaleString()
                      : "No date available"}
                  </span>
                </p>

                <p className="text-muted-foreground">
                  Latest keyword data:{" "}
                  <span className="font-medium text-foreground">
                    {latestKeywordDate}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <FetchGscKeywordsButton projectId={project.id} />
                <ConnectGscButton />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect Google Search Console to pull real keyword data,
                including clicks, impressions, CTR, and average position.
              </p>

              <ConnectGscButton />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalClicks}</p>
            <p className="text-sm text-muted-foreground">
              Last imported range.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalImpressions}</p>
            <p className="text-sm text-muted-foreground">
              Search result views.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Average CTR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{formatCtr(averageCtr)}</p>
            <p className="text-sm text-muted-foreground">
              Click-through rate.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Average Position</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {formatPosition(averagePosition)}
            </p>
            <p className="text-sm text-muted-foreground">
              Lower is better.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Page 1 Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{pageOneKeywords.length}</p>
            <p className="text-sm text-muted-foreground">
              Ranking in positions 1–10.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Near Page 1</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {nearPageOneKeywords.length}
            </p>
            <p className="text-sm text-muted-foreground">
              Ranking in positions 11–20.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Low CTR Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{lowCtrKeywords.length}</p>
            <p className="text-sm text-muted-foreground">
              Visibility with weak clicks.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Keyword Opportunities</CardTitle>
        </CardHeader>

        <CardContent>
          {topOpportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No keyword opportunities yet. Fetch Search Console data first.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Recommended Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {topOpportunities.map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell className="font-medium">
                      {keyword.query}
                    </TableCell>

                    <TableCell>{keyword.intent}</TableCell>

                    <TableCell>{keyword.status}</TableCell>

                    <TableCell>{keyword.impressions ?? 0}</TableCell>

                    <TableCell>{keyword.clicks ?? 0}</TableCell>

                    <TableCell>{formatPosition(keyword.position)}</TableCell>

                    <TableCell className="max-w-md text-sm text-muted-foreground">
                      {keyword.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyword Performance</CardTitle>
        </CardHeader>

        <CardContent>
          {topKeywords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No keyword data yet. Connect Google Search Console, then fetch
              keyword data for this project.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {topKeywords.map((keyword: Keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell className="font-medium">
                      {keyword.query}
                    </TableCell>

                    <TableCell>{getKeywordIntent(keyword.query)}</TableCell>

                    <TableCell>{getKeywordStatus(keyword)}</TableCell>

                    <TableCell>{keyword.clicks ?? 0}</TableCell>

                    <TableCell>{keyword.impressions ?? 0}</TableCell>

                    <TableCell>{formatCtr(keyword.ctr)}</TableCell>

                    <TableCell>{formatPosition(keyword.position)}</TableCell>

                    <TableCell>
                      {keyword.date
                        ? new Date(keyword.date).toLocaleDateString()
                        : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}