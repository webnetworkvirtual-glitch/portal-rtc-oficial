import React from "react";

interface MetricCounterProps {
  value: number;
  label: string;
  sublabel?: string;
  color?: "orange" | "green" | "blue" | "gray";
}

export const MetricCounter: React.FC<MetricCounterProps> = ({
  value,
  label,
  sublabel,
  color = "orange"
}) => {
  // Pad number to 3 or 4 digits
  const paddedValue = value.toString().padStart(4, "0");
  const digits = paddedValue.split("");

  const colorClasses = {
    orange: {
      digitBg: "bg-slate-900 border-orange-500/30 text-orange-500 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),0_0_8px_rgba(249,115,22,0.3)]",
      glowingLight: "bg-orange-500 shadow-[0_0_10px_#f97316]"
    },
    green: {
      digitBg: "bg-slate-900 border-emerald-500/30 text-emerald-400 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),0_0_8px_rgba(16,185,129,0.3)]",
      glowingLight: "bg-emerald-400 shadow-[0_0_10px_#10b981]"
    },
    blue: {
      digitBg: "bg-slate-900 border-sky-500/30 text-sky-400 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),0_0_8px_rgba(56,189,248,0.3)]",
      glowingLight: "bg-sky-400 shadow-[0_0_10px_#38bdf8]"
    },
    gray: {
      digitBg: "bg-slate-900 border-slate-500/30 text-slate-400 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]",
      glowingLight: "bg-slate-500 shadow-[0_0_10px_#64748b]"
    }
  }[color];

  return (
    <div className="flex flex-col items-center bg-slate-100 rounded-2xl p-4 border border-slate-200/80 shadow-[6px_6px_12px_#d1d5db,-6px_-6px_12px_#ffffff] relative overflow-hidden">
      {/* Decorative metal rivets in corners */}
      <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400/50 shadow-inner"></div>
      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400/50 shadow-inner"></div>
      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400/50 shadow-inner"></div>
      <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-400/50 shadow-inner"></div>

      {/* Segmented display numbers */}
      <div className="flex items-center gap-1.5 mb-2 relative">
        {digits.map((digit, idx) => (
          <div
            key={idx}
            className={`w-10 h-14 rounded-lg flex items-center justify-center font-mono text-3xl font-semibold border-b-2 relative ${colorClasses.digitBg}`}
          >
            {digit}
            {/* Split flip clock line */}
            <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-black/40"></div>
          </div>
        ))}

        {/* Status Led Lamp */}
        <div className="flex flex-col items-center justify-center ml-2">
          <div className={`w-2.5 h-2.5 rounded-full ${colorClasses.glowingLight} animate-pulse mb-1`}></div>
          <span className="text-[9px] text-slate-400 uppercase font-mono tracking-widest font-bold">Live</span>
        </div>
      </div>

      <span className="text-xs text-slate-700 font-sans tracking-tight font-medium uppercase mt-1">{label}</span>
      {sublabel && <span className="text-[10px] text-slate-500 font-mono mt-0.5">{sublabel}</span>}
    </div>
  );
};
