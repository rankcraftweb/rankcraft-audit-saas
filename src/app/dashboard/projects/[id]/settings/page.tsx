import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SettingsPageProps = {
  params: Promise<{ id: string }>;
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

async function updateProject(formData: FormData) {
  "use server";

  const projectId = String(formData.get("projectId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const domainInput = String(formData.get("domain") || "").trim();
  const domain = normalizeDomain(domainInput);

  if (!projectId) redirect("/dashboard/projects");

  if (!name || !domain) {
    redirect(`/dashboard/projects/${projectId}/settings?error=missing-fields`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("projects")
    .update({ name, domain })
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

  if (!projectId) redirect("/dashboard/projects");

  if (confirmText !== "DELETE") {
    redirect(`/dashboard/projects/${projectId}/settings?error=delete-confirm`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) redirect("/dashboard/projects");

  const { data: audits } = await supabase
    .from("audits")
    .select("id")
    .eq("project_id", projectId);

  const auditList = (audits || []) as AuditRow[];
  const auditIds = auditList.map((a) => a.id);

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

  if (!user) redirect("/login");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, domain, created_at, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) notFound();

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
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/dashboard/projects/${currentProject.id}`}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            ← Overview
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Project settings
          </h1>
          <p className="text-xs text-slate-500">
            {currentProject.name} · {normalizeDomainForDisplay(currentProject.domain)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/projects/${currentProject.id}/audit`}
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            Run Audit
          </Link>
          <Link
            href={`/dashboard/projects/${currentProject.id}/reports`}
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            Report
          </Link>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-[#d4af37]/50 bg-[#fff8df] px-4 py-3 text-xs font-medium text-[#7a5b00]">
          Project settings saved.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {/* Main grid */}
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">

        {/* Edit form */}
        <div className="rounded-2xl border border-[#e6dcc8] bg-white">
          <div className="border-b border-[#eee5d4] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Edit Details
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-950">
              Project information
            </p>
          </div>

          <form action={updateProject} className="space-y-4 p-5">
            <input type="hidden" name="projectId" value={currentProject.id} />

            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-semibold text-slate-950">
                Project Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={currentProject.name}
                required
                className="h-10 w-full rounded-xl border border-[#e6dcc8] bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10"
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
                defaultValue={currentProject.domain}
                required
                className="h-10 w-full rounded-xl border border-[#e6dcc8] bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/10"
              />
              <p className="text-[11px] text-slate-500">
                You can enter example.com or https://example.com.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black"
              >
                Save Changes
              </button>
              <Link
                href={`/dashboard/projects/${currentProject.id}`}
                className="inline-flex h-9 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">

          {/* Project info card */}
          <div className="rounded-2xl border border-[#2b2413] bg-[#111111] text-white">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b6a46a]">
                Current Project
              </p>
              <p className="mt-0.5 text-sm font-bold text-white">
                {currentProject.name}
              </p>
            </div>
            <div className="space-y-2 p-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  Website
                </p>
                <p className="mt-1 break-words text-xs font-semibold text-white">
                  {normalizeDomainForDisplay(currentProject.domain)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  Project ID
                </p>
                <p className="mt-1 break-all text-[11px] text-slate-300">
                  {currentProject.id}
                </p>
              </div>
              <Link
                href={`/dashboard/projects/${currentProject.id}`}
                className="flex h-9 items-center justify-center rounded-xl bg-[#d4af37] text-xs font-semibold text-black transition hover:bg-[#c9a42e]"
              >
                Back to Overview
              </Link>
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-200 bg-red-50">
            <div className="border-b border-red-200 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700">
                Danger Zone
              </p>
              <p className="mt-0.5 text-sm font-bold text-red-900">
                Delete project
              </p>
            </div>

            <div className="p-5">
              <p className="text-xs leading-5 text-red-800">
                This will delete the project and its saved audit, issue,
                PageSpeed, and keyword data. This action cannot be undone.
              </p>

              <form action={deleteProject} className="mt-4 space-y-3">
                <input type="hidden" name="projectId" value={currentProject.id} />

                <div className="space-y-1.5">
                  <label
                    htmlFor="confirmText"
                    className="text-xs font-semibold text-red-900"
                  >
                    Type DELETE to confirm
                  </label>
                  <input
                    id="confirmText"
                    name="confirmText"
                    type="text"
                    placeholder="DELETE"
                    className="h-9 w-full rounded-xl border border-red-200 bg-white px-3.5 text-sm text-red-900 outline-none transition placeholder:text-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <button
                  type="submit"
                  className="flex h-9 w-full items-center justify-center rounded-xl bg-red-600 text-xs font-semibold text-white transition hover:bg-red-700"
                >
                  Delete Project
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}