// pages/dashboard.tsx

import React from 'react'
import Layout from './components/Layout'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { UserGroupIcon, CheckCircleIcon, ClockIcon, XCircleIcon, ArrowTrendingUpIcon, InboxStackIcon } from '@heroicons/react/24/outline'



export default function Dashboard() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const currentUserId = 'hardcoded-user-id' // 🔐 Replace with real auth user ID

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase.from('clients').select('*')
      if (!error) setClients(data || [])
      setLoading(false)
    }

    fetchClients()
  }, [])

  const assignedClients = clients.filter(c => c.assigned_to === currentUserId)
  const completed = assignedClients.filter(c => c.status === 'completed')
  const inProgress = assignedClients.filter(c => c.status === 'in_progress')
  const notResponding = assignedClients.filter(c => c.status === 'unresponsive')
  const converted = assignedClients.filter(c => c.status === 'converted')
  const delivered = assignedClients.filter(c => c.status === 'delivered')
  const recentClients = assignedClients.slice(0, 5)

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6 text-[#c29a4b]">📈 MetaMalistic CRM Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10">
       
        <StatCard label="Assigned" count={assignedClients.length} color="bg-blue-500" icon={<UserGroupIcon className="h-8 w-8" />} />
        <StatCard label="Completed" count={completed.length} color="bg-green-500" icon={<CheckCircleIcon className="h-8 w-8" />} />
        <StatCard label="In Progress" count={inProgress.length} color="bg-yellow-500" icon={<ClockIcon className="h-8 w-8" />} />
        <StatCard label="Not Responding" count={notResponding.length} color="bg-red-500" icon={<XCircleIcon className="h-8 w-8" />} />
        <StatCard label="Converted" count={converted.length} color="bg-purple-500" icon={<ArrowTrendingUpIcon className="h-8 w-8" />} />
        <StatCard label="Delivered" count={delivered.length} color="bg-emerald-500" icon={<InboxStackIcon className="h-8 w-8" />} />

      </div>

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
    </Layout>
  )
}

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

