// pages/services/index.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import Layout from '@/components/layout/Layout'
import { Loader2 } from 'lucide-react'

interface Service {
  id: string
  service_name: string
  description: string
  sold_price: number
  created_at: string
  category: string
}

export default function ServicesList() {
  const supabase = useSupabaseClient()
  const user = useUser()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const uniqueCategories = ['All', ...new Set(services.map(s => s.category || 'Uncategorized'))]
  const [hasFetched, setHasFetched] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!user) return

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user:', error.message)
      } else {
        setCurrentUser(data)
      }
      
    }
    const fetchServices = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setServices(data)
      }
      setLoading(false)
      setHasFetched(true)
    }

    if (user && !hasFetched) fetchServices()
      fetchCurrentUser()
  }, [user, hasFetched])

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">Your Services</h2>

          {currentUser?.role === 'admin' && (
            <a
              href="/services/add"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              + Add New Service
            </a>
          )}
        </div>

        <div className="mb-4">
          <label className="mr-2 text-sm">Filter by Category:</label>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-[#2a2a2a] border border-gray-600 text-white p-2 rounded"
          >
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {loading ? (
            <div className="flex items-center space-x-2 text-gray-400">
              <Loader2 className="animate-spin w-5 h-5" />
              <span>Loading services...</span>
            </div>
          ) : services.length === 0 ? (
            <p className="text-gray-400">No services found. Start by adding one.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {services
                .filter(service =>
                  selectedCategory === 'All' || service.category === selectedCategory
                )
                .map((service) => (
                  <div
                    key={service.id}
                    className="bg-[#2a2a2a] border border-gray-700 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {service.service_name}
                    </h3>

                    <div
                      className="prose prose-invert text-sm mt-2"
                      dangerouslySetInnerHTML={{ __html: service.description }}
                    />

                    <div className="mt-4 flex justify-between items-end text-sm text-gray-400">
                      <span className="text-blue-400 font-semibold text-base">
                        ${service.sold_price?.toLocaleString()}
                      </span>
                      <span>
                        {new Date(service.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
      </div>
    </Layout>
  )
}
