"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuditRunnerProps = {
  projectId: string;
  projectName: string;
  projectDomain: string;
};

type PageSpeedReport = {
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  raw: unknown;
  error?: string;
};

type SeoIssue = {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  category: "metadata" | "content" | "technical" | "images";
  recommendation: string;
};

type SeoScanReport = {
  url: string;
  summary: {
    title: string;
    titleLength: number;
    metaDescription: string;
    metaDescriptionLength: number;
    h1Count: number;
    imageCount: number;
    imagesMissingAlt: number;
    canonical: string;
  };
  issues: SeoIssue[];
  error?: string;
};

export default function AuditRunner({
  projectId,
  projectName,
  projectDomain,
}: AuditRunnerProps) {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [pageSpeedReport, setPageSpeedReport] =
    useState<PageSpeedReport | null>(null);
  const [seoScanReport, setSeoScanReport] =
    useState<SeoScanReport | null>(null);
  const [message, setMessage] = useState("");

  async function runAudit() {
    setLoading(true);
    setMessage("");
    setPageSpeedReport(null);
    setSeoScanReport(null);

    const pageSpeedResponse = await fetch("/api/pagespeed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: projectDomain,
      }),
    });

    const pageSpeedData: PageSpeedReport =
      await pageSpeedResponse.json();

    if (!pageSpeedResponse.ok || pageSpeedData.error) {
      setMessage(pageSpeedData.error || "PageSpeed audit failed.");
      setLoading(false);
      return;
    }

    setPageSpeedReport(pageSpeedData);

    const { error: pageSpeedSaveError } = await supabase
      .from("pagespeed_reports")
      .insert({
        project_id: projectId,
        url: pageSpeedData.url,
        performance_score: pageSpeedData.performance,
        accessibility_score: pageSpeedData.accessibility,
        best_practices_score: pageSpeedData.bestPractices,
        seo_score: pageSpeedData.seo,
        raw_json: pageSpeedData.raw,
      });

    if (pageSpeedSaveError) {
      setMessage(pageSpeedSaveError.message);
      setLoading(false);
      return;
    }

    const seoScanResponse = await fetch("/api/seo-scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: projectDomain,
      }),
    });

    const seoScanData: SeoScanReport = await seoScanResponse.json();

    if (!seoScanResponse.ok || seoScanData.error) {
      setMessage(seoScanData.error || "SEO scan failed.");
      setLoading(false);
      return;
    }

    setSeoScanReport(seoScanData);

    const { data: audit, error: auditError } = await supabase
      .from("audits")
      .insert({
        project_id: projectId,
        score: pageSpeedData.seo,
        status: "completed",
      })
      .select("id")
      .single();

    if (auditError || !audit) {
      setMessage(auditError?.message || "Could not save audit.");
      setLoading(false);
      return;
    }

    if (seoScanData.issues.length > 0) {
      const issuesToInsert = seoScanData.issues.map((issue) => ({
        audit_id: audit.id,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        category: issue.category,
        recommendation: issue.recommendation,
      }));

      const { error: issuesError } = await supabase
        .from("audit_issues")
        .insert(issuesToInsert);

      if (issuesError) {
        setMessage(issuesError.message);
        setLoading(false);
        return;
      }
    }

    setMessage("Audit and SEO issues saved successfully.");
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Site Audit</p>
        <h2 className="text-3xl font-bold">{projectName}</h2>
        <p className="text-muted-foreground">{projectDomain}</p>
      </div>

      <Button onClick={runAudit} disabled={loading}>
        {loading ? "Running full audit..." : "Run Full SEO Audit"}
      </Button>

      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}

      {pageSpeedReport && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {pageSpeedReport.performance}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {pageSpeedReport.accessibility}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {pageSpeedReport.bestPractices}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">SEO</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pageSpeedReport.seo}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {seoScanReport && (
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold">SEO Issues</h3>
            <p className="text-muted-foreground">
              {seoScanReport.issues.length} issue(s) found on this page.
            </p>
          </div>

          {seoScanReport.issues.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No basic SEO issues found</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This page passed the current metadata, heading, canonical,
                  and image alt checks.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {seoScanReport.issues.map((issue) => (
                <Card key={`${issue.title}-${issue.category}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="text-lg">
                        {issue.title}
                      </CardTitle>

                      <span className="rounded-full border px-3 py-1 text-xs capitalize">
                        {issue.severity}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {issue.description}
                    </p>

                    <p className="text-sm">
                      <strong>Fix:</strong> {issue.recommendation}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}