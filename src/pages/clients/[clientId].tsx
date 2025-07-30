import { useRouter } from 'next/router'
import { useEffect, useState, ReactNode } from 'react'
import supabase from '../../lib/supabaseClient'
import {Client}  from '../../types/client'
import Layout from '../components/Layout'
import ClientNotes from '../../components/ClientNotes'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ClientModal from '@/src/components/ClientModal'




export default function SingleClientPage() {
  const router = useRouter()
  const { clientId } = router.query

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)

  const dummyServices = [
    {
      id: 1,
      name: 'Website Redesign',
      price: 300,
      description: 'Complete redesign of client’s existing website.',
    },
    {
      id: 2,
      name: 'SEO Boost',
      price: 150,
      description: 'Improve search engine visibility with expert SEO tactics.',
    },
    {
      id: 3,
      name: 'Social Media Kit',
      price: 100,
      description: 'A pack of templates and assets for Instagram and Facebook.',
    },
  ]



  const fetchClientWithDetails = async () => {

    if (!clientId || typeof clientId !== 'string') return
    setLoading(true)

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

    let platformName: string | null = null
    let sudoName: string | null = null

    // 🔹 Fetch connecting platform
      if (clientData.connecting_platform) {
        const { data: platformData } = await supabase
          .from('client_contact_channels')
          .select('platform')
          .eq('id', clientData.connecting_platform)
          .single()

        if (platformData?.platform) {
          platformName = platformData.platform
        }
      }

      // 🔹 Fetch assigned user’s sudo_name
      if (clientData.assigned_to) {
        const { data: userData } = await supabase
          .from('users')
          .select('sudo_name')
          .eq('id', clientData.assigned_to)
          .single()

        if (userData?.sudo_name) {
          sudoName = userData.sudo_name
        }
      }

      // 🔹 Set final client object
      setClient({
        ...clientData,
        platform_name: platformName,
        sudo_name: sudoName,
      })

      setLoading(false)
    }

    useEffect(() => {
      fetchClientWithDetails()
    }, [clientId])
      


  if (loading) return <div className="text-white p-8">Loading client data...</div>
  if (!client) return <div className="text-red-500 p-8">Client not found.</div>

  
    type InfoItemProps = {
    label: string
    value: ReactNode // ✅ accepts string, null, JSX, etc.
    }

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

              <Link href={`/clients/${client.id}/add-service`}>
                <button className="bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded">
                  ➕ Add Service
                </button>
              </Link>
            
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

              <InfoItem label="Connecting Platform" value={client.platform} />
              <InfoItem label="Assigned To" value={client?.sudo_name || '-'} />
              <InfoItem label="Gender" value={client.gender} />
              <InfoItem label="Created At" value={new Date(client.created_at).toLocaleString()} />
            </div>
          </div>

          {/* Dummy Services Column (1 column) */}
         <div className="grid grid-cols-1 gap-4">
            {dummyServices.map((service, index) => {
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
              const randomColor = bgColors[index % bgColors.length]

              return (
                <div
                  key={service.id}
                  className={`p-4 rounded-lg text-white shadow-md ${randomColor}`}
                >
                  <h3 className="text-lg font-bold">{service.name}</h3>
                  <p className="text-sm">{service.description}</p>
                  <p className="text-md font-semibold mt-2">${service.price}</p>
                  <button className="mt-4 bg-black bg-opacity-30 hover:bg-opacity-50 px-3 py-1 rounded text-xs">
                    View Details
                  </button>
                </div>
              )
            })}
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
