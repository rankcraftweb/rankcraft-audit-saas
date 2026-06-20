"use client";

import { Button } from "@/components/ui/button";

export default function PrintReportButton() {
  function handlePrint() {
    window.print();
  }

  return (
    <Button onClick={handlePrint}>
      Export / Print Report
    </Button>
  );
}