import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LighthouseCategory = {
  score?: number | null;
};

type PageSpeedResponse = {
  lighthouseResult?: {
    categories?: {
      performance?: LighthouseCategory;
      accessibility?: LighthouseCategory;
      "best-practices"?: LighthouseCategory;
      seo?: LighthouseCategory;
    };
  };
  error?: {
    message?: string;
  };
};

function normalizeUrl(input: string) {
  const trimmed = input.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/$/, "");
  }

  return `https://${trimmed.replace(/\/$/, "")}`;
}

function convertScore(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return null;
  }

  return Math.round(score * 100);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = body.projectId as string | undefined;
    const inputUrl = (body.url || body.domain || body.projectDomain) as
      | string
      | undefined;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required." },
        { status: 400 }
      );
    }

    if (!inputUrl) {
      return NextResponse.json(
        { error: "Project URL is required." },
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

    const targetUrl = normalizeUrl(inputUrl);

    const pageSpeedUrl = new URL(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
    );

    pageSpeedUrl.searchParams.set("url", targetUrl);
    pageSpeedUrl.searchParams.set("key", apiKey);
    pageSpeedUrl.searchParams.set("strategy", "mobile");
    pageSpeedUrl.searchParams.append("category", "performance");
    pageSpeedUrl.searchParams.append("category", "accessibility");
    pageSpeedUrl.searchParams.append("category", "best-practices");
    pageSpeedUrl.searchParams.append("category", "seo");

    const pageSpeedResponse = await fetch(pageSpeedUrl.toString(), {
      cache: "no-store",
    });

    const pageSpeedData: PageSpeedResponse = await pageSpeedResponse.json();

    if (!pageSpeedResponse.ok || pageSpeedData.error) {
      return NextResponse.json(
        {
          error:
            pageSpeedData.error?.message ||
            "Could not fetch PageSpeed Insights data.",
        },
        { status: 500 }
      );
    }

    const categories = pageSpeedData.lighthouseResult?.categories;

    const performanceScore = convertScore(categories?.performance?.score);
    const accessibilityScore = convertScore(categories?.accessibility?.score);
    const bestPracticesScore = convertScore(
      categories?.["best-practices"]?.score
    );
    const seoScore = convertScore(categories?.seo?.score);

    const { error: insertError } = await supabase
      .from("pagespeed_reports")
      .insert({
        project_id: project.id,
        url: targetUrl,
        performance_score: performanceScore,
        accessibility_score: accessibilityScore,
        best_practices_score: bestPracticesScore,
        seo_score: seoScore,
        raw_json: pageSpeedData,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: targetUrl,
      performanceScore,
      accessibilityScore,
      bestPracticesScore,
      seoScore,
      message: "PageSpeed scan completed successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while running PageSpeed scan.",
      },
      { status: 500 }
    );
  }
}