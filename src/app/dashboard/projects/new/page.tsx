"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewProjectPage() {
  const supabase = createClient();

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function createProject() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in to create a project.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("projects").insert({
      user_id: user.id,
      name,
      domain,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard/projects";
  }

  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Add Website Project</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add a website you want to audit and monitor.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            placeholder="https://example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />

          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}

          <Button onClick={createProject} disabled={loading}>
            {loading ? "Creating..." : "Create Project"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}