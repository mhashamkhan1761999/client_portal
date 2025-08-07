// pages/dashboard.tsx

import React from 'react'
import Layout from '../components/layout/Layout'
import { useEffect, useState } from 'react'
import supabase from 'lib/supabaseClient'
import { UserGroupIcon, CheckCircleIcon, ClockIcon, XCircleIcon, ArrowTrendingUpIcon, InboxStackIcon } from '@heroicons/react/24/outline'
import ClientTable from '../components/clients/ClientTable'
import { useRouter } from 'next/router'
import type { Session } from '@supabase/supabase-js'
import dayjs from 'dayjs'







export default function Dashboard() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const router = useRouter()
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<any[]>([])

  const currentUserId = 'hardcoded-user-id' // 🔐 Replace with real auth user ID

  useEffect(() => {

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login')
      else setSession(data.session)
      setLoading(false)
    })
    
    const fetchSession = async () => {
    const { data, error } = await supabase.auth.getSession()
      if (data?.session) {
        setSession(data.session)
      } else {
        setSession(null)
      }
    }

    const fetchUpcomingFollowUps = async () => {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('id, reminder_date, note, is_completed, clients(client_name)')
        .gt('reminder_date', new Date().toISOString())
        .order('reminder_date', { ascending: true })
        .limit(10)

      if (!error) setUpcomingFollowUps(data || [])
    }



    const fetchClients = async () => {
      const { data, error } = await supabase.from('clients').select('*')
      if (!error) setClients(data || [])
      setLoading(false)
    }

    fetchUpcomingFollowUps()
    fetchSession()
    fetchClients()
  }, [])

  const assignedClients = clients.filter(c => c.assigned_to === currentUserId)
  const completed = assignedClients.filter(c => c.status === 'completed')
  const inProgress = assignedClients.filter(c => c.status === 'in_progress')
  const notResponding = assignedClients.filter(c => c.status === 'unresponsive')
  const converted = assignedClients.filter(c => c.status === 'converted')
  const delivered = assignedClients.filter(c => c.status === 'delivered')
  const recentClients = assignedClients.slice(0, 5)

  if(loading) return <div className="text-white">Checking Session...</div>

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

      <h2 className="text-xl font-semibold text-white mb-4">🔔 Upcoming Follow-ups</h2>
        <div className="space-y-4 mb-10">
          {upcomingFollowUps.length === 0 ? (
            <div className="text-sm text-gray-400">No follow-ups scheduled.</div>
          ) : (
            upcomingFollowUps.map((item) => (
              <div
                key={item.id}
                className="bg-[#1f1f1f] border border-[#333] p-4 rounded-lg shadow-sm space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-gray-400 uppercase">Client</div>
                    <div className="text-[#c29a4b] font-semibold">{item.clients?.client_name || 'Unknown Client'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase text-right">Reminder Date</div>
                    <div className="text-white text-sm">{dayjs(item.reminder_date).format('MMM D, YYYY [at] h:mm A')}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 uppercase mb-1">Note</div>
                  <div className="text-sm text-gray-300 italic">{item.note || '-'}</div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full">✅ Done</button>
                  <button className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full">❌ Cancel</button>
                  <button className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-full">🔁 Reschedule</button>
                </div>
              </div>
            ))
          )}
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

