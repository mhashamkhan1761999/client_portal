'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabaseClient'
import ClientModal from '../clients/ClientModal'





export default function ClientTable() {
  const [clients, setClients] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const router = useRouter()
  
  

  type FollowUp = {
    id: string
    reminder_date: string
    note?: string
    is_completed: boolean
  }

  type ClientWithFollowUps = {
    id: string
    client_name: string
    phone_numbers?: string[]
    email_addresses?: string[]
    status?: string
    follow_ups?: FollowUp[]
  }



  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        follow_ups (
          id,
          reminder_date,
          note,
          is_completed
        )
      `)
      .order('created_at', { ascending: false }).limit(10)

    if (error) {
      console.error('Error fetching clients:', error)
      return
    }

    setClients(data as ClientWithFollowUps[])
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleClientSaved = () => {
    fetchClients()
    setShowModal(false)
  }

  return (
    <div className="mt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#c29a4b]">Recent Clients</h1>
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

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-[#2a2a2a]">
        <table className="min-w-full text-sm bg-[#1c1c1e]">
          <thead className="bg-[#2a2a2a] text-gray-300">
            <tr>
              <th className="p-3 text-left">Client</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Follow-Up Status</th>
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
                <td className="p-3 capitalize">{client.status || 'N/A'}</td>
                <td className="p-3 relative group">
                    {(() => {
                      const pending = client.follow_ups?.find((f: { is_completed: boolean; reminder_date: string }) => !f.is_completed)
                      if (!pending) return "No Pending Follow-Up"
                      return `Pending (${new Date(pending.reminder_date).toLocaleString()})`
                    })()}

                    {/* Tooltip appears below the cell */}
                    {client.follow_ups && client.follow_ups.length > 0 && (
                      <div className="absolute top-full left-0 mt-2 w-64 p-2 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {client.follow_ups
                          .filter((f: { is_completed: boolean; reminder_date: string }) => !f.is_completed)
                          .map((f: FollowUp) => (
                            <div key={f.id} className="mb-2 last:mb-0">
                              <p><strong>Note:</strong> {f.note || 'No note'}</p>
                              <p><strong>Reminder:</strong> {new Date(f.reminder_date).toLocaleString()}</p>
                            </div>
                          ))}
                      </div>
                    )}
                </td>
                {/* <td className="p-3">
                  {client.follow_ups && client.follow_ups.length > 0 ? (
                    client.follow_ups.some((f: { is_completed: boolean; reminder_date: string }) => !f.is_completed)
                      ? `Pending (Reminder: ${new Date(
                          (client.follow_ups.find((f: { is_completed: boolean }) => !f.is_completed) as { reminder_date: string }).reminder_date
                        ).toLocaleString()})`
                      : "Completed"
                  ) : "No Follow-Up"}
                </td> */}
                <td className="p-3 flex gap-2">
                  {/* View Button */}
                  <button
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="text-sm text-green-400 hover:underline"
                  >
                    👁 View
                  </button>

                  {/* Edit Button */}
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
