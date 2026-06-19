import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Project = {
  id: string;
  name: string;
  domain: string;
  created_at: string;
};

type PageSpeedReport = {
  project_id: string;
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;
  created_at: string;
};

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, domain, created_at")
    .order("created_at", { ascending: false });

  if (projectsError) {
    return (
      <div>
        <h2 className="text-3xl font-bold">Projects</h2>
        <p className="mt-4 text-sm text-red-500">
          {projectsError.message}
        </p>
      </div>
    );
  }

  const projectIds = projects?.map((project: Project) => project.id) || [];

  const { data: reports } = await supabase
    .from("pagespeed_reports")
    .select(
      "project_id, performance_score, accessibility_score, best_practices_score, seo_score, created_at"
    )
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  const latestReportByProject = new Map<string, PageSpeedReport>();

  reports?.forEach((report: PageSpeedReport) => {
    if (!latestReportByProject.has(report.project_id)) {
      latestReportByProject.set(report.project_id, report);
    }
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Projects</h2>
          <p className="text-muted-foreground">
            Manage website audits, keyword visibility, and SEO reports.
          </p>
        </div>

        <Button asChild>
          <Link href="/dashboard/projects/new">Add Project</Link>
        </Button>
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No projects yet</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create your first website project to start tracking audits,
              keywords, and reports.
            </p>

            <Button asChild>
              <Link href="/dashboard/projects/new">Create Project</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project: Project) => {
            const latestReport = latestReportByProject.get(project.id);

            return (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {project.domain}
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        SEO Score
                      </p>
                      <p className="text-2xl font-bold">
                        {latestReport?.seo_score ?? "--"}
                      </p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Performance
                      </p>
                      <p className="text-2xl font-bold">
                        {latestReport?.performance_score ?? "--"}
                      </p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Issues
                      </p>
                      <p className="text-2xl font-bold">--</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/projects/${project.id}`}>
                        Overview
                      </Link>
                    </Button>

                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/projects/${project.id}/audit`}>
                        Audit
                      </Link>
                    </Button>

                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/projects/${project.id}/keywords`}>
                        Keywords
                      </Link>
                    </Button>

                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/projects/${project.id}/reports`}>
                        Reports
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}