import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_GSC_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_GSC_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "Missing GOOGLE_GSC_CLIENT_ID or GOOGLE_GSC_REDIRECT_URI in .env.local.",
      },
      { status: 500 }
    );
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/webmasters.readonly"
  );

  return NextResponse.redirect(authUrl.toString());
}