'use client'

import { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import Layout from '../components/layout/Layout'
import ClientModal from '../components/clients/ClientModal'
import Link from 'next/link'
import toast from 'react-hot-toast'



type Client = {
  id: string
  client_name: string
  phone_numbers?: string[]
  email_addresses?: string[]
  work_email?: string
  status: string
  assignto: string
  created_at: string
  [key: string]: any // fallback to allow dynamic keys
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
  // const paginatedClients = clients.slice(
  //   (currentPage - 1) * clientsPerPage,
  //   currentPage * clientsPerPage
  // )

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
  const confirmed = window.confirm("Are you sure you want to delete this client and all related data?")
  if (!confirmed) return

  // 1. Delete status logs
  const { error: statusError } = await supabase
    .from('status_logs')
    .delete()
    .eq('client_id', id)

  if (statusError) {
    console.error("Failed to delete status logs:", statusError.message)
    toast.error("Could not delete status logs.")
    return
  }

  // 2. Delete client_service_sales
  const { error: serviceError } = await supabase
    .from('client_service_sales')
    .delete()
    .eq('client_id', id)

  if (serviceError) {
    console.error("Failed to delete client services:", serviceError.message)
    toast.error("Could not delete client services.")
    return
  }

  // 3. Delete the client
  const { error: clientError } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)

  if (clientError) {
    console.error("Failed to delete client:", clientError.message)
    toast.error("Could not delete client.")
  } else {
    toast.success("Client and all related data deleted.")
    fetchClients()
  }
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


// Search Filter Code

const [searchTerm, setSearchTerm] = useState('')
// const [statusFilter, setStatusFilter] = useState('') // optional status dropdown
// const [clients, setClients] = useState([]) // Supabase result


useEffect(() => {
  const fetchClients = async () => {
  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  // 👉 In the future, uncomment below to restrict clients per user
  // if (currentUser?.role !== 'admin') {
  //   query = query.eq('assigned_to', currentUser.id)
  // }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching clients:', error.message)
  } else {
    setClients(data)
  }
}


  fetchClients()
}, [])


const filteredClients = clients.filter((client) => {
  const search = searchTerm.toLowerCase()
  if (statusFilter !== 'all' && client.status !== statusFilter) return false

  return (
    client.client_name?.toLowerCase().includes(search) ||
    client.email_addresses?.some((email) => email.toLowerCase().includes(search)) ||
    client.phone_numbers?.some((phone) => phone.includes(search)) ||
    client.status?.toLowerCase().includes(search)
  )
})

// Then apply pagination
const paginatedClients = filteredClients.slice(
  (currentPage - 1) * clientsPerPage,
  currentPage * clientsPerPage
)
const formatUSPhone = (phone: string) => {
  const cleaned = ('' + phone).replace(/\D/g, '') // Remove all non-digits
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone // Return as-is if it doesn't match
}



return (
  
    <Layout>
    <div className="bg-[#1c1c1e] rounded-xl p-4 mt-6 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">All Clients</h2>

          <input
            type="text"
            placeholder="Search clients..."
            className="px-3 py-2 rounded-md text-sm w-72 border border-gray-300 focus:outline-none focus:ring focus:ring-yellow-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
              <th scope="col" className="px-4 py-3">S/N</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email Address</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClients.map((client, index) => (
              <tr key={client.id} className="hover:bg-[#2a2a2a] transition-all">
              <td className="px-4 py-2">
                {(currentPage - 1) * clientsPerPage + index + 1}
              </td>
              <td className="px-4 py-2">{client.client_name}</td>
              <td className="px-4 py-2">{client.phone_numbers?.[0]? formatUSPhone(client.phone_numbers[0]): '-'}</td>
              <td className="px-4 py-2">{client.email_addresses}</td>
              <td className="px-6 py-2">{getStatusBadge(client.status)}</td>
              <td className="px-4 py-2">{formatDate(client.created_at)}</td>
              <td className="px-4 py-2">
                <div className="flex gap-1">
                  <Link href={`/clients/${client.id}`}>
                    <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs cursor-pointer">View</button>
                  </Link>
                  <button
                      className="bg-red-600 text-white px-2 py-1 rounded text-xs cursor-pointer hover:bg-red-700"
                      onClick={() => handleDelete(client.id)}
                    >
                      Delete
                    </button>

                </div>
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
