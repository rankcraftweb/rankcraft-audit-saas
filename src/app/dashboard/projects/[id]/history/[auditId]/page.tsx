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

type AuditDetailPageProps = {
  params: Promise<{
    id: string;
    auditId: string;
  }>;
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

export default async function AuditDetailPage({
  params,
}: AuditDetailPageProps) {
  const { id, auditId } = await params;

  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, domain")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .select("id, project_id, score, status, created_at")
    .eq("id", auditId)
    .eq("project_id", project.id)
    .single();

  if (auditError || !audit) {
    notFound();
  }

  const { data: issues } = await supabase
    .from("audit_issues")
    .select("id, title, description, severity, category, recommendation, created_at")
    .eq("audit_id", audit.id)
    .order("created_at", { ascending: true });

  const issueCount = issues?.length || 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Audit Details</p>
        <h2 className="text-3xl font-bold">{project.name}</h2>
        <p className="text-muted-foreground">{project.domain}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/dashboard/projects/${project.id}/history`}>
            Back to History
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link href={`/dashboard/projects/${project.id}/audit`}>
            Run New Audit
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link href={`/dashboard/projects/${project.id}`}>
            Overview
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Audit Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {new Date(audit.created_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">
              {audit.status || "completed"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">SEO Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{audit.score ?? "--"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{issueCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">Detected SEO Issues</h3>
          <p className="text-muted-foreground">
            Review the issues found during this specific audit scan.
          </p>
        </div>

        {issueCount === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No issues found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This scan did not detect any basic SEO issues.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {issues?.map((issue: AuditIssue) => (
              <Card key={issue.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">
                        {issue.title}
                      </CardTitle>

                      <p className="mt-1 text-sm text-muted-foreground capitalize">
                        {issue.category || "general"}
                      </p>
                    </div>

                    <span className="rounded-full border px-3 py-1 text-xs capitalize">
                      {issue.severity || "medium"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Problem</p>
                    <p className="text-sm text-muted-foreground">
                      {issue.description || "No description available."}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Recommended Fix</p>
                    <p className="text-sm text-muted-foreground">
                      {issue.recommendation ||
                        "Review this issue and apply the appropriate SEO fix."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}