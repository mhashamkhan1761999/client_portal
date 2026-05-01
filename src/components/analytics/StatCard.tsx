import React, { JSX } from "react";

export function StatCard({ label, count, color, icon }: { label: string; count: number; color: string; icon?: JSX.Element }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#161719] p-4 text-white shadow-sm">
      {icon && (
        <div className={`flex h-10 w-10 items-center justify-center rounded border border-slate-700 text-xl ${color}`}>
          {icon}
        </div>
      )}
      <div>
        <div className="text-xs uppercase text-slate-400">{label}</div>
        <div className="text-xl font-bold text-slate-50">{count}</div>
      </div>
    </div>
  );
}
