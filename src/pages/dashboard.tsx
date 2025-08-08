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


type FollowUp = {
  id: string
  reminder_date: string
  note: string
  is_completed: boolean
  user_id: string
  clients?: { client_name: string }[] | null
  users?: { name: string }[] | null
}


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
  const { data: followUps, error } = await supabase
    .from("follow_ups")
    .select(`
      id,
      reminder_date,
      note,
      is_completed,
      user_id,
      clients (client_name),
      users:user_id (name)
    `)
    .gt("reminder_date", new Date().toISOString())
    .order("reminder_date", { ascending: true })
    .limit(5)

  if (!error && followUps) {
    const mergedData = followUps.map(fu => ({
      ...fu,
      added_by: fu.users?.[0]?.name || 'Unknown' // ✅ Fix here
    }));

    
    setUpcomingFollowUps(mergedData)
    console.log(followUps)
  }
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
          <div className="text-sm text-gray-400 text-center">No follow-ups scheduled.</div>
        ) : (
          upcomingFollowUps.map((item) => (
            <div
              key={item.id}
              className="bg-[#1f1f1f]/60 border border-[#333] backdrop-blur-sm p-5 rounded-xl shadow-md hover:shadow-lg hover:border-[#c29a4b]/60 transition-all duration-300"
            >
              {/* Top Row */}
              <div className="flex justify-between items-start mb-3">
                {/* Client Info */}
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#c29a4b]/10 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-[#c29a4b]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 15c2.21 0 4.304.535 6.121 1.481M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase">Client</div>
                    <div className="text-[#c29a4b] font-semibold text-lg">{item.clients?.client_name || 'Unknown Client'}</div>
                  </div>
                </div>

                {/* Reminder Date */}
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#c29a4b]/10 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-[#c29a4b]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10m-7 4h4m-9 5h14a2 2 0 002-2V7a2 2 0 00-2-2h-2V3H8v2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase">Reminder Date</div>
                    <div className="text-white text-sm">{dayjs(item.reminder_date).format('MMM D, YYYY [at] h:mm A')}</div>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="mt-2">
                <div className="text-xs text-gray-400 uppercase mb-1 flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16h6m-3-14a9 9 0 100 18 9 9 0 000-18z" />
                  </svg>
                  Note
                </div>
                <div className="text-sm text-gray-300 italic">{item.note || '-'}</div>
              </div>

              {/* Added By */}
              {item.added_by && (
                <div className="mt-3 text-xs text-gray-500">
                  Added by: <span className="text-gray-300">{item.added_by}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#333] mt-4">
                <button
                  className="p-2 rounded-full bg-green-600/20 hover:bg-green-600/40 text-green-400 transition"
                  title="Mark as Done"
                >
                  ✅
                </button>
                <button
                  className="p-2 rounded-full bg-red-600/20 hover:bg-red-600/40 text-red-400 transition"
                  title="Cancel"
                >
                  ❌
                </button>
                <button
                  className="p-2 rounded-full bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 transition"
                  title="Reschedule"
                >
                  🔁
                </button>
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

