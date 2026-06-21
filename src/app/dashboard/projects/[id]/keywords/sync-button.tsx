"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type KeywordsSyncButtonProps = {
  projectId: string;
};

export default function KeywordsSyncButton({
  projectId,
}: KeywordsSyncButtonProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSync() {
    try {
      setIsSyncing(true);
      setMessage("");

      const response = await fetch("/api/gsc/keywords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
        }),
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
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSyncing ? "Syncing..." : "Sync Keywords"}
      </button>

      {message ? (
        <p className="max-w-[260px] text-left text-xs leading-5 text-slate-500 sm:text-right">
          {message}
        </p>
      ) : null}
    </div>
  );
}