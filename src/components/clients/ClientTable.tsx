'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import ClientModal from '../clients/ClientModal'

export default function ClientTable() {
  const [clients, setClients] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    if (data) setClients(data)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  // Called after modal successfully saves data
  const handleClientSaved = () => {
    fetchClients()       // Refresh data
    setShowModal(false)  // Close modal
  }

  return (
    <div className="mt-10">
      {/* Header and "Add Client" button */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#c29a4b]">Clients</h1>
        <button
          className="bg-[#c29a4b] text-black px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
          onClick={() => {
            setEditingClient(null)
            setShowModal(true)
          }}
        >
          ➕ Add Client
        </button>
      </div>

      {/* Clients Table */}
      <div className="overflow-auto rounded-xl border border-[#2a2a2a]">
        <table className="min-w-full text-sm bg-[#1c1c1e]">
          <thead className="bg-[#2a2a2a] text-gray-300">
            <tr>
              <th className="p-3 text-left">Client</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Follow-Up</th>
              <th className="p-3 text-left">Converted</th>
              <th className="p-3 text-left">Delivered</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr
                key={client.id}
                className="border-t border-[#333] hover:bg-[#292929]"
              >
                <td className="p-3">{client.client_name}</td>
                <td className="p-3">{client.phone_numbers?.[0] || 'N/A'}</td>
                <td className="p-3">{client.email_addresses?.[0] || 'N/A'}</td>
                <td className="p-3 capitalize">{client.status}</td>
                <td className="p-3 text-center">
                  {client.followup_completed ? '✅' : '❌'}
                </td>
                <td className="p-3 text-center">
                  {client.converted ? '✅' : '❌'}
                </td>
                <td className="p-3 text-center">
                  {client.delivered ? '✅' : '❌'}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => {
                      setEditingClient(client)
                      setShowModal(true)
                    }}
                    className="text-sm text-blue-400 hover:underline"
                  >
                    ✏️ Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Client Modal */}
      {showModal && (
        <ClientModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSaved={handleClientSaved}
          clientData={editingClient}
          currentUser={undefined}
        />
      )}
    </div>
    </div>
  )
}
