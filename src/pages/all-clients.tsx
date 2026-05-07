'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Layout from '@/components/layout/Layout'
import supabase from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { CLIENT_STATUSES, getClientStatusLabel } from '@/lib/clientStatus'

type Client = {
  id: string
  client_name: string
  phone_numbers?: string[]
  email_addresses?: string[]
  status?: string
  assigned_to?: string
  created_at: string
  users?: {
    name?: string
    sudo_name?: string
  } | null
}

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString()

const formatUSPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone
}

const statusClass: Record<string, string> = {
  connected: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  converted: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  delivered: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  completed: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  interested: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  in_progress: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  not_responding: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  unresponsive: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  drop: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  not_interested: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  followup: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
}

const getStatusBadge = (status?: string) => (
  <span className={`inline-flex rounded border px-2.5 py-1 text-xs font-medium ${statusClass[status || ''] || 'bg-slate-500/10 text-slate-300 border-slate-500/30'}`}>
    {getClientStatusLabel(status)}
  </span>
)

const statusAliases: Record<string, string[]> = {
  interested: ['interested', 'in_progress'],
  unresponsive: ['unresponsive', 'not_responding'],
  delivered: ['delivered', 'completed'],
}

const matchesStatusFilter = (clientStatus: string | undefined, filter: string) => {
  if (filter === 'all') return true
  const allowed = statusAliases[filter] || [filter]
  return allowed.includes(clientStatus || '')
}

const getSellerName = (client: Client) =>
  client.users?.sudo_name || client.users?.name || (client.assigned_to ? 'Unknown' : '-')

export default function AllClientsPage() {
  const { user, loading: authLoading } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [sortOption, setSortOption] = useState('created_desc')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const clientsPerPage = 20

  useEffect(() => {
    if (!user) return
    fetchClients()
  }, [user, sortOption])

  const getSortColumn = () => {
    if (sortOption === 'name_asc' || sortOption === 'name_desc') return 'client_name'
    return 'created_at'
  }

  const fetchClients = async () => {
    if (!user) return
    setLoading(true)

    let visibleClientIds: string[] = []
    if (user.role !== 'admin') {
      const { data: assignments, error: assignmentError } = await supabase
        .from('client_assignments')
        .select('client_id')
        .eq('user_id', user.id)

      if (assignmentError) {
        console.error('Error fetching assignments:', assignmentError.message)
      }

      visibleClientIds = Array.from(new Set((assignments || []).map((item: any) => item.client_id).filter(Boolean)))
    }

    let query = supabase
      .from('clients')
      .select('*, users:assigned_to(name, sudo_name)')
      .order(getSortColumn(), { ascending: !sortOption.includes('_desc') })

    if (user.role !== 'admin') {
      query = visibleClientIds.length > 0
        ? query.or(`assigned_to.eq.${user.id},id.in.(${visibleClientIds.join(',')})`)
        : query.eq('assigned_to', user.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching clients:', error.message)
      toast.error('Could not load clients.')
      setLoading(false)
      return
    }

    setClients(data || [])
    setLoading(false)
  }

  const filteredClients = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return clients.filter((client) => {
      if (!matchesStatusFilter(client.status, statusFilter)) return false
      const sellerName = getSellerName(client).toLowerCase()
      return (
        client.client_name?.toLowerCase().includes(search) ||
        client.email_addresses?.some((email) => email.toLowerCase().includes(search)) ||
        client.phone_numbers?.some((phone) => phone.includes(search)) ||
        client.status?.toLowerCase().includes(search) ||
        sellerName.includes(search)
      )
    })
  }, [clients, searchTerm, statusFilter])

  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * clientsPerPage,
    currentPage * clientsPerPage
  )

  if (authLoading || !user) {
    return <Layout><div className="p-6 text-white">Loading clients...</div></Layout>
  }

  return (
    <Layout>
      <div className="mt-6 rounded-lg border border-slate-800 bg-[#161719] p-4 shadow">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">All Clients</h2>
          <input
            type="text"
            placeholder="Search clients..."
            className="w-72 rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
            value={searchTerm}
            onChange={(e) => {
              setCurrentPage(1)
              setSearchTerm(e.target.value)
            }}
          />
        </div>

        <div className="mb-4 flex flex-wrap justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {['all', ...CLIENT_STATUSES.map((status) => status.value)].map((status) => (
              <button
                key={status}
                className={`rounded border px-3 py-1.5 text-sm transition ${
                  statusFilter === status
                    ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                    : 'border-slate-700 bg-[#101113] text-slate-300 hover:border-slate-500'
                }`}
                onClick={() => {
                  setCurrentPage(1)
                  setStatusFilter(status)
                }}
              >
                {status === 'all' ? 'All' : getClientStatusLabel(status)}
              </button>
            ))}
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="rounded border border-slate-700 bg-[#101113] px-3 py-1 text-white"
          >
            <option value="created_desc">Newest First</option>
            <option value="created_asc">Oldest First</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
          </select>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">S/N</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created At</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((client, index) => (
                  <tr key={client.id} className="border-b border-slate-900 hover:bg-[#202124]">
                    <td className="px-4 py-3">{(currentPage - 1) * clientsPerPage + index + 1}</td>
                    <td className="px-4 py-3 font-medium text-white">{client.client_name}</td>
                    <td className="px-4 py-3">{client.phone_numbers?.[0] ? formatUSPhone(client.phone_numbers[0]) : '-'}</td>
                    <td className="px-4 py-3">{client.email_addresses?.join(', ') || '-'}</td>
                    <td className="px-4 py-3 font-medium text-slate-200">{getSellerName(client)}</td>
                    <td className="px-4 py-3">{getStatusBadge(client.status)}</td>
                    <td className="px-4 py-3">{formatDate(client.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${client.id}`} className="rounded bg-sky-600 px-3 py-1 text-xs text-white hover:bg-sky-500">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          {Array.from({ length: Math.max(1, Math.ceil(filteredClients.length / clientsPerPage)) }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index + 1)}
              className={`rounded px-3 py-1 ${currentPage === index + 1 ? 'bg-sky-600 text-white' : 'bg-[#101113] text-slate-300'}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </Layout>
  )
}
