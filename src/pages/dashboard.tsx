// pages/dashboard.tsx

import React from 'react'
import Layout from '../components/layout/Layout'
import { useEffect, useState } from 'react'
import supabase from 'lib/supabaseClient'
import { UserGroupIcon, CheckCircleIcon, ClockIcon, XCircleIcon, ArrowTrendingUpIcon, InboxStackIcon } from '@heroicons/react/24/outline'
import ClientTable from '../components/clients/ClientTable'
import { useRouter } from 'next/router'
import type { Session } from '@supabase/supabase-js'
import UpcomingFollowUps from "@/lib/UpcomingFollowUps";
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import { useAuth } from '@/context/AuthContext'



export default function Dashboard() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const router = useRouter()
  const { user } = useAuth(); // your auth context

  // all hooks stay at the top, no early return!

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/login')
      } else {
        setSession(data.session)
      }
      setLoading(false)
    }

    const fetchClients = async () => {
      const { data, error } = await supabase.from('clients').select('*')
      if (!error) setClients(data || [])
    }

    checkSession()
    fetchClients()
  }, [router])

  const assignedClients = user
    ? clients.filter(c => c.assigned_to === user.id)
    : []

  const completed = assignedClients.filter(c => c.status === 'completed')
  const inProgress = assignedClients.filter(c => c.status === 'in_progress')
  const notResponding = assignedClients.filter(c => c.status === 'unresponsive')
  const converted = assignedClients.filter(c => c.status === 'converted')
  const delivered = assignedClients.filter(c => c.status === 'delivered')
  const recentClients = assignedClients.slice(0, 5)

  if (loading || !user) {
    return <div className="text-white">Checking Session...</div>
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6 text-[#c29a4b]">📈 MetaMalistic CRM Dashboard</h1>
      <AnalyticsDashboard currentUser={user.id} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        {/* StatCards can go here */}
      </div>

      <h2 className="text-xl font-semibold text-white mb-4">🔔 Upcoming Follow-ups</h2>
      <UpcomingFollowUps />

      <h2 className="text-xl font-semibold text-white mb-4">🕐 Recently Added Clients</h2>
      <div className="space-y-4">
        {recentClients.map((client) => (
          <div key={client.id} className="bg-[#1f1f1f] rounded p-4 border border-[#2a2a2a]">
            <div className="font-semibold text-[#c29a4b]">{client.client_name}</div>
            <div className="text-sm text-gray-300">Status: {client.status}</div>
            <div className="text-sm text-gray-500">Service: {client.service}</div>
          </div>
        ))}
      </div>
      <ClientTable />
    </Layout>
  )
}


// @ts-ignore
function StatCard({ label, count, color, icon }: { label: string; count: number; color: string; icon: JSX.Element }) {
  return (
    <div className={`rounded-xl p-5 ${color} text-white shadow-lg flex items-center space-x-4`}>
      <div className="text-4xl">{icon}</div>
      <div>
        <div className="text-md uppercase">{label}</div>
        <div className="text-2xl font-bold">{count}</div>
      </div>
    </div>
  )
}

