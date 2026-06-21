"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

type RunStep = {
  label: string;
  description: string;
  status: "pending" | "running" | "done" | "error";
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

type EndpointResult = {
  ok: boolean;
  endpoint: string;
  data?: ApiResponse;
  error?: string;
};

function normalizeDomainForDisplay(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

function getStepClass(status: RunStep["status"]) {
  if (status === "done") {
    return "border-emerald-200 bg-emerald-50";
  }

  if (status === "running") {
    return "border-slate-300 bg-slate-50";
  }

  if (status === "error") {
    return "border-red-200 bg-red-50";
  }

  return "border-slate-200 bg-white";
}

function getDotClass(status: RunStep["status"]) {
  if (status === "done") {
    return "bg-emerald-500";
  }

  if (status === "running") {
    return "bg-slate-950";
  }

  if (status === "error") {
    return "bg-red-500";
  }

  return "bg-slate-300";
}

async function tryPostEndpoint(
  endpoint: string,
  payload: {
    projectId: string;
    url: string;
    domain: string;
    projectDomain: string;
  }
): Promise<EndpointResult> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();

      return {
        ok: false,
        endpoint,
        error: `Endpoint returned non-JSON response. Status: ${
          response.status
        }. Preview: ${text.slice(0, 80)}`,
      };
    }

    const data: ApiResponse = await response.json();

    if (!response.ok || data.error) {
      return {
        ok: false,
        endpoint,
        data,
        error: data.error || data.message || `Request failed at ${endpoint}.`,
      };
    }

    return {
      ok: true,
      endpoint,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      endpoint,
      error:
        error instanceof Error
          ? error.message
          : `Request failed at ${endpoint}.`,
    };
  }
}

async function postToFirstWorkingEndpoint(
  endpoints: string[],
  payload: {
    projectId: string;
    url: string;
    domain: string;
    projectDomain: string;
  }
) {
  const errors: string[] = [];

  for (const endpoint of endpoints) {
    const result = await tryPostEndpoint(endpoint, payload);

    if (result.ok) {
      return result;
    }

    errors.push(`${result.endpoint}: ${result.error}`);
  }

  throw new Error(
    `No working API endpoint found. Checked: ${endpoints.join(
      ", "
    )}. First error: ${errors[0] || "Unknown error"}`
  );
}

export default function AuditRunner({
  projectId,
  projectName,
  projectDomain,
}: AuditRunnerProps) {
  const router = useRouter();

  const [running, setRunning] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [steps, setSteps] = useState<RunStep[]>([
    {
      label: "Prepare audit",
      description: "Validate project and prepare scan request.",
      status: "pending",
    },
    {
      label: "Run SEO checks",
      description: "Check metadata, title, description, and technical issues.",
      status: "pending",
    },
    {
      label: "Run PageSpeed scan",
      description: "Fetch Lighthouse scores from Google PageSpeed Insights.",
      status: "pending",
    },
    {
      label: "Save results",
      description: "Store audit history, issues, and performance scores.",
      status: "pending",
    },
  ]);

  function updateStep(index: number, status: RunStep["status"]) {
    setSteps((currentSteps) =>
      currentSteps.map((step, stepIndex) => {
        if (stepIndex === index) {
          return {
            ...step,
            status,
          };
        }

        return step;
      })
    );
  }

  async function runAudit() {
    setRunning(true);
    setSuccessMessage("");
    setErrorMessage("");

    setSteps([
      {
        label: "Prepare audit",
        description: "Validate project and prepare scan request.",
        status: "running",
      },
      {
        label: "Run SEO checks",
        description: "Check metadata, title, description, and technical issues.",
        status: "pending",
      },
      {
        label: "Run PageSpeed scan",
        description: "Fetch Lighthouse scores from Google PageSpeed Insights.",
        status: "pending",
      },
      {
        label: "Save results",
        description: "Store audit history, issues, and performance scores.",
        status: "pending",
      },
    ]);

    const payload = {
      projectId,
      url: projectDomain,
      domain: projectDomain,
      projectDomain,
    };

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      updateStep(0, "done");

      updateStep(1, "running");

      const seoAuditResult = await postToFirstWorkingEndpoint(
        ["/api/audit", "/api/audits", "/api/audit/run", "/api/run-audit"],
        payload
      );

      updateStep(1, "done");

      updateStep(2, "running");

      const pageSpeedResult = await postToFirstWorkingEndpoint(
        [
          "/api/pagespeed",
          "/api/page-speed",
          "/api/pagespeed/run",
          "/api/pagespeed/audit",
        ],
        payload
      );

      updateStep(2, "done");

      updateStep(3, "running");
      await new Promise((resolve) => setTimeout(resolve, 400));
      updateStep(3, "done");

      setSuccessMessage(
        `Audit completed successfully. SEO endpoint: ${seoAuditResult.endpoint}. PageSpeed endpoint: ${pageSpeedResult.endpoint}.`
      );

      router.refresh();
    } catch (error) {
      setSteps((currentSteps) =>
        currentSteps.map((step) => {
          if (step.status === "running") {
            return {
              ...step,
              status: "error",
            };
          }

          return step;
        })
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while running the audit."
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Run Audit</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Start a fresh scan for {projectName}.
            </p>
          </div>

          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {normalizeDomainForDisplay(projectDomain)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-950">
                Full technical SEO scan
              </p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                This will refresh the project SEO audit, detect issues, fetch
                PageSpeed scores, and update the report data.
              </p>
            </div>

            <Button
              onClick={runAudit}
              disabled={running}
              className="rounded-xl"
            >
              {running ? "Running audit..." : "Run Full Audit"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          {steps.map((step, index) => (
            <div
              key={step.label}
              className={`rounded-2xl border p-4 transition ${getStepClass(
                step.status
              )}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${getDotClass(
                    step.status
                  )}`}
                />

                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-950">
                      {index + 1}. {step.label}
                    </p>

                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                      {step.status}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-medium text-emerald-900">Audit complete</p>
            <p className="mt-1 text-sm text-emerald-700">
              {successMessage}
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-900">Audit failed</p>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-950">
              SEO Issues
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Finds metadata and on-page SEO gaps.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-950">
              PageSpeed
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Pulls real Lighthouse performance data.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-950">
              Reports
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Updates client-ready report output.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}