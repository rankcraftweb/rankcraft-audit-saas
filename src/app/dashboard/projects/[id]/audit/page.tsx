import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuditRunner from "./audit-runner";

type AuditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AuditPage({ params }: AuditPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, domain")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  return (
    <AuditRunner
      projectId={project.id}
      projectName={project.name}
      projectDomain={project.domain}
    />
  );
}