import { StatCard } from "./StatCard";

type UserStat = {
  id: string;
  name: string;
  totalClients: number;
  converted: number;
  connected: number;
  inProgress: number;
  notResponding: number;
  totalSales: number;
  leadGenClients: Record<string, number>; // <-- important
  followUpsCompleted: number;
  followUpsMissed: number;
  followUpsRescheduled: number;
};
type UserStatsTableProps = {
  stats: UserStat[];
};

export default function UserStatsTable({ stats }: UserStatsTableProps) {
  return (
    <div className="space-y-4">
      {stats.map((user) => (
        <div key={user.id} className="p-4 bg-gray-900 rounded-xl shadow">
          <h3 className="font-bold text-lg mb-2">{user.name}</h3>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Clients" count={user.totalClients} color="bg-blue-600" />
            <StatCard label="Converted" count={user.converted} color="bg-green-600" />
            <StatCard label="Connected" count={user.connected} color="bg-yellow-600" />
            <StatCard label="In Progress" count={user.inProgress} color="bg-orange-600" />
            <StatCard label="Not Responding" count={user.notResponding} color="bg-red-600" />
            <StatCard label="Sales" count={user.totalSales} color="bg-purple-600" />
          </div>
            <div className="mt-3">
            <h4 className="font-semibold text-sm mb-2">Lead Gen Clients:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(user.leadGenClients).map(([agentName, count]) => (
                <StatCard
                    key={agentName}
                    label={agentName}
                    count={count}
                    color="bg-gray-700"
                />
                ))}
            </div>
            </div>

            <div className="mt-3">
            <div className="mt-3">
                <h4 className="font-semibold text-sm mb-2">Follow-ups:</h4>
                <div className="grid grid-cols-3 gap-2">
                    <StatCard
                    label="Completed"
                    count={user.followUpsCompleted}
                    color="bg-green-600"
                    />
                    <StatCard
                    label="Missed"
                    count={user.followUpsMissed}
                    color="bg-red-600"
                    />
                    <StatCard
                    label="Upcoming"
                    count={user.followUpsRescheduled} // now shows upcoming
                    color="bg-yellow-600"
                    />
                </div>
                </div>
            </div>
        </div>
      ))}
    </div>
  );
}
