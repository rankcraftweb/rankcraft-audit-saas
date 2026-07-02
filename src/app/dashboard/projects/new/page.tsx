import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  if (!trimmed) return "";
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
  return domain.replace("https://", "").replace("http://", "").replace(/\/$/, "");
}

function formatPlanName(plan: string | null | undefined) {
  if (!plan) return "Free";
  return plan.slice(0, 1).toUpperCase() + plan.slice(1);
}

function getProjectLimit(plan: string | null | undefined) {
  if (plan === "agency") return null;
  if (plan === "growth") return 10;
  return 1;
}

function getLimitText(plan: string | null | undefined) {
  const limit = getProjectLimit(plan);
  if (limit === null) return "Unlimited projects";
  return `${limit} project${limit === 1 ? "" : "s"}`;
}

function getPlanUpgradeMessage(plan: string | null | undefined) {
  if (plan === "free")
    return "Your Free plan includes 1 project. Request Starter, Growth, or Agency to add more projects.";
  if (plan === "starter")
    return "Your Starter plan includes 1 project. Request Growth or Agency to add more projects.";
  if (plan === "growth")
    return "Your Growth plan includes 10 projects. Request Agency for unlimited projects.";
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

  if (!user) redirect("/login");

  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan, status, billing_mode")
    .eq("user_id", user.id)
    .maybeSingle();

  let subscription = subscriptionData as Subscription | null;

  if (!subscription) {
    const { data: created } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan: "free",
        status: "active",
        billing_mode: "manual",
      })
      .select("id, user_id, plan, status, billing_mode")
      .single();

    subscription = created as Subscription | null;
  }

  const currentPlan = subscription?.plan || "free";
  const projectLimit = getProjectLimit(currentPlan);

  const { count: projectCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const currentProjectCount = projectCount || 0;

  if (projectLimit !== null && currentProjectCount >= projectLimit) {
    redirect(`/dashboard/projects/new?error=project-limit&plan=${currentPlan}`);
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ name, domain, user_id: user.id })
    .select("id")
    .single();

  if (error || !project) {
    redirect("/dashboard/projects/new?error=create-failed");
  }

  redirect(`/dashboard/projects/${project.id}`);
}

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan, status, billing_mode")
    .eq("user_id", user.id)
    .maybeSingle();

  let subscription = subscriptionData as Subscription | null;

  if (!subscription) {
    const { data: created } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan: "free",
        status: "active",
        billing_mode: "manual",
      })
      .select("id, user_id, plan, status, billing_mode")
      .single();

    subscription = created as Subscription | null;
  }

  const currentPlan = subscription?.plan || "free";
  const projectLimit = getProjectLimit(currentPlan);

  const { count: projectCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const currentProjectCount = projectCount || 0;
  const hasReachedLimit = projectLimit !== null && currentProjectCount >= projectLimit;

  const errorMessage =
    error === "missing-fields"
      ? "Please enter both project name and website URL."
      : error === "create-failed"
        ? "Project could not be created. Please check your details and try again."
        : error === "project-limit"
          ? getPlanUpgradeMessage(currentPlan)
          : null;

  const exampleProjects = [
    { name: "RankCraft Web", domain: "rankcraftweb.com" },
    { name: "Client Roofing Website", domain: "clientroofing.com" },
    { name: "Local Service Business", domain: "localservicebusiness.com" },
  ];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Add a new project
          </h1>
          <p className="max-w-xl text-xs leading-5 text-slate-500">
            Add the client website name and URL, then run the first audit.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/projects"
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            SEO Audit
          </Link>
          <Link
            href="/dashboard/billing"
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            Billing
          </Link>
        </div>
      </div>

      {/* Plan usage stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Current Plan
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {formatPlanName(currentPlan)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Active account plan</p>
        </div>

        <div className="rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
            Project Usage
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {currentProjectCount}
            <span className="text-sm font-semibold text-[#7a5b00]/70">
              {" "}/ {projectLimit === null ? "∞" : projectLimit}
            </span>
          </p>
          <p className="mt-1 text-xs text-[#7a5b00]/70">{getLimitText(currentPlan)} allowed</p>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Limit Status
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {hasReachedLimit ? "Reached" : "Available"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {hasReachedLimit ? "Upgrade needed" : "You can create another"}
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {hasReachedLimit ? (
        <div className="rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
                Plan Limit
              </p>
              <p className="mt-1 text-sm font-bold text-slate-950">
                You reached your project limit.
              </p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#7a5b00]/80">
                {getPlanUpgradeMessage(currentPlan)}
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-flex h-8 shrink-0 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black"
            >
              Request Upgrade
            </Link>
          </div>
        </div>
      ) : null}

      {/* Main grid */}
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">

        {/* Form */}
        <div className="rounded-2xl border border-[#e6dcc8] bg-white">
          <div className="border-b border-[#eee5d4] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Project Details
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-950">
              Website information
            </p>
          </div>

          <form action={createProject} className="space-y-4 p-5">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-semibold text-slate-950">
                Project Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Example: RankCraft Web"
                disabled={hasReachedLimit}
                required
                className="h-10 w-full rounded-xl border border-[#e6dcc8] bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
              <p className="text-[11px] text-slate-500">
                Use the client name, brand name, or website name.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="domain" className="text-xs font-semibold text-slate-950">
                Website URL
              </label>
              <input
                id="domain"
                name="domain"
                type="text"
                placeholder="example.com"
                disabled={hasReachedLimit}
                required
                className="h-10 w-full rounded-xl border border-[#e6dcc8] bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
              <p className="text-[11px] text-slate-500">
                You can enter example.com or https://example.com.
              </p>
            </div>

            <div className="rounded-xl border border-[#d4af37]/40 bg-[#fff8df] p-3.5">
              <p className="text-xs font-semibold text-[#7a5b00]">
                Next step after creating
              </p>
              <p className="mt-1 text-[11px] leading-4 text-[#7a5b00]/80">
                You will be redirected to the Overview page to run the first
                audit, sync keyword data, and open the report.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={hasReachedLimit}
                className="inline-flex h-9 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {hasReachedLimit ? "Project Limit Reached" : "Create Project"}
              </button>
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">

          <div className="rounded-2xl border border-[#2b2413] bg-[#111111] text-white">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b6a46a]">
                Workflow
              </p>
              <p className="mt-0.5 text-sm font-bold text-white">
                What happens next
              </p>
            </div>
            <div className="space-y-2 p-4">
              {[
                {
                  step: "01",
                  title: "Create project",
                  desc: "Add the website name and URL to start the workspace.",
                },
                {
                  step: "02",
                  title: "Run audit",
                  desc: "Scan metadata, headings, canonical tags, and technical issues.",
                },
                {
                  step: "03",
                  title: "Review keywords",
                  desc: "Use GSC data to find ranking and visibility opportunities.",
                },
                {
                  step: "04",
                  title: "Export report",
                  desc: "Open a compact client-ready report with action steps.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 text-[10px] font-bold text-[#f5d56a]">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef]">
            <div className="border-b border-[#eee5d4] px-5 py-3.5">
              <p className="text-sm font-bold text-slate-950">
                Example project names
              </p>
            </div>
            <div className="space-y-2 p-4">
              {exampleProjects.map((project) => (
                <div
                  key={project.domain}
                  className="rounded-xl border border-[#e6dcc8] bg-white p-3"
                >
                  <p className="text-xs font-semibold text-slate-950">
                    {project.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {normalizeDomainForDisplay(project.domain)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}