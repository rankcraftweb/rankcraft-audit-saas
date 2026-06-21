import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AuditIssueInput = {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  category: string;
  recommendation: string;
};

function normalizeUrl(input: string) {
  const trimmed = input.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/$/, "");
  }

  return `https://${trimmed.replace(/\/$/, "")}`;
}

function extractTagContent(html: string, tagName: string) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = html.match(regex);

  return match?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function extractMetaContent(html: string, metaName: string) {
  const regex = new RegExp(
    `<meta[^>]+name=["']${metaName}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    "i"
  );

  const match = html.match(regex);

  if (match?.[1]) {
    return match[1].trim();
  }

  const reverseRegex = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${metaName}["'][^>]*>`,
    "i"
  );

  const reverseMatch = html.match(reverseRegex);

  return reverseMatch?.[1]?.trim() || "";
}

function hasCanonical(html: string) {
  return /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html);
}

function hasViewport(html: string) {
  return /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
}

function countImagesWithoutAlt(html: string) {
  const imageMatches = html.match(/<img\b[^>]*>/gi) || [];

  return imageMatches.filter((imageTag) => {
    return !/\salt=["'][^"']*["']/i.test(imageTag);
  }).length;
}

function buildIssues(html: string) {
  const issues: AuditIssueInput[] = [];

  const title = extractTagContent(html, "title");
  const metaDescription = extractMetaContent(html, "description");
  const h1 = extractTagContent(html, "h1");
  const missingAltImages = countImagesWithoutAlt(html);

  if (!title) {
    issues.push({
      title: "Missing title tag",
      description: "The page does not have a title tag.",
      severity: "high",
      category: "metadata",
      recommendation:
        "Add a unique title tag that clearly describes the page and includes the main target keyword.",
    });
  } else if (title.length < 30) {
    issues.push({
      title: "Title tag is too short",
      description: `The title tag is only ${title.length} characters long.`,
      severity: "medium",
      category: "metadata",
      recommendation:
        "Expand the title tag to better describe the page. Aim for around 50–60 characters when possible.",
    });
  } else if (title.length > 65) {
    issues.push({
      title: "Title tag may be too long",
      description: `The title tag is ${title.length} characters long.`,
      severity: "low",
      category: "metadata",
      recommendation:
        "Shorten the title tag so the most important keyword and brand message are visible in search results.",
    });
  }

  if (!metaDescription) {
    issues.push({
      title: "Missing meta description",
      description: "The page does not have a meta description.",
      severity: "medium",
      category: "metadata",
      recommendation:
        "Add a clear meta description that explains the page and encourages clicks from search results.",
    });
  } else if (metaDescription.length < 70) {
    issues.push({
      title: "Meta description is short",
      description: `The meta description is only ${metaDescription.length} characters long.`,
      severity: "low",
      category: "metadata",
      recommendation:
        "Add more useful detail to the meta description so it better supports search intent.",
    });
  } else if (metaDescription.length > 170) {
    issues.push({
      title: "Meta description may be too long",
      description: `The meta description is ${metaDescription.length} characters long.`,
      severity: "low",
      category: "metadata",
      recommendation:
        "Shorten the meta description so the main value proposition is visible in search results.",
    });
  }

  if (!h1) {
    issues.push({
      title: "Missing H1 heading",
      description: "The page does not appear to have an H1 heading.",
      severity: "medium",
      category: "content",
      recommendation:
        "Add one clear H1 heading that describes the main topic of the page.",
    });
  }

  if (!hasCanonical(html)) {
    issues.push({
      title: "Missing canonical tag",
      description: "The page does not appear to have a canonical tag.",
      severity: "low",
      category: "technical",
      recommendation:
        "Add a canonical tag to help search engines understand the preferred version of the page.",
    });
  }

  if (!hasViewport(html)) {
    issues.push({
      title: "Missing viewport meta tag",
      description: "The page does not appear to have a viewport meta tag.",
      severity: "medium",
      category: "mobile",
      recommendation:
        "Add a viewport meta tag so the page can render properly on mobile devices.",
    });
  }

  if (missingAltImages > 0) {
    issues.push({
      title: "Images missing alt text",
      description: `${missingAltImages} image(s) may be missing alt text.`,
      severity: "low",
      category: "accessibility",
      recommendation:
        "Add descriptive alt text to important images to improve accessibility and image SEO.",
    });
  }

  return issues;
}

function calculateSeoScore(issues: AuditIssueInput[]) {
  let score = 100;

  issues.forEach((issue) => {
    if (issue.severity === "high") {
      score -= 18;
    }

    if (issue.severity === "medium") {
      score -= 8;
    }

    if (issue.severity === "low") {
      score -= 3;
    }
  });

  return Math.max(score, 0);
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

    const htmlResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 RankCraftAuditBot/1.0 (+https://rankcraftweb.com)",
      },
      cache: "no-store",
    });

    if (!htmlResponse.ok) {
      return NextResponse.json(
        {
          error: `Could not fetch website HTML. Status: ${htmlResponse.status}`,
        },
        { status: 500 }
      );
    }

    const html = await htmlResponse.text();
    const issues = buildIssues(html);
    const score = calculateSeoScore(issues);

    const { data: audit, error: auditError } = await supabase
      .from("audits")
      .insert({
        project_id: project.id,
        score,
        status: "completed",
      })
      .select("id, score")
      .single();

    if (auditError || !audit) {
      return NextResponse.json(
        { error: auditError?.message || "Could not save audit." },
        { status: 500 }
      );
    }

    if (issues.length > 0) {
      const issueRows = issues.map((issue) => ({
        audit_id: audit.id,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        category: issue.category,
        recommendation: issue.recommendation,
      }));

      const { error: issuesError } = await supabase
        .from("audit_issues")
        .insert(issueRows);

      if (issuesError) {
        return NextResponse.json(
          { error: issuesError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      auditId: audit.id,
      score,
      issuesFound: issues.length,
      message: "SEO audit completed successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while running the audit.",
      },
      { status: 500 }
    );
  }
}