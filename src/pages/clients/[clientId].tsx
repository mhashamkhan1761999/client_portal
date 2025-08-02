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
    setLoading(false)
  }

  useEffect(() => {
    if (!router.isReady || !clientId || typeof clientId !== 'string') return
    fetchClientWithDetails()
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
                {client.status || 'new'}
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
              <InfoItem label="Assigned To" value={client?.sudo_name || '-'} />
              <InfoItem label="Gender" value={client.gender} />
              <InfoItem label="Lead Gen Agent" value={client.lead_gen_name || '-'} />
              <InfoItem label="Created At" value={new Date(client.created_at).toLocaleString()} />
            </div>
          </div>

          {/* Services Section with Smooth Scroll */}
          <div className="max-h-[500px] overflow-y-auto pr-2 scroll-smooth scrollbar-custom">

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


        {/* Notes / Assets Section */}
        <ClientNotes clientId={client.id} currentUser="system_admin" />
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
