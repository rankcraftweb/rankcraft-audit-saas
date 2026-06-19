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

export default function AuditRunner({
  projectId,
  projectName,
  projectDomain,
}: AuditRunnerProps) {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PageSpeedReport | null>(null);
  const [message, setMessage] = useState("");

  async function runAudit() {
    setLoading(true);
    setMessage("");
    setReport(null);

    const response = await fetch("/api/pagespeed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: projectDomain,
      }),
    });

    const data: PageSpeedReport = await response.json();

    if (!response.ok || data.error) {
      setMessage(data.error || "Audit failed.");
      setLoading(false);
      return;
    }

    setReport(data);

    const { error } = await supabase.from("pagespeed_reports").insert({
      project_id: projectId,
      url: data.url,
      performance_score: data.performance,
      accessibility_score: data.accessibility,
      best_practices_score: data.bestPractices,
      seo_score: data.seo,
      raw_json: data.raw,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Audit saved successfully.");
    }

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
        {loading ? "Running audit..." : "Run PageSpeed Audit"}
      </Button>

      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}

      {report && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{report.performance}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{report.accessibility}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{report.bestPractices}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">SEO</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{report.seo}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}