import { useRouter } from 'next/router'
import React, { useState, useEffect, ReactNode } from 'react'
import supabase from '../../lib/supabaseClient'
import {Client}  from '../../types/client'
import Layout from '../../components/layout/Layout'
import ClientNotes from '@/components/clients/ClientNotes'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ClientModal from '@/components/clients/ClientModal'
import ServiceModal from '@/components/shared/DetailModal' // Adjust the import path as needed
import AddServiceModal from '../../components/clients/AddServiceModal'
import FollowUpForm from '@/components/FollowUpForm'
import dayjs from 'dayjs'
import { getClientStatusLabel } from '@/lib/clientStatus'




export default function SingleClientPage() {
  const router = useRouter()
  const { clientId } = router.query
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [clientServices, setClientServices] = useState<any[]>([])
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [selectedService, setSelectedService] = useState<any | null>(null)
  const [openAddModal, setOpenAddModal] = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [number, setNumber] = useState<any[]>([])
  const [followUps, setFollowUps] = useState<ClientFollowUp[]>([])  
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([])

  const bgColors = [
    'bg-red-600',
    'bg-blue-600',
    'bg-green-600',
    'bg-purple-600',
    'bg-yellow-600',
    'bg-pink-600',
    'bg-indigo-600',
    'bg-emerald-600',
  ]

  type ClientFollowUp = {
    id: string
    reminder_date: string
    note?: string
    is_completed: boolean
  }

  type TransferLog = {
    id: string
    created_at: string
    previous_status?: string | null
    new_status?: string | null
    changed_by?: string | null
    affected_user?: string | null
    action_type?: string | null
    note?: string | null
    changed_by_name?: string
    affected_user_name?: string
  }

  const getPlatformLabel = (id: string | undefined) => {
    const platform = number.find((n) => n.id === id)
    return platform ? `${platform.platform} (${platform.phone_number})` : 'Not Set'
  }

  const fetchClientWithDetails = async () => {
    if (!clientId || typeof clientId !== 'string') return
    setLoading(true)

    // 1. Fetch client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !clientData) {
      toast.error('Failed to fetch client.')
      
      setLoading(false)
      return
    }

    // 2. Fetch connecting platforms (numbers)
    const { data: numberData, error: numberError } = await supabase
      .from('client_contact_channels')
      .select('id, platform, phone_number, assigned_to')

    setNumber(numberData || [])


    const { data: followUpsData } = await supabase
      .from('follow_ups')
      .select('id, reminder_date, note, is_completed')
      .eq('client_id', clientId)

    // 3. Fetch related services
    const { data: servicesData, error: servicesError } = await supabase.from('services').select('*')
    setServices(servicesData || [])

    // 4. Fetch extra info
    let platformName: string | null = null
    let sudoName: string | null = null
    let leadAgentName: string | null = null

    if (clientData.connecting_platform) {
      const { data: platformData } = await supabase
        .from('client_contact_channels')
        .select('platform')
        .eq('id', clientData.connecting_platform)
        .single()
      platformName = platformData?.platform || null
    }

    if (clientData.lead_gen_id) {
      const { data: leadGen } = await supabase
        .from('lead_gens')
        .select('name')
        .eq('id', clientData.lead_gen_id)
        .single()
      leadAgentName = leadGen?.name || null
    }

    if (clientData.assigned_to) {
      const { data: userData } = await supabase
        .from('users')
        .select('sudo_name')
        .eq('id', clientData.assigned_to)
        .single()
      sudoName = userData?.sudo_name || null
    }

    // 5. Update client state with extra data
    setClient({
      ...clientData,
      platform_name: platformName,
      sudo_name: sudoName,
      lead_gen_name: leadAgentName,
    })

    // 6. Client's purchased services (if any)
    let serviceDetails: any[] = []

    if (clientId) {
      const { data: salesData, error: salesError } = await supabase
        .from('client_service_sales')
        .select('id, package_name, price, sold_price, description, service_id')
        .eq('client_id', clientId)

      if (salesError) {
        console.error('Error fetching client_service_sales:', salesError)
      } else {
        serviceDetails = salesData || []
      }
    }


    setClientServices(serviceDetails)
    await fetchTransferLogs(clientId)
    setLoading(false)
  }

  const fetchTransferLogs = async (id: string) => {
    const { data: logs, error } = await supabase
      .from('status_logs')
      .select('id, created_at, previous_status, new_status, changed_by, affected_user, action_type, note')
      .eq('client_id', id)
      .in('action_type', ['client_transferred', 'status_changed', 'service_assigned'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transfer history:', error.message)
      setTransferLogs([])
      return
    }

    const userIds = Array.from(
      new Set(
        (logs || [])
          .flatMap((log: TransferLog) => [log.changed_by, log.affected_user])
          .filter(Boolean)
      )
    ) as string[]

    let userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, sudo_name')
        .in('id', userIds)

      userMap = Object.fromEntries(
        (usersData || []).map((user: any) => [user.id, user.sudo_name || user.name || user.id])
      )
    }

    setTransferLogs(
      (logs || []).map((log: TransferLog) => ({
        ...log,
        changed_by_name: log.changed_by ? userMap[log.changed_by] || log.changed_by : '-',
        affected_user_name: log.affected_user ? userMap[log.affected_user] || log.affected_user : '-',
      }))
    )
  }

  const fetchFollowUps = async () => {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('id, reminder_date, note, is_completed')
      .eq('client_id', clientId)

    if (error) {
      console.error('Error fetching follow-ups:', error.message)
    } else {
      setFollowUps(data as ClientFollowUp[])
    }
  }

  useEffect(() => {
    if (!router.isReady || !clientId || typeof clientId !== 'string') return
    fetchClientWithDetails()
    if (clientId) fetchFollowUps()

  }, [router.isReady, clientId])


  if (!router.isReady || loading) {
  return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#1A1A1D]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-t-4 border-yellow-400 animate-spin"></div>
        </div>
        <p className="mt-4 text-sm text-yellow-300">Loading client info, please wait...</p>
      </div>
    )
  }

  if (!client) {
    return <div className="text-red-500 p-8">Client not found.</div>
  }

  if (!clientId || typeof clientId !== 'string') return <div className="text-red-500 p-8">Invalid client ID.</div>

  
  return (
    
    <Layout>
      <div className="bg-[#1c1c1e] text-white p-6 rounded-xl mt-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{client.client_name}</h1>
            <div className="mt-2 flex gap-2 flex-wrap">
              <span className="bg-blue-700 text-white px-3 py-1 text-xs rounded-full capitalize">
                {getClientStatusLabel(client.status)}
              </span>
              {client.platform && (
                <span className="bg-gray-700 px-3 py-1 text-xs rounded-full">
                  {client.platform}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
              <Link href="/all-clients">
                <button className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded">
                  ← Back to Clients
                </button>
              </Link>

              
              <button onClick={() => setOpenAddModal(true)} className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded">
                ➕ Add Service
              </button>
              
            
              <button
                className="bg-yellow-500 hover:bg-yellow-400 text-black text-sm px-4 py-2 rounded"
                onClick={() => setShowEditModal(true)}
              >
                Edit Client Info
              </button>
             
            </div>  
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Client Info Section (2 columns) */}
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-[#2a2a2a] p-4 rounded-lg">
              <InfoItem label="Phone" value={client.phone_numbers?.[0]} />
              <InfoItem label="Email Address" value={client.email_addresses} />
              <InfoItem label="Work Email" value={client.work_email} />
              <InfoItem
                label="Profile URL"
                value={
                  client.profile_url ? (() => {
                    try {
                      const url = new URL(
                        client.profile_url.startsWith('http')
                          ? client.profile_url
                          : `https://${client.profile_url}`
                      )
                      const domain = url.hostname.replace('www.', '')
                      return (
                        <a
                          href={url.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 underline hover:text-blue-300"
                        >
                          {domain}
                        </a>
                      )
                    } catch {
                      return client.profile_url
                    }
                  })() : '-'
                }
              />

              <InfoItem
                label="Website URL"
                value={
                  client.website_url ? (() => {
                    try {
                      const url = new URL(
                        client.website_url.startsWith('http')
                          ? client.website_url
                          : `https://${client.website_url}`
                      )
                      const domain = url.hostname.replace('www.', '')
                      return (
                        <a
                          href={url.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 underline hover:text-blue-300"
                        >
                          {domain}
                        </a>
                      )
                    } catch {
                      return client.website_url
                    }
                  })() : '-'
                }
              />
              <InfoItem label="Connecting Platform" value={getPlatformLabel(client.connecting_platform)}/>
              <InfoItem
                  label="Business Name"
                  value={
                    client.business_name ? (
                      <span className="font-semibold text-white">{client.business_name}</span>
                    ) : (
                      '-'
                    )
                  }
                />
                <InfoItem
                  label="Secondary Phone Numbers"
                  value={
                    Array.isArray(client.secondary_phones) && client.secondary_phones.length > 0
                      ? client.secondary_phones.join(', ')
                      : '-'
                  }
                />


              <InfoItem label="Assigned To" value={client?.sudo_name || '-'} />
              <InfoItem label="Gender" value={client.gender} />
              <InfoItem label="Lead Gen Agent" value={client.lead_gen_name || '-'} />
              <InfoItem label="Created At" value={new Date(client.created_at).toLocaleString()} />
            </div>
          </div>

         
          {/* Services Section with Smooth Scroll */}
          <div className="max-h-[350px] overflow-y-auto pr-2 scroll-smooth scrollbar-custom">

            <div className="grid grid-cols-1 gap-4">
              {clientServices.length === 0 ? (
                <div className="text-gray-400 text-sm">No services added yet.</div>
              ) : (
                clientServices.map((service, index) => {
                  const randomColor = bgColors[index % bgColors.length]
                  return (
                    <div
                      key={service.id}
                      className={`p-4 rounded-lg text-white shadow-md ${randomColor}`}
                    >
                      <h3 className="text-lg font-bold">{service.package_name}</h3>
                      <p>
                        {service.description && service.description.length > 100
                          ? service.description.substring(0, 100) + "..."
                          : service.description || 'No description available'}
                      </p>
                      <p className="text-md font-semibold mt-2">${service.sold_price}</p>
                      <button
                        className="mt-4 bg-black bg-opacity-30 hover:bg-opacity-50 px-3 py-1 rounded text-xs"
                        onClick={() => {
                          setSelectedService(service)
                          setShowServiceModal(true)
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#2a2a2a] p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-[#c29a4b]">Transfer / Status History</h3>
          {transferLogs.length === 0 ? (
            <p className="text-sm text-gray-400">No transfer or status history yet.</p>
          ) : (
            <div className="space-y-3">
              {transferLogs.map((log) => (
                <div key={log.id} className="border border-gray-700 rounded p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium capitalize">
                      {(log.action_type || 'status_changed').replace('_', ' ')}
                    </span>
                    <span className="text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 text-gray-300">
                    <span>{getClientStatusLabel(log.previous_status || '')}</span>
                    <span className="mx-2">→</span>
                    <span>{getClientStatusLabel(log.new_status || '')}</span>
                  </div>
                  <div className="mt-1 text-gray-400">
                    Changed by {log.changed_by_name || '-'}; transferred/assigned to {log.affected_user_name || '-'}
                  </div>
                  {log.note && <div className="mt-1 text-gray-300">{log.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

      <div className="flex gap-4 mt-6">
        {/* Follow-up Reminders */}
        <div className="w-1/2 bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">🔔 Follow-up Reminders</h3>
          <div className="mt-4">
            <FollowUpForm clientId={clientId} onSaved={fetchFollowUps} />
          </div>
        </div>

        {/* Notes / Assets Section */}
        <div className="w-1/2 bg-white dark:bg-gray-800 p-4 rounded shadow">
          <ClientNotes clientId={client.id} currentUser="system_admin" />
        </div>
      </div>



      </div>

      <ClientModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false)
            fetchClientWithDetails()
          }}
          clientData={client}
          currentUser="system_admin"
          isServiceEditable={false}
        />

        <ServiceModal
            service={selectedService}
            open={showServiceModal}
            onClose={() => setShowServiceModal(false)}
          />

        <AddServiceModal
        isOpen={openAddModal}
        onClose={() => setOpenAddModal(false)}
        clientId={clientId}
        services={services}
        onServiceAssigned={fetchClientWithDetails} // 👈 REFRESH SERVICES
      />

    </Layout>
  )
}

function InfoItem({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-gray-400 text-xs uppercase tracking-wide">{label}</span>
      <span className="text-white mt-1">{value || '—'}</span>
    </div>
  )

  
}
