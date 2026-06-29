import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function normalizeDomain(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  const withoutTrailingSlash = trimmed.replace(/\/$/, "");

  if (
    withoutTrailingSlash.startsWith("http://") ||
    withoutTrailingSlash.startsWith("https://")
  ) {
    return withoutTrailingSlash;
  }

  return `https://${withoutTrailingSlash}`;
}

function normalizeDomainForDisplay(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

async function createProject(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const domainInput = String(formData.get("domain") || "").trim();
  const domain = normalizeDomain(domainInput);

  if (!name || !domain) {
    redirect("/dashboard/projects/new?error=missing-fields");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      name,
      domain,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (error || !project) {
    redirect("/dashboard/projects/new?error=create-failed");
  }

  redirect(`/dashboard/projects/${project.id}`);
}

type NewProjectPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error;

  const errorMessage =
    error === "missing-fields"
      ? "Please enter both project name and website URL."
      : error === "create-failed"
        ? "Project could not be created. Please check your details and try again."
        : null;

  const exampleProjects = [
    {
      name: "RankCraft Web",
      domain: "rankcraftweb.com",
    },
    {
      name: "Client Roofing Website",
      domain: "clientroofing.com",
    },
    {
      name: "Local Service Business",
      domain: "localservicebusiness.com",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e6dcc8] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">← Back to Dashboard</Link>
            </Button>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Add Project
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Create a new audit project
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Add the client website name and URL. After creating the project,
              you will go straight to the overview where you can run the audit,
              review keywords, open the report, and check recommendations.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
            <Button asChild variant="outline">
              <Link href="/dashboard/projects">SEO Audit</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="border-b border-[#eee5d4] p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Project Details
            </p>

            <CardTitle className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              Website information
            </CardTitle>

            <p className="text-sm leading-6 text-slate-500">
              Use a clear project name and the website URL you want to audit.
            </p>
          </CardHeader>

          <CardContent className="p-5 md:p-6">
            {errorMessage ? (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <form action={createProject} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-semibold text-slate-950"
                >
                  Project Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Example: RankCraft Web"
                  className="h-12 w-full rounded-2xl border border-[#e6dcc8] bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10"
                  required
                />

                <p className="text-xs leading-5 text-slate-500">
                  Use the client name, brand name, or website name.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="domain"
                  className="text-sm font-semibold text-slate-950"
                >
                  Website URL
                </label>

                <input
                  id="domain"
                  name="domain"
                  type="text"
                  placeholder="example.com"
                  className="h-12 w-full rounded-2xl border border-[#e6dcc8] bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10"
                  required
                />

                <p className="text-xs leading-5 text-slate-500">
                  You can enter example.com or https://example.com.
                </p>
              </div>

              <div className="rounded-2xl border border-[#d4af37]/50 bg-[#fff8df] p-4">
                <p className="text-sm font-semibold text-[#7a5b00]">
                  Next step after creating
                </p>

                <p className="mt-2 text-sm leading-6 text-[#7a5b00]/80">
                  You will be redirected to the Overview page. From there, run
                  the first audit, sync keyword data, open the report, and
                  review recommendations.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit">Create Project</Button>

                <Button asChild type="button" variant="outline">
                  <Link href="/dashboard">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-[#2b2413] bg-[#111111] text-white shadow-sm">
            <CardHeader className="border-b border-white/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b6a46a]">
                Workflow
              </p>

              <CardTitle className="mt-2 text-xl font-bold tracking-tight text-white">
                What happens next
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 p-5">
              {[
                {
                  step: "01",
                  title: "Create project",
                  description:
                    "Add the website name and URL to start the audit workspace.",
                },
                {
                  step: "02",
                  title: "Run audit",
                  description:
                    "Scan metadata, headings, canonical tags, mobile setup, and technical issues.",
                },
                {
                  step: "03",
                  title: "Review keywords",
                  description:
                    "Use GSC data to find ranking, CTR, and visibility opportunities.",
                },
                {
                  step: "04",
                  title: "Export report",
                  description:
                    "Open a compact client-ready report with issues and action steps.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-xs font-bold text-[#f5d56a]">
                      {item.step}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.title}
                      </p>

                      <p className="mt-1 text-sm leading-5 text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-[#e6dcc8] bg-[#faf7ef] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-950">
                Example project names
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {exampleProjects.map((project) => (
                <div
                  key={project.domain}
                  className="rounded-2xl border border-[#e6dcc8] bg-white p-4"
                >
                  <p className="font-semibold text-slate-950">
                    {project.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {normalizeDomainForDisplay(project.domain)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}