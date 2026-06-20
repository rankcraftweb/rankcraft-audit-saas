"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type FetchGscKeywordsButtonProps = {
  projectId: string;
};

export default function FetchGscKeywordsButton({
  projectId,
}: FetchGscKeywordsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchKeywords() {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/gsc/search-analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      setMessage(data.error || "Failed to fetch GSC keywords.");
      setLoading(false);
      return;
    }

    setMessage(
      `Imported ${data.importedRows} keyword row(s) from ${data.siteUrl}.`
    );

    setLoading(false);

    setTimeout(() => {
      window.location.reload();
    }, 1200);
  }

  return (
    <div className="space-y-2">
      <Button onClick={fetchKeywords} disabled={loading}>
        {loading ? "Fetching keywords..." : "Fetch GSC Keywords"}
      </Button>

      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}