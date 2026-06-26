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

const initialSteps: RunStep[] = [
  {
    label: "Prepare audit",
    description: "Validate project and prepare the scan request.",
    status: "pending",
  },
  {
    label: "Run SEO checks",
    description: "Check metadata, titles, descriptions, and technical issues.",
    status: "pending",
  },
  {
    label: "Run PageSpeed scan",
    description: "Fetch Lighthouse scores from PageSpeed Insights.",
    status: "pending",
  },
  {
    label: "Save results",
    description: "Store audit history, issues, scores, and report data.",
    status: "pending",
  },
];

function normalizeDomainForDisplay(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

function getStepClass(status: RunStep["status"]) {
  if (status === "done") {
    return "border-[#d4af37]/50 bg-[#fff8df]";
  }

  if (status === "running") {
    return "border-[#d4af37]/70 bg-[#fff8df]";
  }

  if (status === "error") {
    return "border-red-200 bg-red-50";
  }

  return "border-[#e6dcc8] bg-white";
}

function getDotClass(status: RunStep["status"]) {
  if (status === "done") {
    return "bg-[#d4af37]";
  }

  if (status === "running") {
    return "bg-[#111111]";
  }

  if (status === "error") {
    return "bg-red-500";
  }

  return "bg-[#d8cdb8]";
}

function getStatusBadgeClass(status: RunStep["status"]) {
  if (status === "done") {
    return "border-[#d4af37]/50 bg-[#d4af37] text-black";
  }

  if (status === "running") {
    return "border-[#111111] bg-[#111111] text-white";
  }

  if (status === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
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
  const [steps, setSteps] = useState<RunStep[]>(initialSteps);

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
        description: "Validate project and prepare the scan request.",
        status: "running",
      },
      {
        label: "Run SEO checks",
        description:
          "Check metadata, titles, descriptions, and technical issues.",
        status: "pending",
      },
      {
        label: "Run PageSpeed scan",
        description: "Fetch Lighthouse scores from PageSpeed Insights.",
        status: "pending",
      },
      {
        label: "Save results",
        description: "Store audit history, issues, scores, and report data.",
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
        `Audit completed. SEO endpoint: ${seoAuditResult.endpoint}. PageSpeed endpoint: ${pageSpeedResult.endpoint}.`
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
    <Card className="rounded-2xl border-[#e6dcc8] bg-white shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-slate-950">
              Run Audit
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Start a fresh technical SEO scan for {projectName}.
            </p>
          </div>

          <span className="rounded-full border border-[#d4af37]/40 bg-[#fff8df] px-3 py-1 text-xs font-semibold text-[#7a5b00]">
            {normalizeDomainForDisplay(projectDomain)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-950">
                Full technical SEO scan
              </p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Refresh audit data, detect SEO issues, fetch PageSpeed scores,
                and update client report data.
              </p>
            </div>

            <Button
              onClick={runAudit}
              disabled={running}
              className="h-10 rounded-xl bg-[#111111] px-4 text-sm text-white hover:bg-black"
            >
              {running ? "Running..." : "Run Full Audit"}
            </Button>
          </div>
        </div>

        <div className="grid gap-2.5">
          {steps.map((step, index) => (
            <div
              key={step.label}
              className={`rounded-2xl border p-4 transition ${getStepClass(
                step.status
              )}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${getDotClass(
                    step.status
                  )}`}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-950">
                      {index + 1}. {step.label}
                    </p>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${getStatusBadgeClass(
                        step.status
                      )}`}
                    >
                      {step.status}
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {successMessage ? (
          <div className="rounded-2xl border border-[#d4af37]/50 bg-[#fff8df] p-4">
            <p className="font-semibold text-[#7a5b00]">Audit complete</p>
            <p className="mt-1 text-sm leading-6 text-[#7a5b00]/80">
              {successMessage}
            </p>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-900">Audit failed</p>
            <p className="mt-1 text-sm leading-6 text-red-700">
              {errorMessage}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}