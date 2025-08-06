'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { toast } from 'sonner'
import supabase from '../../lib/supabaseClient'
import type { Service } from '../../types/client'
import { useUser } from '@supabase/auth-helpers-react'  

type AddServiceModalProps = {
  isOpen: boolean
  onClose: () => void
  clientId: string
  services: Service[]
  onServiceAssigned?: () => void // 👈 NEW
}

export default function AddServiceModal({
  isOpen,
  onClose,
  clientId,
  services,
  onServiceAssigned,
}: AddServiceModalProps) {
  const user = useUser()
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [packageName, setPackageName] = useState('')
  const [price, setPrice] = useState<string>('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!selectedServiceId || !clientId || !user?.id) {
      toast.error('Missing required fields')
      return
    }

    setLoading(true)

    // Insert into client_service_sales
    const { error: insertError } = await supabase
      .from('client_service_sales')
      .insert({
        client_id: clientId,
        service_id: selectedServiceId,
        package_name: packageName,
        description: description,
        price,
        sold_price: price,
        created_by: user?.id,
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      toast.error('Failed to add service')
      setLoading(false)
      return
    }

    // Fetch current client service_ids
    const { data: clientData, error: fetchError } = await supabase
      .from('clients')
      .select('service_ids')
      .eq('id', clientId)
      .single()

    if (fetchError) {
      console.error('Failed to fetch client service_ids:', fetchError)
      toast.error('Service added, but failed to update service_ids')
      setLoading(false)
      return
    }

    const currentServiceIds = clientData?.service_ids || []
    const updatedServiceIds = Array.from(new Set([...currentServiceIds, selectedServiceId]))

    const { error: updateError } = await supabase
      .from('clients')
      .update({ service_ids: updatedServiceIds })
      .eq('id', clientId)

    if (updateError) {
      console.error('Failed to update service_ids:', updateError)
      toast.error('Service added, but failed to update client record')
    }

    // Insert into status_logs
    await supabase.from('status_logs').insert({
      client_id: clientId,
      previous_status: null,
      new_status: null,
      changed_by: user?.id,
      note: description,
      service_id: selectedServiceId,
      package_name: packageName,
      service_price: price,
      action_type: 'service_assigned',
      affected_user: user?.id,
    })

    toast.success('Service added successfully')

    // Reset and close modal
    setSelectedServiceId('')
    setPackageName('')
    setPrice('')
    setDescription('')
    setLoading(false)
    onClose()

    // Notify parent to refetch
    onServiceAssigned?.()
  }

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className="fixed inset-0 bg-black bg-opacity-60" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-8">
            <Dialog.Panel className="w-full max-w-xl rounded-lg bg-[#1c1c1e] p-6 text-white shadow-xl border border-gray-700">
              <Dialog.Title className="text-lg font-semibold mb-4">
                Assign Service
              </Dialog.Title>

              <div className="space-y-4">
                {/* Select Service */}
                <div>
                  <label className="text-sm mb-1 block">Select Base Service</label>
                  <select
                    className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2"
                    value={selectedServiceId}
                    onChange={(e) => {
                      const selectedId = e.target.value
                      setSelectedServiceId(selectedId)

                      const selected = services.find((s: Service) => s.id === selectedId)
                      if (selected) {
                        setPackageName(selected.service_name || '')
                        setPrice(String(selected.sold_price || ''))
                        setDescription(selected.description || '')
                      }
                    }}
                  >
                    <option value="">Select</option>
                    {services.map((service: Service) => (
                      <option key={service.id} value={service.id}>
                        {service.service_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Package Name */}
                <div>
                  <label className="text-sm mb-1 block">Package Name</label>
                  <input
                    className="w-full bg-[#111] border border-gray-600 text-white rounded px-3 py-2"
                    value={packageName ?? ''}
                    onChange={(e) => setPackageName(e.target.value)}
                    placeholder="Custom Package Name"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="text-sm mb-1 block">Price ($)</label>
                  <input
                    type="number"
                    className="w-full bg-[#111] border border-gray-600 text-white rounded px-3 py-2"
                    value={price ?? ''}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g., 59"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm mb-1 block">Description (max 1000 characters)</label>
                  <textarea
                    maxLength={1000}
                    className="w-full bg-[#111] border border-gray-600 text-white min-h-[200px] rounded px-3 py-2"
                    placeholder="Enter package details here..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Submit */}
                <button
                  disabled={loading}
                  onClick={handleSave}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black py-2 px-4 rounded"
                >
                  {loading ? 'Saving...' : 'Assign Service'}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
