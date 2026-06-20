"use client";

import { Button } from "@/components/ui/button";

export default function ConnectGscButton() {
  function handleConnect() {
    window.location.href = "/api/gsc/connect";
  }

  return (
    <Button onClick={handleConnect}>
      Connect Google Search Console
    </Button>
  );
}