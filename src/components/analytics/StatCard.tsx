import React, { JSX } from "react";

export function StatCard({ label, count, color, icon }: { label: string; count: number; color: string; icon?: JSX.Element }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#161719] p-5 text-white shadow-sm flex items-center space-x-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded border border-slate-700 text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-sm uppercase text-slate-400">{label}</div>
        <div className="text-2xl font-bold text-slate-50">{count}</div>
      </div>
    </div>
  );
}
