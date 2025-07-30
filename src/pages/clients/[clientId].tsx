import { useRouter } from 'next/router'
import { useEffect, useState, ReactNode } from 'react'
import supabase from '../../lib/supabaseClient'
import {Client}  from '../../types/client'
import Layout from '../components/Layout'
import ClientNotes from '../../components/ClientNotes'
import Link from 'next/link'




export default function SingleClientPage() {
  const router = useRouter()
  const { clientId } = router.query

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId || typeof clientId !== 'string') return

    const fetchClient = async () => {
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single()

        if (clientError) {
            setLoading(false)
            return
        }

        let platformName = null

        if (clientData.connecting_platform) {
            const { data: platformData, error: platformError } = await supabase
            .from('client_contact_channels') // change to your actual table name
            .select('platform_name') // or 'name' if that's the column
            .eq('id', clientData.connecting_platform)
            .single()

            if (!platformError && platformData) {
            platformName = platformData.platform_name // or platformData.name
            }
        }

        setClient({ ...clientData, platform_name: platformName }) // Add platform_name temporarily
        setLoading(false)
    }

    fetchClient()
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
          <Link href="/all-clients">
            <button className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded">
              ← Back to Clients
            </button>
          </Link>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-[#2a2a2a] p-4 rounded-lg">
          <InfoItem label="Phone" value={client.phone_numbers?.[0]} />
          <InfoItem label="Work Email" value={client.work_email} />
          <InfoItem
                label="Profile URL"
                value={
                    client.profile_url ? (
                    <a
                        href={client.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline hover:text-blue-300"
                    >
                        {new URL(client.profile_url).hostname.replace('www.', '')}
                    </a>
                    ) : (
                    '-'
                    )
                }
            />

            <InfoItem
                    label="Website URL"
                    value={
                        client.website_url ? (
                        <a
                            href={client.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline hover:text-blue-300"
                        >
                            {client.website_url}
                        </a>
                        ) : (
                        '-'
                        )
                    }
            />
          <InfoItem label="Connecting Platform" value={client.platform} />
          <InfoItem label="Gender" value={client.gender} />
          <InfoItem label="Created At" value={new Date(client.created_at).toLocaleString()} />
        </div>

        {/* Notes / Assets Section */}
        <ClientNotes clientId={client.id} currentUser="system_admin" />
      </div>
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
