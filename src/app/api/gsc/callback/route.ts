import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/projects?gsc_error=${error}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/projects?gsc_error=missing_code",
        requestUrl.origin
      )
    );
  }

  const clientId = process.env.GOOGLE_GSC_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GSC_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_GSC_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "Missing GOOGLE_GSC_CLIENT_ID, GOOGLE_GSC_CLIENT_SECRET, or GOOGLE_GSC_REDIRECT_URI in .env.local.",
      },
      { status: 500 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=login_required", requestUrl.origin)
    );
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData: GoogleTokenResponse = await tokenResponse.json();

  if (!tokenResponse.ok || tokenData.error) {
    return NextResponse.json(
      {
        error: tokenData.error || "token_exchange_failed",
        description:
          tokenData.error_description ||
          "Could not exchange Google OAuth code for tokens.",
      },
      { status: 500 }
    );
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  const { error: upsertError } = await supabase
    .from("gsc_connections")
    .upsert(
      {
        user_id: user.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        scope: tokenData.scope,
        token_type: tokenData.token_type,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

  if (upsertError) {
    return NextResponse.json(
      {
        error: upsertError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.redirect(
    new URL("/dashboard/projects?gsc_connected=true", requestUrl.origin)
  );
}