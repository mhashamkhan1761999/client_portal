'use client'

import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { StatCard } from "./StatCard";
import UserStatsTable from "./UserStatsTable";
import FollowUpStats from "./FollowUpStats";
import { getLeadNatureLabel } from "@/lib/leadNature";

type UserStat = {
  id: string;
  name: string;
  totalClients: number;
  converted: number;
  connected: number;
  drop: number;
  inProgress: number;
  notResponding: number;
  totalSales: number;
  leadGenClients: { [agentName: string]: number };
  followUpsCompleted: number;
  followUpsMissed: number;
  followUpsRescheduled: number;
};

type TransferStat = {
  userId: string;
  name: string;
  sent: number;
  received: number;
  pairs: Record<string, number>;
};

type LeadGenStat = {
  id: string;
  name: string;
  total: number;
  connected: number;
  converted: number;
  byNature: Record<string, { connected: number; converted: number; total: number }>;
};

type AnalyticsFilter = "current_month" | "last_month" | "quarter" | "year" | "all";
const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const getFilterRange = (filter: AnalyticsFilter) => {
  const now = new Date();
  if (filter === "all") return { start: "", end: "" };
  if (filter === "last_month") {
    return {
      start: toDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      end: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    };
  }
  if (filter === "quarter") {
    return {
      start: toDateInput(new Date(now.getFullYear(), now.getMonth() - 3, 1)),
      end: toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
    };
  }
  if (filter === "year") {
    return {
      start: toDateInput(new Date(now.getFullYear() - 1, now.getMonth(), 1)),
      end: toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
    };
  }
  return {
    start: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
  };
};

const applyRange = (query: any, column: string, filter: AnalyticsFilter) => {
  if (filter === "all") return query;
  const range = getFilterRange(filter);
  return query.gte(column, range.start).lt(column, range.end);
};

