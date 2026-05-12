import React from 'react'
import Layout from '../components/layout/Layout'
import { useEffect, useState } from 'react'
import supabase from 'lib/supabaseClient'
import ClientTable from '../components/clients/ClientTable'
import { useRouter } from 'next/router'
import type { Session } from '@supabase/supabase-js'
import UpcomingFollowUps from '@/lib/UpcomingFollowUps'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import { useAuth } from '@/context/AuthContext'
import { CLIENT_STATUSES, getClientStatusLabel } from '@/lib/clientStatus'

type DashboardPanel = 'analytics' | 'followups' | 'recent' | 'clients' | 'dropped'
const toDateInput = (date: Date) => date.toISOString().slice(0, 10)

export default function Dashboard() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [openPanel, setOpenPanel] = useState<DashboardPanel>('recent')
  const [salesTotal, setSalesTotal] = useState(0)
  const [salesPeriod, setSalesPeriod] = useState('current_month')
  const [salesStart, setSalesStart] = useState(toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [salesEnd, setSalesEnd] = useState(toDateInput(new Date()))
  const router = useRouter()
  const { user } = useAuth()

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

    checkSession()
  }, [router])

  useEffect(() => {
    if (!user) return

    const fetchClients = async () => {
      let visibleClientIds: string[] = []

      if (user.role !== 'admin') {
        const { data: assignments } = await supabase
          .from('client_assignments')
          .select('client_id')
          .eq('user_id', user.id)

        visibleClientIds = Array.from(new Set((assignments || []).map((item: any) => item.client_id).filter(Boolean)))
      }

      let query = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (user.role !== 'admin') {
        query = visibleClientIds.length > 0
          ? query.or(`assigned_to.eq.${user.id},id.in.(${visibleClientIds.join(',')})`)
          : query.eq('assigned_to', user.id)
      }

      const { data, error } = await query
      if (!error) setClients(data || [])
    }

    fetchClients()
  }, [user])

  useEffect(() => {
    if (!user) return

    const fetchSalesTotal = async () => {
      const now = new Date()
      const start =
        salesPeriod === 'last_quarter'
          ? toDateInput(new Date(now.getFullYear(), now.getMonth() - 3, 1))
          : salesPeriod === 'last_year'
            ? toDateInput(new Date(now.getFullYear() - 1, now.getMonth(), 1))
            : salesPeriod === 'custom'
              ? salesStart
              : toDateInput(new Date(now.getFullYear(), now.getMonth(), 1))
      const end =
        salesPeriod === 'custom'
          ? salesEnd
          : salesPeriod === 'all'
            ? ''
            : toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 1))

      let query = supabase
        .from('client_sales')
        .select('total_amount, seller_user_id, sale_date')

      if (salesPeriod !== 'all') {
        query = query.gte('sale_date', start)
        query = salesPeriod === 'custom' ? query.lte('sale_date', end) : query.lt('sale_date', end)
      }

      if (user.role !== 'admin') {
        query = query.eq('seller_user_id', user.id)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching dashboard sales total:', error)
        setSalesTotal(0)
        return
      }

      setSalesTotal((data || []).reduce((sum, sale: any) => sum + Number(sale.total_amount || 0), 0))
    }

    fetchSalesTotal()
  }, [salesEnd, salesPeriod, salesStart, user])

  const visibleClients = user ? clients : []

  const statusAliases: Record<string, string[]> = {
    interested: ['interested', 'in_progress'],
    unresponsive: ['unresponsive', 'not_responding'],
    delivered: ['delivered', 'completed'],
  }

  const isKnownStatus = (clientStatus?: string) =>
    CLIENT_STATUSES.some((status) => (statusAliases[status.value] || [status.value]).includes(clientStatus || ''))

  const statusCounts = CLIENT_STATUSES.map((status) => ({
    ...status,
    count: visibleClients.filter((client) => {
      const allowed = statusAliases[status.value] || [status.value]
      return allowed.includes(client.status || '')
    }).length,
  }))
  const uncategorizedCount = visibleClients.filter((client) => !isKnownStatus(client.status)).length
  const droppedClients = visibleClients.filter((client) => client.status === 'drop')

  const recentClients = [...visibleClients]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5)

  const pipelineCards = [
    { label: 'Total Leads', value: visibleClients.length },
    { label: 'Connected', value: statusCounts.find((item) => item.value === 'connected')?.count || 0 },
    { label: 'Interested', value: statusCounts.find((item) => item.value === 'interested')?.count || 0 },
    { label: 'Converted', value: statusCounts.find((item) => item.value === 'converted')?.count || 0 },
    { label: 'Total Sales', value: `$${salesTotal.toLocaleString()}` },
  ]

  if (loading || !user) {
    return <div className="text-white">Checking Session...</div>
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#c29a4b]">CRM Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            {user.role === 'admin' ? 'Team pipeline overview' : 'Your assigned lead pipeline'}
          </p>
        </div>
        <button
          className="w-fit rounded border border-[#c29a4b]/50 px-4 py-2 text-sm text-[#f0d28a] hover:bg-[#c29a4b]/10"
          onClick={() => router.push('/all-clients')}
        >
          Open All Clients
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {pipelineCards.map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-800 bg-[#161719] p-4">
            <div className="text-xs uppercase text-slate-500">{item.label}</div>
            <div className="mt-2 text-2xl font-bold text-white">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-2 rounded-lg border border-slate-800 bg-[#111214] p-3">
        <label className="text-sm text-slate-300">
          Sales period
          <select
            className="mt-1 block rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm text-white"
            value={salesPeriod}
            onChange={(event) => setSalesPeriod(event.target.value)}
          >
            <option value="current_month">Current month</option>
            <option value="last_quarter">Last quarter</option>
            <option value="last_year">Last year</option>
            <option value="custom">Custom</option>
            <option value="all">All dates</option>
          </select>
        </label>
        {salesPeriod === 'custom' && (
          <>
            <input className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm text-white" type="date" value={salesStart} onChange={(event) => setSalesStart(event.target.value)} />
            <input className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm text-white" type="date" value={salesEnd} onChange={(event) => setSalesEnd(event.target.value)} />
          </>
        )}
      </div>

      <div className="mb-6 rounded-lg border border-slate-800 bg-[#111214] p-3">
        <div className="flex flex-wrap gap-2">
          {statusCounts.map((status) => (
            <div key={status.value} className="rounded border border-slate-800 bg-[#18191b] px-3 py-2 text-sm">
              <span className="text-slate-400">{status.label}</span>
              <span className="ml-2 font-semibold text-white">{status.count}</span>
            </div>
          ))}
          {uncategorizedCount > 0 && (
            <div className="rounded border border-rose-800 bg-rose-950/40 px-3 py-2 text-sm">
              <span className="text-rose-200">Uncategorized</span>
              <span className="ml-2 font-semibold text-white">{uncategorizedCount}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { id: 'recent', label: 'Recent' },
          { id: 'followups', label: 'Follow-ups' },
          { id: 'clients', label: 'Client Table' },
          ...(user.role === 'admin' ? [{ id: 'dropped', label: `Dropped (${droppedClients.length})` }] : []),
          { id: 'analytics', label: 'Analytics' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`rounded border px-4 py-2 text-sm transition ${
              openPanel === tab.id
                ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                : 'border-slate-700 bg-[#101113] text-slate-300 hover:border-slate-500'
            }`}
            onClick={() => setOpenPanel(tab.id as DashboardPanel)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {openPanel === 'analytics' && <AnalyticsDashboard currentUser={user.id} />}

      {openPanel === 'followups' && (
        <section className="rounded-lg border border-slate-800 bg-[#161719] p-4">
          <h2 className="mb-4 text-xl font-semibold text-white">Upcoming Follow-ups</h2>
          <UpcomingFollowUps />
        </section>
      )}

      {openPanel === 'recent' && (
        <section className="rounded-lg border border-slate-800 bg-[#161719] p-4">
          <h2 className="mb-4 text-xl font-semibold text-white">Recently Added Clients</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentClients.map((client) => (
              <button
                key={client.id}
                className="rounded border border-[#2a2a2a] bg-[#1f1f1f] p-4 text-left hover:border-slate-600"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <div className="font-semibold text-[#c29a4b]">{client.client_name}</div>
                <div className="mt-2 text-sm text-gray-300">{getClientStatusLabel(client.status)}</div>
                <div className="text-xs text-gray-500">
                  {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'No date'}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {openPanel === 'clients' && <ClientTable />}

      {openPanel === 'dropped' && user.role === 'admin' && (
        <section className="rounded-lg border border-slate-800 bg-[#161719] p-4">
          <h2 className="mb-4 text-xl font-semibold text-white">Dropped Clients</h2>
          {droppedClients.length === 0 ? (
            <p className="text-sm text-slate-400">No dropped clients.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {droppedClients.map((client) => (
                <button
                  key={client.id}
                  className="rounded border border-rose-900/60 bg-[#1f1f1f] p-4 text-left hover:border-rose-600"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <div className="font-semibold text-[#c29a4b]">{client.client_name}</div>
                  <div className="mt-2 text-sm text-rose-300">{getClientStatusLabel(client.status)}</div>
                  <div className="text-xs text-gray-500">
                    {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'No date'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </Layout>
  )
}
