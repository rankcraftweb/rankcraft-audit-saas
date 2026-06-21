import Link from "next/link";
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

type Project = {
  id: string;
  name: string;
  domain: string;
  created_at: string;
};

type PageSpeedReport = {
  project_id: string;
  seo_score: number | null;
  performance_score: number | null;
  created_at: string;
};

type Audit = {
  id: string;
  project_id: string;
  score: number | null;
  status: string | null;
  created_at: string;
};

type AuditIssue = {
  audit_id: string;
};

type Keyword = {
  project_id: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
};

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return Math.round(value).toString();
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "--";
  }

  return new Date(date).toLocaleString();
}

function getScoreLabel(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "No audit yet";
  }

  if (score >= 90) {
    return "Strong";
  }

  if (score >= 70) {
    return "Needs improvement";
  }

  return "Needs attention";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, domain, created_at")
    .order("created_at", { ascending: false });

  if (projectsError) {
    return (
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="mt-4 text-sm text-red-500">
          {projectsError.message}
        </p>
      </div>
    );
  }

  const projectList = projects || [];
  const projectIds = projectList.map((project: Project) => project.id);

  const { data: pageSpeedReports } =
    projectIds.length > 0
      ? await supabase
          .from("pagespeed_reports")
          .select("project_id, seo_score, performance_score, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { data: audits } =
    projectIds.length > 0
      ? await supabase
          .from("audits")
          .select("id, project_id, score, status, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const auditIds = audits?.map((audit: Audit) => audit.id) || [];

  const { data: auditIssues } =
    auditIds.length > 0
      ? await supabase
          .from("audit_issues")
          .select("audit_id")
          .in("audit_id", auditIds)
      : { data: [] };

  const { data: keywords } =
    projectIds.length > 0
      ? await supabase
          .from("keywords")
          .select("project_id, clicks, impressions, ctr, position")
          .in("project_id", projectIds)
      : { data: [] };

  const latestReportByProject = new Map<string, PageSpeedReport>();

  pageSpeedReports?.forEach((report: PageSpeedReport) => {
    if (!latestReportByProject.has(report.project_id)) {
      latestReportByProject.set(report.project_id, report);
    }
  });

  const latestAuditByProject = new Map<string, Audit>();

  audits?.forEach((audit: Audit) => {
    if (!latestAuditByProject.has(audit.project_id)) {
      latestAuditByProject.set(audit.project_id, audit);
    }
  });

  const issueCountByAudit = new Map<string, number>();

  auditIssues?.forEach((issue: AuditIssue) => {
    issueCountByAudit.set(
      issue.audit_id,
      (issueCountByAudit.get(issue.audit_id) || 0) + 1
    );
  });

  const totalProjects = projectList.length;
  const totalIssues = auditIssues?.length || 0;
  const totalKeywords = keywords?.length || 0;

  const totalClicks =
    keywords?.reduce((sum: number, keyword: Keyword) => {
      return sum + (keyword.clicks || 0);
    }, 0) || 0;

  const totalImpressions =
    keywords?.reduce((sum: number, keyword: Keyword) => {
      return sum + (keyword.impressions || 0);
    }, 0) || 0;

  const averageSeoScore =
    pageSpeedReports && pageSpeedReports.length > 0
      ? pageSpeedReports.reduce(
          (sum: number, report: PageSpeedReport) =>
            sum + Number(report.seo_score || 0),
          0
        ) / pageSpeedReports.length
      : null;

  const latestAudit = audits?.[0] || null;
  const latestProjectForAudit = latestAudit
    ? projectList.find(
        (project: Project) => project.id === latestAudit.project_id
      )
    : null;

  const recentProjects = projectList.slice(0, 5);
  const recentAudits = audits?.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">SEO SaaS Dashboard</p>
          <h2 className="text-3xl font-bold">Overview</h2>
          <p className="text-muted-foreground">
            Track projects, audits, issues, and keyword visibility.
          </p>
        </div>

        <Button asChild>
          <Link href="/dashboard/projects/new">Add Project</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalProjects}</p>
            <p className="text-sm text-muted-foreground">
              Active website projects.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg. SEO Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {formatScore(averageSeoScore)}
            </p>
            <p className="text-sm text-muted-foreground">
              {getScoreLabel(averageSeoScore)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Open Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalIssues}</p>
            <p className="text-sm text-muted-foreground">
              Total detected SEO issues.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tracked Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalKeywords}</p>
            <p className="text-sm text-muted-foreground">
              Imported from GSC.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">GSC Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {formatNumber(totalClicks)}
            </p>
            <p className="text-sm text-muted-foreground">
              From imported keyword data.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">GSC Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {formatNumber(totalImpressions)}
            </p>
            <p className="text-sm text-muted-foreground">
              Search result visibility.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Latest Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {latestAudit?.score ?? "--"}
            </p>
            <p className="text-sm text-muted-foreground">
              {latestProjectForAudit
                ? latestProjectForAudit.name
                : "No audit yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>

          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No projects yet. Create your first project to start running
                  audits and tracking keyword visibility.
                </p>

                <Button asChild>
                  <Link href="/dashboard/projects/new">Create Project</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>SEO</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {recentProjects.map((project: Project) => {
                    const latestReport = latestReportByProject.get(project.id);
                    const latestAuditForProject =
                      latestAuditByProject.get(project.id);
                    const issueCount = latestAuditForProject?.id
                      ? issueCountByAudit.get(latestAuditForProject.id) || 0
                      : null;

                    return (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{project.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {project.domain}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          {latestReport?.seo_score ?? "--"}
                        </TableCell>

                        <TableCell>
                          {latestReport?.performance_score ?? "--"}
                        </TableCell>

                        <TableCell>{issueCount ?? "--"}</TableCell>

                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/projects/${project.id}`}>
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Audit Activity</CardTitle>
          </CardHeader>

          <CardContent>
            {recentAudits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No audit activity yet. Run a full SEO audit from a project page.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {recentAudits.map((audit: Audit) => {
                    const project = projectList.find(
                      (item: Project) => item.id === audit.project_id
                    );

                    return (
                      <TableRow key={audit.id}>
                        <TableCell>
                          {project ? (
                            <Link
                              href={`/dashboard/projects/${project.id}/history/${audit.id}`}
                              className="font-medium hover:underline"
                            >
                              {project.name}
                            </Link>
                          ) : (
                            "Unknown project"
                          )}
                        </TableCell>

                        <TableCell>{audit.score ?? "--"}</TableCell>

                        <TableCell className="capitalize">
                          {audit.status || "completed"}
                        </TableCell>

                        <TableCell>{formatDate(audit.created_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}