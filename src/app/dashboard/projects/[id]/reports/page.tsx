import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Project</p>
        <h2 className="text-3xl font-bold">Website SEO Overview</h2>
      </div>

      <div className="flex gap-3">
        <Link className="rounded-lg border px-4 py-2 text-sm" href={`/dashboard/projects/${params.id}/audit`}>
          Audit
        </Link>
        <Link className="rounded-lg border px-4 py-2 text-sm" href={`/dashboard/projects/${params.id}/keywords`}>
          Keywords
        </Link>
        <Link className="rounded-lg border px-4 py-2 text-sm" href={`/dashboard/projects/${params.id}/reports`}>
          Reports
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">SEO Health</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">82</p>
            <p className="text-sm text-muted-foreground">Good condition</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">36</p>
            <p className="text-sm text-muted-foreground">Tracked from GSC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Open Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">14</p>
            <p className="text-sm text-muted-foreground">Needs review</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}