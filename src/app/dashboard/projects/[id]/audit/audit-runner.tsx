"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

function normalizeDomain(domain: string) {
  return domain
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

function getStepClass(status: RunStep["status"]) {
  if (status === "done") return "border-[#d4af37]/50 bg-[#fff8df]";
  if (status === "running") return "border-[#d4af37]/70 bg-[#fff8df]";
  if (status === "error") return "border-red-200 bg-red-50";
  return "border-[#e6dcc8] bg-white";
}

function getDotClass(status: RunStep["status"]) {
  if (status === "done") return "bg-[#d4af37]";
  if (status === "running") return "bg-[#111111]";
  if (status === "error") return "bg-red-500";
  return "bg-[#d8cdb8]";
}

function getBadgeClass(status: RunStep["status"]) {
  if (status === "done") return "border-[#d4af37]/50 bg-[#d4af37] text-black";
  if (status === "running") return "border-[#111111] bg-[#111111] text-white";
  if (status === "error") return "border-red-200 bg-red-50 text-red-700";
  return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
}

async function tryPostEndpoint(
  endpoint: string,
  payload: { projectId: string; url: string; domain: string; projectDomain: string }
): Promise<EndpointResult> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();
      return {
        ok: false,
        endpoint,
        error: `Endpoint returned non-JSON response. Status: ${response.status}. Preview: ${text.slice(0, 80)}`,
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

    return { ok: true, endpoint, data };
  } catch (error) {
    return {
      ok: false,
      endpoint,
      error: error instanceof Error ? error.message : `Request failed at ${endpoint}.`,
    };
  }
}

async function postToFirstWorkingEndpoint(
  endpoints: string[],
  payload: { projectId: string; url: string; domain: string; projectDomain: string }
) {
  const errors: string[] = [];

  for (const endpoint of endpoints) {
    const result = await tryPostEndpoint(endpoint, payload);
    if (result.ok) return result;
    errors.push(`${result.endpoint}: ${result.error}`);
  }

  throw new Error(
    `No working API endpoint found. Checked: ${endpoints.join(", ")}. First error: ${errors[0] || "Unknown error"}`
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
    setSteps((current) =>
      current.map((step, i) => (i === index ? { ...step, status } : step))
    );
  }

  async function runAudit() {
    setRunning(true);
    setSuccessMessage("");
    setErrorMessage("");

    setSteps([
      { ...initialSteps[0], status: "running" },
      initialSteps[1],
      initialSteps[2],
      initialSteps[3],
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

      const seoResult = await postToFirstWorkingEndpoint(
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
        `Audit completed. SEO endpoint: ${seoResult.endpoint}. PageSpeed endpoint: ${pageSpeedResult.endpoint}.`
      );

      router.refresh();
    } catch (error) {
      setSteps((current) =>
        current.map((step) =>
          step.status === "running" ? { ...step, status: "error" } : step
        )
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
    <div className="rounded-2xl border border-[#e6dcc8] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee5d4] px-5 py-4">
        <div>
          <p className="text-sm font-bold text-slate-950">Run Audit</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Start a fresh technical SEO scan for {projectName}.
          </p>
        </div>
        <span className="rounded-full border border-[#d4af37]/40 bg-[#fff8df] px-3 py-1 text-[11px] font-semibold text-[#7a5b00]">
          {normalizeDomain(projectDomain)}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
          <div>
            <p className="text-xs font-semibold text-slate-950">
              Full technical SEO scan
            </p>
            <p className="mt-1 max-w-md text-[11px] leading-4 text-slate-500">
              Refresh audit data, detect SEO issues, fetch PageSpeed scores,
              and update report data.
            </p>
          </div>
          <button
            onClick={runAudit}
            disabled={running}
            className="inline-flex h-9 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? "Running..." : "Run Full Audit"}
          </button>
        </div>

        <div className="grid gap-2">
          {steps.map((step, index) => (
            <div
              key={step.label}
              className={`rounded-xl border p-3 transition ${getStepClass(step.status)}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${getDotClass(step.status)}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-950">
                      {index + 1}. {step.label}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${getBadgeClass(step.status)}`}
                    >
                      {step.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {successMessage ? (
          <div className="rounded-xl border border-[#d4af37]/50 bg-[#fff8df] p-3">
            <p className="text-xs font-semibold text-[#7a5b00]">
              Audit complete
            </p>
            <p className="mt-1 text-[11px] leading-4 text-[#7a5b00]/80">
              {successMessage}
            </p>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-900">Audit failed</p>
            <p className="mt-1 text-[11px] leading-4 text-red-700">
              {errorMessage}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}