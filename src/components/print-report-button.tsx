"use client";

export default function PrintReportButton() {
  function handlePrint() {
    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black"
    >
      Export / Print Report
    </button>
  );
}