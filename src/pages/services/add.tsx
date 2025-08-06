// app/services/add/ServiceForm.tsx or pages/services/add.tsx
"use client"

import React, { useState } from 'react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'
import { toast } from 'sonner'
import Layout from '@/components/layout/Layout'
import dynamic from 'next/dynamic'

// Lazy load the TiptapEditor to avoid SSR issues
const TiptapEditor = dynamic(() => import('@/components/TiptapEditor'), {
  ssr: false,
})

export default function ServiceForm() {
  const [serviceName, setServiceName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('<p>Write service description...</p>')
  const supabase = useSupabaseClient()
  const user = useUser()
  const router = useRouter()
  const [category, setCategory] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!serviceName.trim()) {
      toast.error('Service name is required')
      return
    }

    const { error } = await supabase.from('services').insert({
      service_name: serviceName,
      description,
      sold_price: parseInt(price),
      created_by: user?.id,
    })

    if (error) {
      toast.error('Failed to add service')
    } else {
      toast.success('Service added successfully')
      router.push('/services')
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 bg-[#1c1c1e] text-white rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Add New Service</h2>
          <a
            href="/services"
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm rounded-md"
          >
            ← Back to Services
          </a>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Category</label>
            <input
              type="text"
              className="w-full p-2 rounded bg-[#2a2a2a] border border-gray-600"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Branding, UI/UX, SEO"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Service Name</label>
            <input
              type="text"
              className="w-full p-2 rounded bg-[#2a2a2a] border border-gray-600"
              value={serviceName}
              onChange={e => setServiceName(e.target.value)}
              placeholder="Enter service name"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Price</label>
            <input
              type="number"
              className="w-full p-2 rounded bg-[#2a2a2a] border border-gray-600"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Enter price (e.g. 1000)"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isFeatured"
              checked={isFeatured}
              onChange={e => setIsFeatured(e.target.checked)}
            />
            <label htmlFor="isFeatured" className="text-sm">Mark as Featured</label>
          </div>


          <div>
            <label className="block text-sm mb-1">Description</label>
            <TiptapEditor content={description} onChange={setDescription} />
          </div>
          
          
          
          <button
            type="submit"
            className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium"
          >
            Save Service
          </button>
          
        </form>
      </div>
    </Layout>
  )
}
