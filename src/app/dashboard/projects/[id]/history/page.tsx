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

type HistoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type AuditRun = {
  id: string;
  score: number | null;
  status: string | null;
  created_at: string;
};

type AuditIssue = {
  id: string;
  audit_id: string;
  severity: string | null;
};

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "No date";
  }

  return new Date(date).toLocaleString();
}

function getScoreStatus(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "Not scored";
  }

  if (score >= 90) {
    return "Strong";
  }

  if (score >= 70) {
    return "Needs work";
  }

  return "Needs attention";
}

function getScoreBadgeClass(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  if (score >= 90) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (score >= 70) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function getStatusClass(status: string | null | undefined) {
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "running" || status === "pending") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getIssueCounts(auditId: string, issues: AuditIssue[]) {
  const auditIssues = issues.filter((issue) => issue.audit_id === auditId);

  return {
    total: auditIssues.length,
    high: auditIssues.filter((issue) => issue.severity === "high").length,
    medium: auditIssues.filter((issue) => issue.severity === "medium").length,
    low: auditIssues.filter((issue) => issue.severity === "low").length,
  };
}

function getAverageScore(audits: AuditRun[]) {
  const scoredAudits = audits.filter((audit) => {
    return audit.score !== null && audit.score !== undefined;
  });

  if (scoredAudits.length === 0) {
    return null;
  }

  const total = scoredAudits.reduce((sum, audit) => {
    return sum + Number(audit.score || 0);
  }, 0);

  return Math.round(total / scoredAudits.length);
}

function getBestScore(audits: AuditRun[]) {
  const scores = audits
    .map((audit) => audit.score)
    .filter((score) => score !== null && score !== undefined) as number[];

  if (scores.length === 0) {
    return null;
  }

  return Math.max(...scores);
}

function getLatestScoreChange(audits: AuditRun[]) {
  if (audits.length < 2) {
    return null;
  }

  const latest = audits[0]?.score;
  const previous = audits[1]?.score;

  if (
    latest === null ||
    latest === undefined ||
    previous === null ||
    previous === undefined
  ) {
    return null;
  }

  return Number(latest) - Number(previous);
}

function formatScoreChange(change: number | null) {
  if (change === null) {
    return "No comparison yet";
  }

  if (change > 0) {
    return `+${change} from previous audit`;
  }

  if (change < 0) {
    return `${change} from previous audit`;
  }

  return "No score change";
}

export default async function ProjectHistoryPage({ params }: HistoryPageProps) {
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

  const { data: audits } = await supabase
    .from("audits")
    .select("id, score, status, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const auditList = (audits || []) as AuditRun[];
  const auditIds = auditList.map((audit) => audit.id);

  const { data: auditIssues } =
    auditIds.length > 0
      ? await supabase
          .from("audit_issues")
          .select("id, audit_id, severity")
          .in("audit_id", auditIds)
      : { data: [] };

  const issueList = (auditIssues || []) as AuditIssue[];

  const latestAudit = auditList[0];
  const averageScore = getAverageScore(auditList);
  const bestScore = getBestScore(auditList);
  const scoreChange = getLatestScoreChange(auditList);

  const totalIssues = issueList.length;
  const highIssues = issueList.filter((issue) => issue.severity === "high")
    .length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Audit Timeline
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">
            Audit History
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Review previous audit runs, score movement, and issue volume for{" "}
            {project.name}.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/dashboard/projects/${project.id}`}>Overview</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/dashboard/projects/${project.id}/recommendations`}>
              Recommendations
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/dashboard/projects/${project.id}/reports`}>
              Report
            </Link>
          </Button>

          <Button asChild>
            <Link href={`/dashboard/projects/${project.id}/audit`}>
              Run New Audit
            </Link>
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border bg-white shadow-sm">
        <div className="relative p-8">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-100 blur-3xl" />
          <div className="absolute right-32 top-10 h-40 w-40 rounded-full bg-emerald-100 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-36 w-36 rounded-full bg-amber-100 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {project.domain}
                </p>
                <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight">
                  Track SEO audit progress over time.
                </h1>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Use this page to compare recent audit scores, review previous
                issue counts, and confirm whether fixes are improving the
                project after each scan.
              </p>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  {auditList.length} audit run(s)
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${getScoreBadgeClass(
                    latestAudit?.score
                  )}`}
                >
                  Latest score: {latestAudit?.score ?? "--"}
                </span>

                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {formatScoreChange(scoreChange)}
                </span>
              </div>
            </div>

            <Card className="border-slate-200 bg-background/90 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Latest Audit</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-medium">
                    {latestAudit?.score ?? "--"}
                  </span>
                </div>

                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">
                    {latestAudit?.status || "No audit yet"}
                  </span>
                </div>

                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {formatDate(latestAudit?.created_at)}
                  </span>
                </div>

                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Score Movement</span>
                  <span className="font-medium">
                    {formatScoreChange(scoreChange)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Audit Runs",
            value: auditList.length,
            helper: "Saved scans",
            className: "border-slate-200 bg-white",
          },
          {
            label: "Average Score",
            value: averageScore ?? "--",
            helper: "Across saved audits",
            className: "border-blue-200 bg-blue-50",
          },
          {
            label: "Best Score",
            value: bestScore ?? "--",
            helper: "Highest recorded score",
            className: "border-emerald-200 bg-emerald-50",
          },
          {
            label: "High Issues",
            value: highIssues,
            helper: `${totalIssues} total issue records`,
            className: "border-rose-200 bg-rose-50",
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

      {auditList.length === 0 ? (
        <Card className="border-dashed bg-slate-50 shadow-sm">
          <CardContent className="flex min-h-[340px] flex-col items-center justify-center p-10 text-center">
            <div className="rounded-full border bg-white px-4 py-2 text-sm font-medium text-muted-foreground">
              No audit history yet
            </div>

            <h3 className="mt-5 text-2xl font-bold tracking-tight">
              Run the first audit for this project
            </h3>

            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Audit runs will appear here after you scan this project. Each run
              will show the score, status, date, and issue count.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href={`/dashboard/projects/${project.id}/audit`}>
                  Run Audit
                </Link>
              </Button>

              <Button asChild variant="outline">
                <Link href={`/dashboard/projects/${project.id}`}>
                  Back to Overview
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Previous Audit Runs</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest audit scans saved for this project.
                </p>
              </div>

              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/projects/${project.id}/audit`}>
                  Run New Audit
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Score Health</TableHead>
                    <TableHead className="text-center">Issues</TableHead>
                    <TableHead className="text-center">High</TableHead>
                    <TableHead className="text-center">Medium</TableHead>
                    <TableHead className="text-center">Low</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {auditList.map((audit) => {
                    const issueCounts = getIssueCounts(audit.id, issueList);

                    return (
                      <TableRow key={audit.id}>
                        <TableCell className="min-w-[190px] font-medium">
                          {formatDate(audit.created_at)}
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${getStatusClass(
                              audit.status
                            )}`}
                          >
                            {audit.status || "unknown"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-lg font-bold">
                            {audit.score ?? "--"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getScoreBadgeClass(
                              audit.score
                            )}`}
                          >
                            {getScoreStatus(audit.score)}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          {issueCounts.total}
                        </TableCell>

                        <TableCell className="text-center text-rose-700">
                          {issueCounts.high}
                        </TableCell>

                        <TableCell className="text-center text-amber-700">
                          {issueCounts.medium}
                        </TableCell>

                        <TableCell className="text-center text-slate-600">
                          {issueCounts.low}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}