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

type Audit = {
  id: string;
  score: number | null;
  status: string | null;
  created_at: string;
};

type PageSpeedReport = {
  id?: string;
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;
  created_at: string;
};

type AuditIssue = {
  audit_id: string;
};

export default async function AuditHistoryPage({ params }: HistoryPageProps) {
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
    .order("created_at", { ascending: false });

  const auditIds = audits?.map((audit: Audit) => audit.id) || [];

  const { data: auditIssues } =
    auditIds.length > 0
      ? await supabase
          .from("audit_issues")
          .select("audit_id")
          .in("audit_id", auditIds)
      : { data: [] };

  const issueCountByAudit = new Map<string, number>();

  auditIssues?.forEach((issue: AuditIssue) => {
    issueCountByAudit.set(
      issue.audit_id,
      (issueCountByAudit.get(issue.audit_id) || 0) + 1
    );
  });

  const { data: reports } = await supabase
    .from("pagespeed_reports")
    .select(
      "id, performance_score, accessibility_score, best_practices_score, seo_score, created_at"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Audit History</p>
        <h2 className="text-3xl font-bold">{project.name}</h2>
        <p className="text-muted-foreground">{project.domain}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/dashboard/projects/${project.id}`}>Overview</Link>
        </Button>

        <Button asChild variant="outline">
          <Link href={`/dashboard/projects/${project.id}/audit`}>
            Run Audit
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link href={`/dashboard/projects/${project.id}/keywords`}>
            Keywords
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link href={`/dashboard/projects/${project.id}/reports`}>
            Reports
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Previous SEO Audits</CardTitle>
        </CardHeader>

        <CardContent>
          {!audits || audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audit history yet. Run your first SEO audit.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SEO Score</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {audits.map((audit: Audit) => (
                  <TableRow key={audit.id}>
                    <TableCell>
                      {new Date(audit.created_at).toLocaleString()}
                    </TableCell>

                    <TableCell className="capitalize">
                      {audit.status || "completed"}
                    </TableCell>

                    <TableCell>{audit.score ?? "--"}</TableCell>

                    <TableCell>
                      {issueCountByAudit.get(audit.id) ?? 0}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/dashboard/projects/${project.id}/history/${audit.id}`}
                        >
                          View Issues
                        </Link>
                      </Button>
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
          <CardTitle>PageSpeed History</CardTitle>
        </CardHeader>

        <CardContent>
          {!reports || reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No PageSpeed reports yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Accessibility</TableHead>
                  <TableHead>Best Practices</TableHead>
                  <TableHead>SEO</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {reports.map((report: PageSpeedReport) => (
                  <TableRow key={report.id || report.created_at}>
                    <TableCell>
                      {new Date(report.created_at).toLocaleString()}
                    </TableCell>

                    <TableCell>
                      {report.performance_score ?? "--"}
                    </TableCell>

                    <TableCell>
                      {report.accessibility_score ?? "--"}
                    </TableCell>

                    <TableCell>
                      {report.best_practices_score ?? "--"}
                    </TableCell>

                    <TableCell>{report.seo_score ?? "--"}</TableCell>
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