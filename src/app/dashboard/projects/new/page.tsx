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
      <section className="overflow-hidden rounded-3xl border border-[#e6dcc8] bg-white shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-[#d4af37]/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-slate-100 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                New Project
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Add a website to audit
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Create a new SEO audit project, then run technical checks, sync
                Google Search Console keyword data, export reports, and review
                recommendations.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/projects">Back to Projects</Link>
              </Button>

              <Button asChild variant="outline">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-950">
              Project details
            </CardTitle>
            <p className="text-sm leading-6 text-slate-500">
              Add the client website name and domain. The domain can include or
              exclude https://.
            </p>
          </CardHeader>

          <CardContent>
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
                  Project name
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
                  Use the client name or website name. This will appear on the
                  project dashboard and reports.
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
                  You can enter example.com or https://example.com. RankCraft
                  Audit will normalize the URL automatically.
                </p>
              </div>

              <div className="rounded-2xl border border-[#d4af37]/50 bg-[#fff8df] p-4">
                <p className="text-sm font-semibold text-[#7a5b00]">
                  What happens next?
                </p>

                <p className="mt-2 text-sm leading-6 text-[#7a5b00]/80">
                  After creating the project, open the project overview and run
                  the first audit. Once Google Search Console is connected, the
                  Keywords, Reports, and Recommendations pages will become more
                  useful.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit">Create Project</Button>

                <Button asChild type="button" variant="outline">
                  <Link href="/dashboard/projects">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-[#2b2413] bg-[#111111] text-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b6a46a]">
                Project Workflow
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                From audit to action plan
              </h2>

              <div className="mt-5 grid gap-3">
                {[
                  {
                    step: "01",
                    title: "Create project",
                    description:
                      "Add the website name and domain to start tracking SEO data.",
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
                      "Generate a compact client-ready report with issues and action steps.",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="rounded-2xl border border-white/10 bg-white/10 p-4"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-xs font-bold text-[#f5d56a]">
                        {item.step}
                      </div>

                      <div>
                        <p className="font-semibold text-white">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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