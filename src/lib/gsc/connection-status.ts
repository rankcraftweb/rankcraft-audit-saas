import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type GscConnectionStatus = {
  connected: boolean;
  connectedAt: string | null;
};

export async function getGscConnectionStatus(
  supabase: SupabaseServerClient,
  userId: string
): Promise<GscConnectionStatus> {
  const { data: connection } = await supabase
    .from("gsc_connections")
    .select("refresh_token, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection || !connection.refresh_token) {
    return { connected: false, connectedAt: null };
  }

  return {
    connected: true,
    connectedAt: connection.updated_at || null,
  };
}