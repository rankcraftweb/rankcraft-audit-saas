import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SettingsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

type Project = {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  user_id: string;
};

type AuditRow = {
  id: string;
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

async function updateProject(formData: FormData) {
  "use server";

  const projectId = String(formData.get("projectId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const domainInput = String(formData.get("domain") || "").trim();
  const domain = normalizeDomain(domainInput);

  if (!projectId) {
    redirect("/dashboard/projects");
  }

  if (!name || !domain) {
    redirect(`/dashboard/projects/${projectId}/settings?error=missing-fields`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("projects")
    .update({
      name,
      domain,
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/dashboard/projects/${projectId}/settings?error=update-failed`);
  }

  redirect(`/dashboard/projects/${projectId}/settings?saved=1`);
}

async function deleteProject(formData: FormData) {
  "use server";

  const projectId = String(formData.get("projectId") || "").trim();
  const confirmText = String(formData.get("confirmText") || "").trim();

  if (!projectId) {
    redirect("/dashboard/projects");
  }

  if (confirmText !== "DELETE") {
    redirect(`/dashboard/projects/${projectId}/settings?error=delete-confirm`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    redirect("/dashboard/projects");
  }

  const { data: audits } = await supabase
    .from("audits")
    .select("id")
    .eq("project_id", projectId);

  const auditList = (audits || []) as AuditRow[];
  const auditIds = auditList.map((audit) => audit.id);

  if (auditIds.length > 0) {
    await supabase.from("audit_issues").delete().in("audit_id", auditIds);
  }

  await supabase.from("audits").delete().eq("project_id", projectId);
  await supabase.from("pagespeed_reports").delete().eq("project_id", projectId);
  await supabase.from("gsc_keyword_rows").delete().eq("project_id", projectId);

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/dashboard/projects/${projectId}/settings?error=delete-failed`);
  }

  redirect("/dashboard/projects");
}

export default async function ProjectSettingsPage({
  params,
  searchParams,
}: SettingsPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, domain, created_at, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const currentProject = project as Project;

  const error = resolvedSearchParams?.error;
  const saved = resolvedSearchParams?.saved;

  const errorMessage =
    error === "missing-fields"
      ? "Please enter both project name and website URL."
      : error === "update-failed"
        ? "Project could not be updated. Please try again."
        : error === "delete-confirm"
          ? 'Type "DELETE" to confirm project deletion.'
          : error === "delete-failed"
            ? "Project could not be deleted. Please try again."
            : null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e6dcc8] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/projects/${currentProject.id}`}>
                ← Back to Overview
              </Link>
            </Button>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Project Settings
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Edit project details
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {currentProject.name} ·{" "}
              {normalizeDomainForDisplay(currentProject.domain)}
            </p>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
              Update the project name or website URL. You can also delete this
              project if it is no longer needed.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${currentProject.id}/audit`}>
                Run Audit
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${currentProject.id}/reports`}>
                Report
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {saved ? (
        <div className="rounded-2xl border border-[#d4af37]/50 bg-[#fff8df] p-4 text-sm font-medium text-[#7a5b00]">
          Project settings saved.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="border-b border-[#eee5d4] p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Edit Details
            </p>

            <CardTitle className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              Project information
            </CardTitle>

            <p className="text-sm leading-6 text-slate-500">
              These details are used across the overview, audit, keywords,
              report, and recommendations pages.
            </p>
          </CardHeader>

          <CardContent className="p-5 md:p-6">
            <form action={updateProject} className="space-y-5">
              <input
                type="hidden"
                name="projectId"
                value={currentProject.id}
              />

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
                  defaultValue={currentProject.name}
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
                  defaultValue={currentProject.domain}
                  className="h-12 w-full rounded-2xl border border-[#e6dcc8] bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10"
                  required
                />

                <p className="text-xs leading-5 text-slate-500">
                  You can enter example.com or https://example.com.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit">Save Changes</Button>

                <Button asChild type="button" variant="outline">
                  <Link href={`/dashboard/projects/${currentProject.id}`}>
                    Cancel
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-[#2b2413] bg-[#111111] text-white shadow-sm">
            <CardHeader className="border-b border-white/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b6a46a]">
                Current Project
              </p>

              <CardTitle className="mt-2 text-xl font-bold tracking-tight text-white">
                {currentProject.name}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 p-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Website
                </p>

                <p className="mt-2 break-words text-sm font-semibold text-white">
                  {normalizeDomainForDisplay(currentProject.domain)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Project ID
                </p>

                <p className="mt-2 break-all text-xs text-slate-300">
                  {currentProject.id}
                </p>
              </div>

              <Button asChild className="w-full">
                <Link href={`/dashboard/projects/${currentProject.id}`}>
                  Back to Overview
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-red-200 bg-red-50 shadow-sm">
            <CardHeader className="border-b border-red-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                Danger Zone
              </p>

              <CardTitle className="mt-2 text-xl font-bold tracking-tight text-red-900">
                Delete project
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5">
              <p className="text-sm leading-6 text-red-800">
                This will delete the project and its saved audit, issue,
                PageSpeed, and keyword data. This action cannot be undone.
              </p>

              <form action={deleteProject} className="mt-5 space-y-4">
                <input
                  type="hidden"
                  name="projectId"
                  value={currentProject.id}
                />

                <div className="space-y-2">
                  <label
                    htmlFor="confirmText"
                    className="text-sm font-semibold text-red-900"
                  >
                    Type DELETE to confirm
                  </label>

                  <input
                    id="confirmText"
                    name="confirmText"
                    type="text"
                    placeholder="DELETE"
                    className="h-11 w-full rounded-2xl border border-red-200 bg-white px-4 text-sm text-red-900 outline-none transition placeholder:text-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center rounded-2xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Delete Project
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}