'use client'

import { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import Layout from './components/Layout'
import ClientModal from '../components/ClientModal'

type Client = {
  id: string
  client_name: string
  work_email: string
  status: string
  created_at: string
  project_manager?: string
   phone_numbers?: string[]
  
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

export default function ClientTable() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [sortOption, setSortOption] = useState('created_desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all') // now handled locally
  const [editingClient, setEditingClient] = useState<any | null>(null)
  const [showModal, setShowModal] = useState(false)

  const clientsPerPage = 20
  const paginatedClients = clients.slice(
    (currentPage - 1) * clientsPerPage,
    currentPage * clientsPerPage
  )

  const getSortColumn = () => {
    switch (sortOption) {
      case 'name_asc':
      case 'name_desc':
        return 'client_name'
      case 'created_asc':
      case 'created_desc':
      default:
        return 'created_at'
    }
  }



  const isAscending = () => !sortOption.includes('_desc')

  const fetchClients = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order(getSortColumn(), { ascending: isAscending() })

    if (error) {
      console.error('Error fetching clients:', error)
      setLoading(false)
      return
    }

    const uniqueClients = Array.from(
      new Map(data.map(client => [client.id, client])).values()
    )

    const filtered =
      statusFilter === 'all'
        ? uniqueClients
        : uniqueClients.filter(client => client.status === statusFilter)

    setClients(filtered)
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [statusFilter, sortOption])



const handleEdit = (client: any) => {
  setEditingClient(client)
  setShowModal(true)
}

const handleDelete = async (id: string) => {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (!error) fetchClients()
}


const getStatusBadge = (status: string) => {
  const statusConfig: Record<
    string,
    { label: string; icon: React.ReactNode; style: string }
  > = {
    new: {
      label: 'New',
      icon: <span className="mr-1">🆕</span>,
      style: 'bg-blue-600 text-blue-100',
    },
    in_progress: {
      label: 'In Progress',
      icon: <span className="mr-1">📦</span>,
      style: 'bg-yellow-500 text-yellow-900',
    },
    completed: {
      label: 'Completed',
      icon: <span className="mr-1">✅</span>,
      style: 'bg-green-600 text-green-100',
    },
    upsell: {
      label: 'Upsell',
      icon: <span className="mr-1">📈</span>,
      style: 'bg-purple-600 text-purple-100',
    },
    followup: {
      label: 'Follow Up',
      icon: <span className="mr-1">🔁</span>,
      style: 'bg-pink-600 text-pink-100',
    },
  }

  const { label, icon, style } = statusConfig[status] || {
    label: status,
    icon: <span className="mr-1">❓</span>,
    style: 'bg-gray-600 text-gray-100',
  }

  return (
    <span className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full ${style}`}>
      {icon}
      {label}
    </span>
  )
}






return (
  
  <Layout>
<div className="bg-[#1c1c1e] rounded-xl p-4 mt-6 shadow-md">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-semibold text-white">All Clients</h2>
  </div>

  {/* Filters and Sort */}
  <div className="flex flex-wrap justify-between mb-4">
    <div className="flex flex-wrap gap-2">
      {['all', 'new', 'in_progress', 'completed', 'upsell', 'followup'].map((status) => (
        <button
          key={status}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 border
            ${statusFilter === status
              ? 'bg-[#c29a4b] text-black border-[#c29a4b] shadow-md'
              : 'bg-[#2a2a2a] text-white border-transparent hover:border-[#444] hover:bg-[#333]'}`
          }
          onClick={() => setStatusFilter(status)}
        >
          {status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </button>
      ))}
    </div>

    <select
      value={sortOption}
      onChange={(e) => setSortOption(e.target.value)}
      className="bg-[#2a2a2a] text-white px-3 py-1 rounded border border-gray-600"
    >
      <option value="created_desc">Newest First</option>
      <option value="created_asc">Oldest First</option>
      <option value="name_asc">Name A-Z</option>
      <option value="name_desc">Name Z-A</option>
    </select>
  </div>

  {/* Table */}
  {loading ? (
    <p className="text-gray-400">Loading...</p>
  ) : (
    <table className="w-full text-sm text-left text-gray-300">
      <thead className="text-xs text-gray-400 uppercase border-b border-gray-700">
        <tr>
          <th scope="col" className="px-4 py-3">S/N</th> {/* New Serial Number Column */}
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Phone</th>
          <th className="px-4 py-3">Work Email</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Created At</th>
          <th className="px-4 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {paginatedClients.map((client, index) => (
          <tr key={client.id} className="hover:bg-[#2a2a2a] transition-all">
            <td className="px-4 py-2">{(currentPage - 1) * clientsPerPage + index + 1}</td> {/* Serial Number */}
    
            <td className="px-4 py-2">{client.client_name}</td>
            <td className="px-4 py-2">{client.phone_numbers?.[0] || '-'}</td>
            <td className="px-4 py-2">{client.work_email}</td>
            <td className="px-6 py-2">{getStatusBadge(client.status)}</td>
            <td className="px-4 py-2">{formatDate(client.created_at)}</td>
            <td className="px-4 py-2 flex gap-1">
              <button
                className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                onClick={() => console.log('View', client.id)} // Replace later
              >
                View
              </button>
              <button
                className="bg-yellow-500 text-black px-2 py-1 rounded text-xs"
                onClick={() => handleEdit(client)}
              >
                Edit
              </button>
              <button
                className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                onClick={() => handleDelete(client.id)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}

  {/* Pagination */}
  <div className="flex justify-end mt-4 space-x-2">
    {Array.from({ length: Math.ceil(clients.length / clientsPerPage) }).map((_, index) => (
      <button
        key={index}
        onClick={() => setCurrentPage(index + 1)}
        className={`px-3 py-1 rounded ${
          currentPage === index + 1 ? 'bg-[#c29a4b] text-black' : 'bg-[#2a2a2a] text-white'
        }`}
      >
        {index + 1}
      </button>
    ))}
  </div>

  {/* Modal */}
  {showModal && (
    <ClientModal
      open={showModal}
      onClose={() => setShowModal(false)}
      onSaved={fetchClients}
      clientData={editingClient}
      currentUser={undefined}
    />
  )}
</div>
</Layout>

  
)
}
