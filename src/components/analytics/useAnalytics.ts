import { useState, useEffect } from "react";
import supabase from "@/lib/supabaseClient";

export type FilterType = "month" | "quarter" | "year";

export const useAnalytics = (userId: string, role: string, filter: FilterType = "month") => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalClientsByUser: {} as Record<string, number>,
    totalLeadGens: 0,
    totalSales: 0,
    totalSalesByUser: {} as Record<string, number>,
    leadGenNames: {} as Record<string, string>, // map id => name
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // --- Total Clients ---
        const { data: clientsData, count: totalClients } = await supabase
          .from("clients")
          .select("id, assigned_to", { count: "exact" });

        // --- Total Lead Gen Agents with names ---
        const { data: leadGens } = await supabase.from("users")
          .select("id, name")
          .eq("role", "lead_gen");

        const leadGenNames: Record<string, string> = {};
        if (leadGens) {
          leadGens.forEach(agent => {
            leadGenNames[agent.id] = agent.name;
          });
        }

        // --- Total Sales ---
        const { data: salesData } = await supabase.from("client_service_sales").select("price, created_by");
        let totalSales = 0;
        const totalSalesByUser: Record<string, number> = {};

        if (salesData) {
          salesData.forEach((sale: any) => {
            totalSales += parseFloat(sale.price);
            if (sale.created_by) {
              totalSalesByUser[sale.created_by] = (totalSalesByUser[sale.created_by] || 0) + parseFloat(sale.price);
            }
          });
        }

        // --- Total clients by user ---
        const totalClientsByUser: Record<string, number> = {};
        if (clientsData && clientsData.length) {
          clientsData.forEach((c: any) => {
            if (c.assigned_to) {
              totalClientsByUser[c.assigned_to] = (totalClientsByUser[c.assigned_to] || 0) + 1;
            }
          });
        }

        setStats({
          totalClients: role === "admin" ? totalClients || 0 : totalClientsByUser[userId] || 0,
          totalClientsByUser,
          totalLeadGens: role === "admin" ? leadGens?.length || 0 : 0,
          totalSales: role === "admin" ? totalSales : (totalSalesByUser[userId] || 0),
          totalSalesByUser,
          leadGenNames,
        });
      } catch (err) {
        console.error("Error fetching analytics:", err);
      }
    };

    fetchStats();
  }, [userId, role, filter]);

  return stats;
};
