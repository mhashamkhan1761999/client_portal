import React, { JSX } from "react";

export function StatCard({ label, count, color, icon }: { label: string; count: number; color: string; icon?: JSX.Element }) {
  return (
    <div className={`rounded-xl p-5 ${color} text-white shadow-lg flex items-center space-x-4`}>
      <div className="text-4xl">{icon}</div>
      <div>
        <div className="text-md uppercase">{label}</div>
        <div className="text-2xl font-bold">{count}</div>
      </div>
    </div>
  );
}
