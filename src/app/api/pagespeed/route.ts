import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json(
      { error: "URL is required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.PAGESPEED_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing PAGESPEED_API_KEY in .env.local." },
      { status: 500 }
    );
  }

  const apiUrl = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
  );

  apiUrl.searchParams.set("url", url);
  apiUrl.searchParams.set("key", apiKey);
  apiUrl.searchParams.set("category", "performance");
  apiUrl.searchParams.append("category", "accessibility");
  apiUrl.searchParams.append("category", "best-practices");
  apiUrl.searchParams.append("category", "seo");

  const response = await fetch(apiUrl.toString());
  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ||
          "PageSpeed request failed. Please try again later.",
      },
      { status: response.status }
    );
  }

  const categories = data.lighthouseResult.categories;

  return NextResponse.json({
    url,
    performance: Math.round(categories.performance.score * 100),
    accessibility: Math.round(categories.accessibility.score * 100),
    bestPractices: Math.round(categories["best-practices"].score * 100),
    seo: Math.round(categories.seo.score * 100),
    raw: data,
  });
}