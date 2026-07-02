type GscStatusBadgeProps = {
  connected: boolean;
};

export default function GscStatusBadge({ connected }: GscStatusBadgeProps) {
  if (connected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/50 bg-[#fff8df] px-2.5 py-0.5 text-[11px] font-semibold text-[#7a5b00]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
        GSC Connected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6dcc8] bg-[#faf7ef] px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Not Connected
    </span>
  );
}