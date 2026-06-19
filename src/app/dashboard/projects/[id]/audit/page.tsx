"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  async function runAudit() {
    setLoading(true);

    const response = await fetch("/api/pagespeed", {
      method: "POST",
      body: JSON.stringify({
        url: "https://rankcraftweb.com",
      }),
    });

    const data = await response.json();
    setReport(data);
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Site Audit</h2>
        <p className="text-muted-foreground">
          Run a technical SEO and performance scan.
        </p>
      </div>

      <Button onClick={runAudit} disabled={loading}>
        {loading ? "Running audit..." : "Run Audit"}
      </Button>

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