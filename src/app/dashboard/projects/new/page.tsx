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

type Plan = "free" | "starter" | "growth" | "agency";

type NewProjectPageProps = {
  searchParams?: Promise<{
    error?: string;
    plan?: string;
  }>;
};

type Subscription = {
  id: string;
  user_id: string;
  plan: Plan;
  status: string;
  billing_mode: string;
};

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

function formatPlanName(plan: string | null | undefined) {
  if (!plan) {
    return "Free";
  }

  return plan.slice(0, 1).toUpperCase() + plan.slice(1);
}

function getProjectLimit(plan: string | null | undefined) {
  if (plan === "agency") {
    return null;
  }

  if (plan === "growth") {
    return 10;
  }

  return 1;
}

function getLimitText(plan: string | null | undefined) {
  const limit = getProjectLimit(plan);

  if (limit === null) {
    return "Unlimited projects";
  }

  return `${limit} project${limit === 1 ? "" : "s"}`;
}

function getPlanUpgradeMessage(plan: string | null | undefined) {
  if (plan === "free") {
    return "Your Free plan includes 1 project. Request Starter, Growth, or Agency to add more projects.";
  }

  if (plan === "starter") {
    return "Your Starter plan includes 1 project. Request Growth or Agency to add more projects.";
  }

  if (plan === "growth") {
    return "Your Growth plan includes 10 projects. Request Agency for unlimited projects.";
  }

  return "Your current plan limit has been reached.";
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

  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan, status, billing_mode")
    .eq("user_id", user.id)
    .maybeSingle();

  let subscription = subscriptionData as Subscription | null;

  if (!subscription) {
    const { data: createdSubscription } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan: "free",
        status: "active",
        billing_mode: "manual",
      })
      .select("id, user_id, plan, status, billing_mode")
      .single();

    subscription = createdSubscription as Subscription | null;
  }

  const currentPlan = subscription?.plan || "free";
  const projectLimit = getProjectLimit(currentPlan);

  const { count: projectCount } = await supabase
    .from("projects")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id);

  const currentProjectCount = projectCount || 0;

  if (projectLimit !== null && currentProjectCount >= projectLimit) {
    redirect(
      `/dashboard/projects/new?error=project-limit&plan=${currentPlan}`
    );
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

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan, status, billing_mode")
    .eq("user_id", user.id)
    .maybeSingle();

  let subscription = subscriptionData as Subscription | null;

  if (!subscription) {
    const { data: createdSubscription } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan: "free",
        status: "active",
        billing_mode: "manual",
      })
      .select("id, user_id, plan, status, billing_mode")
      .single();

    subscription = createdSubscription as Subscription | null;
  }

  const currentPlan = subscription?.plan || "free";
  const projectLimit = getProjectLimit(currentPlan);

  const { count: projectCount } = await supabase
    .from("projects")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id);

  const currentProjectCount = projectCount || 0;
  const hasReachedLimit =
    projectLimit !== null && currentProjectCount >= projectLimit;

  const errorMessage =
    error === "missing-fields"
      ? "Please enter both project name and website URL."
      : error === "create-failed"
        ? "Project could not be created. Please check your details and try again."
        : error === "project-limit"
          ? getPlanUpgradeMessage(currentPlan)
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

            <Button asChild variant="outline">
              <Link href="/dashboard/billing">Billing</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Current Plan
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-slate-950">
              {formatPlanName(currentPlan)}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Active account plan.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[#d4af37]/50 bg-[#fff8df] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
              Project Usage
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-slate-950">
              {currentProjectCount}
              <span className="text-base font-semibold text-[#7a5b00]/70">
                {" "}
                / {projectLimit === null ? "∞" : projectLimit}
              </span>
            </p>

            <p className="mt-2 text-sm text-[#7a5b00]/80">
              {getLimitText(currentPlan)} allowed.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Limit Status
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-slate-950">
              {hasReachedLimit ? "Limit Reached" : "Available"}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {hasReachedLimit
                ? "Upgrade needed to add more projects."
                : "You can create another project."}
            </p>
          </CardContent>
        </Card>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {hasReachedLimit ? (
        <section className="rounded-3xl border border-[#d4af37]/50 bg-[#fff8df] p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b00]">
                Plan Limit
              </p>

              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                You reached your project limit.
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7a5b00]/80">
                {getPlanUpgradeMessage(currentPlan)}
              </p>
            </div>

            <Button asChild>
              <Link href="/dashboard/billing">Request Upgrade</Link>
            </Button>
          </div>
        </section>
      ) : null}

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
                  disabled={hasReachedLimit}
                  className="h-12 w-full rounded-2xl border border-[#e6dcc8] bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
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
                  disabled={hasReachedLimit}
                  className="h-12 w-full rounded-2xl border border-[#e6dcc8] bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
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
                <Button type="submit" disabled={hasReachedLimit}>
                  {hasReachedLimit ? "Project Limit Reached" : "Create Project"}
                </Button>

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