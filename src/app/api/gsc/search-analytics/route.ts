import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GscConnection = {
  id: string;
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  scope: string | null;
  token_type: string | null;
};

type GscSiteEntry = {
  siteUrl: string;
  permissionLevel: string;
};

type GscSitesResponse = {
  siteEntry?: GscSiteEntry[];
  error?: {
    message?: string;
  };
};

type GscAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type GscAnalyticsResponse = {
  rows?: GscAnalyticsRow[];
  error?: {
    message?: string;
  };
};

function normalizeDomain(input: string) {
  return input
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function getDateDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

function findBestMatchingSite(sites: GscSiteEntry[], projectDomain: string) {
  const normalizedProjectDomain = normalizeDomain(projectDomain);

  const domainProperty = sites.find((site) => {
    const normalizedSite = site.siteUrl
      .replace("sc-domain:", "")
      .replace(/^www\./, "")
      .toLowerCase();

    return (
      site.siteUrl.startsWith("sc-domain:") &&
      normalizedSite === normalizedProjectDomain
    );
  });

  if (domainProperty) {
    return domainProperty.siteUrl;
  }

  const exactUrlProperty = sites.find((site) => {
    return normalizeDomain(site.siteUrl) === normalizedProjectDomain;
  });

  if (exactUrlProperty) {
    return exactUrlProperty.siteUrl;
  }

  const containsDomain = sites.find((site) => {
    return normalizeDomain(site.siteUrl).includes(normalizedProjectDomain);
  });

  return containsDomain?.siteUrl || null;
}

async function refreshAccessToken(connection: GscConnection) {
  const clientId = process.env.GOOGLE_GSC_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GSC_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google GSC OAuth environment variables.");
  }

  if (!connection.refresh_token) {
    throw new Error("Missing GSC refresh token. Reconnect Google Search Console.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Failed to refresh Google access token."
    );
  }

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  return {
    accessToken: data.access_token as string,
    expiresAt,
    scope: data.scope as string | undefined,
    tokenType: data.token_type as string | undefined,
  };
}

export async function POST(request: Request) {
  const { projectId } = await request.json();

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
    .select("id, name, domain, user_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "Project not found." },
      { status: 404 }
    );
  }

  const { data: connection, error: connectionError } = await supabase
    .from("gsc_connections")
    .select(
      "id, user_id, access_token, refresh_token, expires_at, scope, token_type"
    )
    .eq("user_id", user.id)
    .single();

  if (connectionError || !connection) {
    return NextResponse.json(
      { error: "Google Search Console is not connected." },
      { status: 400 }
    );
  }

  let accessToken = connection.access_token;

  const tokenExpired =
    !connection.expires_at ||
    new Date(connection.expires_at).getTime() < Date.now() + 60 * 1000;

  if (!accessToken || tokenExpired) {
    try {
      const refreshed = await refreshAccessToken(connection as GscConnection);

      accessToken = refreshed.accessToken;

      await supabase
        .from("gsc_connections")
        .update({
          access_token: refreshed.accessToken,
          expires_at: refreshed.expiresAt,
          scope: refreshed.scope || connection.scope,
          token_type: refreshed.tokenType || connection.token_type,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not refresh Google token.",
        },
        { status: 500 }
      );
    }
  }

  const sitesResponse = await fetch(
    "https://www.googleapis.com/webmasters/v3/sites",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const sitesData: GscSitesResponse = await sitesResponse.json();

  if (!sitesResponse.ok) {
    return NextResponse.json(
      {
        error:
          sitesData.error?.message ||
          "Could not fetch verified Search Console sites.",
      },
      { status: 500 }
    );
  }

  const sites = sitesData.siteEntry || [];
  const siteUrl = findBestMatchingSite(sites, project.domain);

  if (!siteUrl) {
    return NextResponse.json(
      {
        error:
          "No matching Search Console property found for this project domain. Make sure the domain is verified in Google Search Console.",
        availableSites: sites.map((site) => site.siteUrl),
      },
      { status: 404 }
    );
  }

  const startDate = getDateDaysAgo(29);
  const endDate = getDateDaysAgo(1);

  const analyticsResponse = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      siteUrl
    )}/searchAnalytics/query`,
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
        rowLimit: 50,
        startRow: 0,
      }),
    }
  );

  const analyticsData: GscAnalyticsResponse = await analyticsResponse.json();

  if (!analyticsResponse.ok) {
    return NextResponse.json(
      {
        error:
          analyticsData.error?.message ||
          "Could not fetch Search Console keyword data.",
      },
      { status: 500 }
    );
  }

  const rows = analyticsData.rows || [];

  await supabase.from("keywords").delete().eq("project_id", project.id);

  if (rows.length > 0) {
    const keywordRows = rows.map((row) => ({
      project_id: project.id,
      query: row.keys?.[0] || "(not provided)",
      clicks: Math.round(row.clicks || 0),
      impressions: Math.round(row.impressions || 0),
      ctr: row.ctr || 0,
      position: row.position || 0,
      date: endDate,
    }));

    const { error: insertError } = await supabase
      .from("keywords")
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
    siteUrl,
    startDate,
    endDate,
    importedRows: rows.length,
  });
}