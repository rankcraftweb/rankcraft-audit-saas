import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const projects = [
  {
    id: "rankcraftweb",
    name: "RankCraftWeb",
    domain: "https://rankcraftweb.com",
    score: 82,
    keywords: 36,
    issues: 14,
  },
  {
    id: "practical-exterior-maintenance",
    name: "Practical Exterior Maintenance",
    domain: "https://practicalexteriormaintenance.com",
    score: 76,
    keywords: 58,
    issues: 21,
  },
];

export default function ProjectsPage() {
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

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
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
                  <p className="text-xs text-muted-foreground">SEO Score</p>
                  <p className="text-2xl font-bold">{project.score}</p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Keywords</p>
                  <p className="text-2xl font-bold">{project.keywords}</p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Issues</p>
                  <p className="text-2xl font-bold">{project.issues}</p>
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
        ))}
      </div>
    </div>
  );
}