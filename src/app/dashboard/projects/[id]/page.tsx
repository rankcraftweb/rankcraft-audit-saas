import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, domain, created_at")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  const { data: latestReport } = await supabase
    .from("pagespeed_reports")
    .select(
      "performance_score, accessibility_score, best_practices_score, seo_score, created_at"
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Project Overview</p>
        <h2 className="text-3xl font-bold">{project.name}</h2>
        <p className="text-muted-foreground">{project.domain}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/dashboard/projects/${project.id}/audit`}>
            Site Audit
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">SEO Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {latestReport?.seo_score ?? "--"}
            </p>
            <p className="text-sm text-muted-foreground">
              Latest PageSpeed SEO score.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {latestReport?.performance_score ?? "--"}
            </p>
            <p className="text-sm text-muted-foreground">
              Latest loading performance.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Accessibility</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {latestReport?.accessibility_score ?? "--"}
            </p>
            <p className="text-sm text-muted-foreground">
              Latest accessibility score.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {latestReport?.best_practices_score ?? "--"}
            </p>
            <p className="text-sm text-muted-foreground">
              Latest best practices score.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}