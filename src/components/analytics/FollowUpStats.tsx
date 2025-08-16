import React from "react";
import { StatCard } from "./StatCard";

export default function FollowUpStats({ stats }: { stats: any[] }) {
  const totalCompleted = stats.reduce((acc, u) => acc + (u.followUpsCompleted || 0), 0);
  const totalMissed = stats.reduce((acc, u) => acc + (u.followUpsMissed || 0), 0);
  const totalRescheduled = stats.reduce((acc, u) => acc + (u.followUpsRescheduled || 0), 0);

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard label="Follow-ups Completed" count={totalCompleted} color="bg-green-600" />
      <StatCard label="Follow-ups Missed" count={totalMissed} color="bg-red-600" />
      <StatCard label="Follow-ups Rescheduled" count={totalRescheduled} color="bg-yellow-600" />
    </div>
  );
}
