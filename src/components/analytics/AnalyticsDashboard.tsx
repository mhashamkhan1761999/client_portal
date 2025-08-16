'use client'

import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { StatCard } from "./StatCard";
import UserStatsTable from "./UserStatsTable";
import FollowUpStats from "./FollowUpStats";

type UserStat = {
  id: string;
  name: string;
  totalClients: number;
  converted: number;
  connected: number;
  inProgress: number;
  notResponding: number;
  totalSales: number;
  leadGenClients: { [agentName: string]: number };
  followUpsCompleted: number;
  followUpsMissed: number;
  followUpsRescheduled: number;
};

const now = new Date();

export default function AnalyticsDashboard({ currentUser }: { currentUser: any }) {
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);
  const [totalSalesAllUsers, setTotalSalesAllUsers] = useState(0);

  // Filter state (example: "month" | "quarter" | "year")
  const [filter, setFilter] = useState<"month" | "quarter" | "year">("month");

  const fetchAnalytics = async () => {
    setLoading(true);

    // Fetch current user role
    const { data: currentUserData } = await supabase
      .from("users")
      .select("id, name, role")
      .eq("id", currentUser)
      .single();

    if (!currentUserData) return;

    const isAdmin = currentUserData.role === "admin";

    // Fetch users
    const { data: users } = await supabase
      .from("users")
      .select("id, name")
      .eq("is_active", true);

    if (!users) return;

    // Fetch lead agents
    const { data: leadAgents } = await supabase
      .from("lead_gens")
      .select("id, name");
    const leadAgentMap: Record<string, string> = {};
    leadAgents?.forEach(agent => {
      leadAgentMap[agent.id] = agent.name;
    });

    const stats: UserStat[] = [];
    let allClientsCount = 0;
    let totalSalesCount = 0;

    for (const user of users) {
      if (!isAdmin && user.id !== currentUser) continue; // Filter for normal users

      // Fetch clients for user
      const { data: clients } = await supabase
        .from("clients")
        .select("*")
        .eq("assigned_to", user.id);

      const totalClientsForUser = clients?.length || 0;
      allClientsCount += totalClientsForUser;

      // Status counts
      const converted = clients?.filter(c => c.status === "converted").length || 0;
      const connected = clients?.filter(c => c.status === "followup").length || 0;
      const inProgress = clients?.filter(c => c.status === "in_progress").length || 0;
      const notResponding = clients?.filter(c => c.status === "new").length || 0;

      // Sales
      const { data: salesData } = await supabase
        .from("client_service_sales")
        .select("sold_price")
        .eq("created_by", user.id);

      const totalSales = salesData?.reduce((acc, s) => acc + (s.sold_price || 0), 0) || 0;
      totalSalesCount += totalSales;

      // Lead Gen Clients
      const leadGenClients: { [agentName: string]: number } = {};
      clients?.forEach(c => {
        if (c.lead_gen_id) {
          const name = leadAgentMap[c.lead_gen_id];
          if (name) leadGenClients[name] = (leadGenClients[name] || 0) + 1;
        }
      });

      // Follow-ups
      const { data: followUps } = await supabase
        .from("follow_ups")
        .select("*")
        .eq("user_id", user.id);

        const followUpsCompleted = followUps?.filter(f => f.is_completed).length || 0;
        const followUpsMissed = followUps?.filter(f => !f.is_completed && new Date(f.reminder_date) < now).length || 0;
        const followUpsUpcoming = followUps?.filter(f => !f.is_completed && new Date(f.reminder_date) >= now).length || 0;

      stats.push({
        id: user.id,
        name: user.name,
        totalClients: totalClientsForUser,
        converted,
        connected,
        inProgress,
        notResponding,
        totalSales,
        leadGenClients,
        followUpsCompleted,
        followUpsMissed,
        followUpsRescheduled: followUpsUpcoming, // renamed for UI
      });
    }

    setUserStats(stats);
    setTotalClients(allClientsCount);
    setTotalSalesAllUsers(isAdmin ? totalSalesCount : 0);
    setLoading(false);
  };
    useEffect(() => {
    fetchAnalytics(); // Initial fetch

    // Create a real-time channel
    const channel = supabase.channel('analytics-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchAnalytics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'client_service_sales' }, () => fetchAnalytics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_ups' }, () => fetchAnalytics())
        .subscribe();

    // Cleanup
    return () => {
        supabase.removeChannel(channel);
    };
    }, [filter]);

  if (loading) return <div>Loading analytics...</div>;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <button
          className={`px-4 py-2 rounded ${filter === "month" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-200"}`}
          onClick={() => setFilter("month")}
        >
          1 Month
        </button>
        <button
          className={`px-4 py-2 rounded ${filter === "quarter" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-200"}`}
          onClick={() => setFilter("quarter")}
        >
          Quarter
        </button>
        <button
          className={`px-4 py-2 rounded ${filter === "year" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-200"}`}
          onClick={() => setFilter("year")}
        >
          Year
        </button>
      </div>

      {/* Total Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <StatCard label="Total Clients" count={totalClients} color="bg-blue-600" />
        {totalSalesAllUsers >= 0 && (
          <StatCard label="Total Sales (All Users)" count={totalSalesAllUsers} color="bg-purple-600" />
        )}
      </div>

      {/* User Stats */}
      <UserStatsTable stats={userStats} />
    </div>
  );
}
