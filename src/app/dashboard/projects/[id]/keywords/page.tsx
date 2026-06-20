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

function formatCtr(ctr: number | null) {
  if (ctr === null || ctr === undefined) {
    return "--";
  }

  return `${(Number(ctr) * 100).toFixed(2)}%`;
}

function formatPosition(position: number | null) {
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
    .order("clicks", { ascending: false });

  const totalClicks =
    keywords?.reduce((sum: number, keyword: Keyword) => {
      return sum + (keyword.clicks || 0);
    }, 0) || 0;

  const totalImpressions =
    keywords?.reduce((sum: number, keyword: Keyword) => {
      return sum + (keyword.impressions || 0);
    }, 0) || 0;

  const averagePosition =
    keywords && keywords.length > 0
      ? keywords.reduce((sum: number, keyword: Keyword) => {
          return sum + Number(keyword.position || 0);
        }, 0) / keywords.length
      : null;

  const averageCtr =
    totalImpressions > 0 ? totalClicks / totalImpressions : null;

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

              <p className="text-sm text-muted-foreground">
                Last connected:{" "}
                <span className="font-medium text-foreground">
                  {gscConnection.updated_at
                    ? new Date(gscConnection.updated_at).toLocaleString()
                    : "No date available"}
                </span>
              </p>

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

      <Card>
        <CardHeader>
          <CardTitle>Keyword Performance</CardTitle>
        </CardHeader>

        <CardContent>
          {!keywords || keywords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No keyword data yet. Connect Google Search Console, then fetch
              keyword data for this project.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {keywords.map((keyword: Keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell className="font-medium">
                      {keyword.query}
                    </TableCell>

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