export default function AnalyticsDashboard({ currentUser }: { currentUser: any }) {
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);
  const [totalSalesAllUsers, setTotalSalesAllUsers] = useState(0);
  const [transferStats, setTransferStats] = useState<TransferStat[]>([]);
  const [leadGenStats, setLeadGenStats] = useState<LeadGenStat[]>([]);
  const [reportView, setReportView] = useState<"team" | "transfers" | "leadgen">("team");

  // Filter state (example: "month" | "quarter" | "year")
  const [filter, setFilter] = useState<AnalyticsFilter>("current_month");

  const fetchAnalytics = async () => {
    setLoading(true);

    // Fetch current user role
    const { data: currentUserData } = await supabase
      .from("users")
      .select("id, name, role")
      .eq("id", currentUser)
      .single();

    if (!currentUserData) {
      setLoading(false);
      return;
    }

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
    const currentNow = new Date();

    const { data: allTransfers } = await supabase
      .from("lead_transfers")
      .select("from_user_id, to_user_id, transfer_type");

    const { data: allClientsForLeadGen } = await applyRange(
      supabase
      .from("clients")
        .select("id, status, lead_gen_id, lead_nature, created_at"),
      "created_at",
      filter
    );

    for (const user of users) {
      if (!isAdmin && user.id !== currentUser) continue; // Filter for normal users

      // Fetch clients for user
      const { data: clients } = await applyRange(
        supabase
        .from("clients")
        .select("*")
          .eq("assigned_to", user.id),
        "created_at",
        filter
      );

      const userClients = (clients || []) as any[];
      const totalClientsForUser = userClients.length;
      allClientsCount += totalClientsForUser;

      // Status counts
      const converted = userClients.filter((c: any) => c.status === "converted").length;
      const connected = userClients.filter((c: any) => c.status === "connected").length;
      const drop = userClients.filter((c: any) => c.status === "drop").length;
      const inProgress = userClients.filter((c: any) => c.status === "interested" || c.status === "in_progress").length;
      const notResponding = userClients.filter((c: any) => c.status === "not_responding" || c.status === "unresponsive").length;

      // Sales
      const { data: salesData } = await applyRange(
        supabase
        .from("client_service_sales")
          .select("sold_price, created_at")
          .eq("created_by", user.id),
        "created_at",
        filter
      );

      const totalSales = ((salesData || []) as any[]).reduce((acc: number, s: any) => acc + Number(s.sold_price || 0), 0);
      totalSalesCount += totalSales;

      // Lead Gen Clients
      const leadGenClients: { [agentName: string]: number } = {};
      userClients.forEach((c: any) => {
        if (c.lead_gen_id) {
          const name = leadAgentMap[c.lead_gen_id];
          if (name) leadGenClients[name] = (leadGenClients[name] || 0) + 1;
        }
      });

      // Follow-ups
      const { data: followUps } = await applyRange(
        supabase
        .from("follow_ups")
        .select("*")
          .eq("user_id", user.id),
        "reminder_date",
        filter
      );

        const userFollowUps = (followUps || []) as any[];
        const followUpsCompleted = userFollowUps.filter((f: any) => f.is_completed).length;
        const followUpsMissed = userFollowUps.filter((f: any) => !f.is_completed && new Date(f.reminder_date) < currentNow).length;
        const followUpsUpcoming = userFollowUps.filter((f: any) => !f.is_completed && new Date(f.reminder_date) >= currentNow).length;

      stats.push({
        id: user.id,
        name: user.name,
        totalClients: totalClientsForUser,
        converted,
        connected,
        drop,
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

    const userNameMap = Object.fromEntries(users.map((item: any) => [item.id, item.name || item.id]));

    setTransferStats(
      users.map((item: any) => {
        const sentTransfers = (allTransfers || []).filter((transfer: any) => transfer.from_user_id === item.id);
        const receivedTransfers = (allTransfers || []).filter((transfer: any) => transfer.to_user_id === item.id);
        const pairs: Record<string, number> = {};

        sentTransfers.forEach((transfer: any) => {
          const receiver = transfer.to_user_id ? userNameMap[transfer.to_user_id] || transfer.to_user_id : "Unknown";
          pairs[receiver] = (pairs[receiver] || 0) + 1;
        });

        return {
          userId: item.id,
          name: item.name,
          sent: sentTransfers.length,
          received: receivedTransfers.length,
          pairs,
        };
      })
    );

    setLeadGenStats(
      (leadAgents || []).map((agent: any) => {
        const leadClients = (allClientsForLeadGen || []).filter((client: any) => client.lead_gen_id === agent.id);
        const byNature: Record<string, { connected: number; converted: number; total: number }> = {};

        leadClients.forEach((client: any) => {
          const nature = getLeadNatureLabel(client.lead_nature);
          byNature[nature] ||= { connected: 0, converted: 0, total: 0 };
          byNature[nature].total += 1;
          if (client.status === "connected" || client.status === "converted") byNature[nature].connected += 1;
          if (client.status === "converted") byNature[nature].converted += 1;
        });

        return {
          id: agent.id,
          name: agent.name,
          total: leadClients.length,
          connected: leadClients.filter((client: any) => client.status === "connected" || client.status === "converted").length,
          converted: leadClients.filter((client: any) => client.status === "converted").length,
          byNature,
        };
      }).sort((a, b) => b.converted - a.converted || b.connected - a.connected || b.total - a.total)
    );

    setLoading(false);
  };
    useEffect(() => {
    fetchAnalytics(); // Initial fetch

    // Create a real-time channel
    const channel = supabase.channel('analytics-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchAnalytics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_transfers' }, () => fetchAnalytics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'client_service_sales' }, () => fetchAnalytics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_ups' }, () => fetchAnalytics())
        .subscribe();

    // Cleanup
    return () => {
        supabase.removeChannel(channel);
    };
    }, [filter, currentUser]);

  if (loading) return <div>Loading analytics...</div>;
  const bestLeadGen = leadGenStats[0];
  const connectedClients = userStats.reduce((sum, item) => sum + item.connected + item.converted, 0);
  const convertedClients = userStats.reduce((sum, item) => sum + item.converted, 0);
  const droppedClients = userStats.reduce((sum, item) => sum + item.drop, 0);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`px-4 py-2 rounded ${filter === "current_month" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-200"}`}
          onClick={() => setFilter("current_month")}
        >
          Current Month
        </button>
        <button
          className={`px-4 py-2 rounded ${filter === "last_month" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-200"}`}
          onClick={() => setFilter("last_month")}
        >
          Last Month
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
        <button
          className={`px-4 py-2 rounded ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-200"}`}
          onClick={() => setFilter("all")}
        >
          All Dates
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Connected Clients" count={connectedClients} color="bg-cyan-600" />
        <StatCard label="Converted Clients" count={convertedClients} color="bg-green-600" />
        <StatCard label="Dropped Clients" count={droppedClients} color="bg-red-700" />
        <StatCard label="Best Lead Gen" count={bestLeadGen ? bestLeadGen.converted || bestLeadGen.connected || bestLeadGen.total : 0} color="bg-amber-600" />
      </div>
      {bestLeadGen && (
        <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-100">
          Best lead generator: <span className="font-semibold">{bestLeadGen.name}</span> with {bestLeadGen.total} leads, {bestLeadGen.connected} connected, and {bestLeadGen.converted} converted in this period.
        </div>
      )}

      {/* Total Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Total Clients" count={totalClients} color="bg-blue-600" />
        {totalSalesAllUsers >= 0 && (
          <StatCard label="Total Sales (All Users)" count={totalSalesAllUsers} color="bg-purple-600" />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "team", label: "Team Stats" },
          { id: "transfers", label: "Transfers" },
          { id: "leadgen", label: "Lead Gen" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`rounded border px-3 py-1.5 text-sm ${
              reportView === tab.id
                ? "border-sky-500 bg-sky-500/15 text-sky-200"
                : "border-slate-700 bg-[#101113] text-slate-300 hover:border-slate-500"
            }`}
            onClick={() => setReportView(tab.id as typeof reportView)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={reportView === "team" ? "block" : "hidden"}>
        <UserStatsTable stats={userStats} />
      </div>

      <div className={`${reportView === "transfers" ? "block" : "hidden"} space-y-4`}>
        <h2 className="text-xl font-semibold">Transfer Report</h2>
        {transferStats.map((item) => (
          <div key={item.userId} className="rounded-lg border border-slate-800 bg-gray-900 p-4">
            <h3 className="font-bold mb-3">{item.name}</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Transfers Sent" count={item.sent} color="bg-purple-600" />
              <StatCard label="Transfers Received" count={item.received} color="bg-cyan-600" />
            </div>
            {Object.keys(item.pairs).length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(item.pairs).map(([receiver, count]) => (
                  <StatCard key={receiver} label={`To ${receiver}`} count={count} color="bg-gray-700" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={`${reportView === "leadgen" ? "block" : "hidden"} space-y-4`}>
        <h2 className="text-xl font-semibold">Lead Gen Performance</h2>
        {leadGenStats.map((agent) => (
          <div key={agent.id} className="rounded-lg border border-slate-800 bg-gray-900 p-4">
            <h3 className="font-bold mb-3">{agent.name}</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Connected Leads" count={agent.connected} color="bg-cyan-600" />
              <StatCard label="Converted Leads" count={agent.converted} color="bg-green-600" />
            </div>
            {Object.entries(agent.byNature).length > 0 && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(agent.byNature).map(([nature, counts]) => (
                  <div key={nature} className="rounded bg-gray-800 p-3 text-sm">
                    <div className="font-semibold">{nature}</div>
                    <div className="text-gray-300">Total: {counts.total}</div>
                    <div className="text-gray-300">Connected: {counts.connected}</div>
                    <div className="text-gray-300">Converted: {counts.converted}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
