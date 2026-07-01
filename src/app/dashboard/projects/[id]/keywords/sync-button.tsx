"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type KeywordsSyncButtonProps = {
  projectId: string;
};

export default function KeywordsSyncButton({ projectId }: KeywordsSyncButtonProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSync() {
    try {
      setIsSyncing(true);
      setMessage("");

      const response = await fetch("/api/gsc/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not sync keywords.");
      }

      setMessage(`Synced ${data.synced} keywords.`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while syncing keywords."
      );
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        className="inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSyncing ? "Syncing..." : "Sync GSC Data"}
      </button>

      {message ? (
        <p className="max-w-[260px] text-left text-[11px] leading-4 text-slate-500 sm:text-right">
          {message}
        </p>
      ) : null}
    </div>
  );
}