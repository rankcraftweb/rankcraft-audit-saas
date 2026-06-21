import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GscConnection = {
  id: string;
  user_id?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: string | null;
  expiry_date?: string | null;
  site_url?: string | null;
  property_url?: string | null;
  gsc_site_url?: string | null;
};

type SearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type SearchAnalyticsResponse = {
  rows?: SearchAnalyticsRow[];
  error?: {
    message?: string;
  };
};

function normalizeDomain(input: string) {
  const trimmed = input.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/$/, "");
  }

  return `https://${trimmed.replace(/\/$/, "")}`;
}

function getDateString(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function isTokenExpired(expiresAt?: string | null) {
  if (!expiresAt) {
    return true;
  }

  const expiryTime = new Date(expiresAt).getTime();

  if (Number.isNaN(expiryTime)) {
    return true;
  }

  return expiryTime <= Date.now() + 60_000;
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || "Could not refresh Google token.");
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  return {
    accessToken: data.access_token as string,
    expiresAt,
  };
}

async function findGscConnection(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const tables = ["gsc_connections", "google_connections", "google_accounts"];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        table,
        connection: data as GscConnection,
      };
    }
  }

  return null;
}

function getSiteUrl(connection: GscConnection, projectDomain: string) {
  return (
    connection.site_url ||
    connection.property_url ||
    connection.gsc_site_url ||
    normalizeDomain(projectDomain)
  );
}

function getExpiresAt(connection: GscConnection) {
  return connection.expires_at || connection.expiry_date || null;
}

function calculateCtr(clicks: number, impressions: number) {
  if (impressions <= 0) {
    return 0;
  }

  return clicks / impressions;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const projectId = body.projectId as string | undefined;
    const startDate = (body.startDate as string | undefined) || getDateString(28);
    const endDate = (body.endDate as string | undefined) || getDateString(1);

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, domain")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    const foundConnection = await findGscConnection(supabase, user.id);

    if (!foundConnection) {
      return NextResponse.json(
        {
          error:
            "No Google Search Console connection found. Connect Google first before syncing keywords.",
        },
        { status: 400 }
      );
    }

    const { table, connection } = foundConnection;

    let accessToken = connection.access_token || "";
    const refreshToken = connection.refresh_token || "";
    const expiresAt = getExpiresAt(connection);

    if (!accessToken || isTokenExpired(expiresAt)) {
      if (!refreshToken) {
        return NextResponse.json(
          {
            error:
              "Google token expired and no refresh token was found. Reconnect Google Search Console.",
          },
          { status: 400 }
        );
      }

      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;

      await supabase
        .from(table)
        .update({
          access_token: refreshed.accessToken,
          expires_at: refreshed.expiresAt,
        })
        .eq("id", connection.id);
    }

    const siteUrl = getSiteUrl(connection, project.domain);
    const encodedSiteUrl = encodeURIComponent(siteUrl);

    const gscResponse = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["query"],
          rowLimit: 100,
          startRow: 0,
        }),
        cache: "no-store",
      }
    );

    const gscData: SearchAnalyticsResponse = await gscResponse.json();

    if (!gscResponse.ok || gscData.error) {
      return NextResponse.json(
        {
          error:
            gscData.error?.message ||
            "Could not fetch keyword data from Google Search Console.",
        },
        { status: 500 }
      );
    }

    const rows = gscData.rows || [];

    const keywordRows = rows.map((row) => {
      const clicks = Math.round(row.clicks || 0);
      const impressions = Math.round(row.impressions || 0);
      const ctr = row.ctr ?? calculateCtr(clicks, impressions);
      const position = row.position || 0;

      return {
        project_id: project.id,
        query: row.keys?.[0] || "Unknown keyword",
        clicks,
        impressions,
        ctr,
        position,
        start_date: startDate,
        end_date: endDate,
      };
    });

    await supabase
      .from("gsc_keyword_rows")
      .delete()
      .eq("project_id", project.id)
      .eq("start_date", startDate)
      .eq("end_date", endDate);

    if (keywordRows.length > 0) {
      const { error: insertError } = await supabase
        .from("gsc_keyword_rows")
        .insert(keywordRows);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      synced: keywordRows.length,
      startDate,
      endDate,
      siteUrl,
      message: "GSC keyword data synced successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while syncing GSC keyword data.",
      },
      { status: 500 }
    );
  }
}