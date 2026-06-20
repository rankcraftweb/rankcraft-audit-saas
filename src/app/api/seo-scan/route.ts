import { NextResponse } from "next/server";

type SeoIssue = {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  category: "metadata" | "content" | "technical" | "images";
  recommendation: string;
};

function getTagContent(html: string, regex: RegExp) {
  const match = html.match(regex);
  return match?.[1]?.trim() || "";
}

function normalizeUrl(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }

  return url;
}

export async function POST(request: Request) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json(
      { error: "URL is required." },
      { status: 400 }
    );
  }

  const targetUrl = normalizeUrl(url);
  const issues: SeoIssue[] = [];

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "RankCraftAuditBot/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Could not fetch page. Status: ${response.status}`,
        },
        { status: 500 }
      );
    }

    const html = await response.text();

    const title = getTagContent(html, /<title[^>]*>(.*?)<\/title>/is);

    const metaDescription = getTagContent(
      html,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/is
    );

    const canonical = getTagContent(
      html,
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/is
    );

    const h1Matches = html.match(/<h1\b[^>]*>.*?<\/h1>/gis) || [];
    const imageMatches = html.match(/<img\b[^>]*>/gis) || [];

    const imagesMissingAlt = imageMatches.filter((img) => {
      const hasAlt = /\salt=["'][^"']*["']/i.test(img);
      return !hasAlt;
    });

    if (!title) {
      issues.push({
        title: "Missing title tag",
        description: "This page does not have a title tag.",
        severity: "high",
        category: "metadata",
        recommendation:
          "Add a unique title tag that clearly describes the page and includes the main keyword.",
      });
    } else if (title.length < 30) {
      issues.push({
        title: "Title tag is too short",
        description: `The title tag is only ${title.length} characters long.`,
        severity: "medium",
        category: "metadata",
        recommendation:
          "Expand the title to around 50–60 characters while keeping it natural and relevant.",
      });
    } else if (title.length > 65) {
      issues.push({
        title: "Title tag is too long",
        description: `The title tag is ${title.length} characters long.`,
        severity: "medium",
        category: "metadata",
        recommendation:
          "Shorten the title to around 50–60 characters to reduce truncation in search results.",
      });
    }

    if (!metaDescription) {
      issues.push({
        title: "Missing meta description",
        description: "This page does not have a meta description.",
        severity: "medium",
        category: "metadata",
        recommendation:
          "Add a clear meta description that summarizes the page and encourages clicks.",
      });
    } else if (metaDescription.length < 70) {
      issues.push({
        title: "Meta description is too short",
        description: `The meta description is only ${metaDescription.length} characters long.`,
        severity: "low",
        category: "metadata",
        recommendation:
          "Write a more helpful description around 120–155 characters.",
      });
    } else if (metaDescription.length > 170) {
      issues.push({
        title: "Meta description is too long",
        description: `The meta description is ${metaDescription.length} characters long.`,
        severity: "low",
        category: "metadata",
        recommendation:
          "Shorten the description to around 120–155 characters so it is easier to read in search results.",
      });
    }

    if (h1Matches.length === 0) {
      issues.push({
        title: "Missing H1 heading",
        description: "This page does not contain an H1 heading.",
        severity: "high",
        category: "content",
        recommendation:
          "Add one clear H1 heading that describes the main topic of the page.",
      });
    }

    if (h1Matches.length > 1) {
      issues.push({
        title: "Multiple H1 headings",
        description: `This page has ${h1Matches.length} H1 headings.`,
        severity: "medium",
        category: "content",
        recommendation:
          "Use one primary H1 for the page and convert secondary headings to H2 or H3.",
      });
    }

    if (!canonical) {
      issues.push({
        title: "Missing canonical tag",
        description: "This page does not have a canonical URL.",
        severity: "medium",
        category: "technical",
        recommendation:
          "Add a canonical tag to help search engines understand the preferred version of the page.",
      });
    }

    if (imagesMissingAlt.length > 0) {
      issues.push({
        title: "Images missing alt text",
        description: `${imagesMissingAlt.length} image(s) are missing alt text.`,
        severity: "low",
        category: "images",
        recommendation:
          "Add descriptive alt text to important images. Decorative images can use empty alt text.",
      });
    }

    return NextResponse.json({
      url: targetUrl,
      summary: {
        title,
        titleLength: title.length,
        metaDescription,
        metaDescriptionLength: metaDescription.length,
        h1Count: h1Matches.length,
        imageCount: imageMatches.length,
        imagesMissingAlt: imagesMissingAlt.length,
        canonical,
      },
      issues,
    });
  } catch {
    return NextResponse.json(
      {
        error: "SEO scan failed. Check the URL and try again.",
      },
      { status: 500 }
    );
  }
}