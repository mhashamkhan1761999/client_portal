'use client'

import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { SALE_TYPES } from '@/lib/finance'

type UserOption = {
  id: string
  name?: string
  sudo_name?: string
  role?: string
}

type AddSaleModalProps = {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName?: string
  onSaved?: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

export default function AddSaleModal({ isOpen, onClose, clientId, clientName, onSaved }: AddSaleModalProps) {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    sale_type: 'new_sale',
    seller_user_id: user?.id || '',
    service_name: '',
    service_includes: '',
    total_amount: '',
    invoice_number: '',
    sale_date: today(),
  })

  useEffect(() => {
    if (!isOpen) return
    fetchUsers()
    setForm((prev) => ({ ...prev, seller_user_id: user?.id || prev.seller_user_id }))
  }, [isOpen, user?.id])

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name, sudo_name, role')
      .eq('is_active', true)

    setUsers((data || []) as UserOption[])
  }

  const handleSave = async () => {
    if (!user) return
    if (!clientId || !form.seller_user_id || !form.service_name.trim() || !form.service_includes.trim() || !form.total_amount) {
      toast.error('Service name, includes, seller, and total amount are required.')
      return
    }

    setLoading(true)
    const soldItems = `Service: ${form.service_name.trim()}\nIncludes: ${form.service_includes.trim()}`

    const { data: insertedSale, error } = await supabase.from('client_sales').insert({
      client_id: clientId,
      sale_type: form.sale_type,
      seller_user_id: form.seller_user_id,
      added_by: user.id,
      total_amount: Number(form.total_amount),
      currency: 'USD',
      sold_items: soldItems,
      invoice_number: form.invoice_number.trim() || null,
      sale_date: form.sale_date,
      status: 'open',
    }).select('id').single()

    setLoading(false)

    if (error) {
      console.error(error)
      toast.error('Failed to add sale.')
      return
    }

    const seller = users.find((item) => item.id === form.seller_user_id)
    await supabase.from('status_logs').insert({
      client_id: clientId,
      previous_status: null,
      new_status: null,
      changed_by: user.id,
      affected_user: form.seller_user_id,
      action_type: 'sale_added',
      note: `Added sale: ${form.service_name.trim()} for $${Number(form.total_amount).toFixed(2)}${seller ? ` | Seller: ${seller.sudo_name || seller.name}` : ''}${form.invoice_number.trim() ? ` | Invoice: ${form.invoice_number.trim()}` : ''}`,
    })

    toast.success('Sale added.')
    setForm({
      sale_type: 'new_sale',
      seller_user_id: user.id,
      service_name: '',
      service_includes: '',
      total_amount: '',
      invoice_number: '',
      sale_date: today(),
    })
    onSaved?.()
    onClose()
  }

  const sellerOptions = users.filter((item) => ['seller', 'upseller', 'sales_head', 'admin'].includes(item.role || ''))

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className="fixed inset-0 bg-black/70" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-8">
            <Dialog.Panel className="w-full max-w-2xl rounded-lg border border-slate-800 bg-[#1c1c1e] p-6 text-white shadow-xl">
              <Dialog.Title className="text-xl font-semibold text-[#c29a4b]">Add Sale</Dialog.Title>
              {clientName && <p className="mt-1 text-sm text-slate-400">{clientName}</p>}

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Service Name</label>
                  <input
                    className="w-full rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm"
                    value={form.service_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, service_name: e.target.value }))}
                    placeholder="Website starter package"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Total Sale Amount</label>
                  <input
                    className="w-full rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm"
                    type="number"
                    value={form.total_amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, total_amount: e.target.value }))}
                    placeholder="200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Sale Type</label>
                  <select
                    className="w-full rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm"
                    value={form.sale_type}
                    onChange={(e) => setForm((prev) => ({ ...prev, sale_type: e.target.value }))}
                  >
                    {SALE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Seller / Closer</label>
                  <select
                    className="w-full rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm"
                    value={form.seller_user_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, seller_user_id: e.target.value }))}
                  >
                    <option value="">Select seller</option>
                    {sellerOptions.map((item) => (
                      <option key={item.id} value={item.id}>{item.sudo_name || item.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Sale Date</label>
                  <input
                    className="w-full rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm"
                    type="date"
                    value={form.sale_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, sale_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">PayPal Invoice</label>
                  <input
                    className="w-full rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm"
                    value={form.invoice_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, invoice_number: e.target.value }))}
                    placeholder="PAYPAL-INV-..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-slate-300">What Includes In Service</label>
                  <textarea
                    className="min-h-32 w-full rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm"
                    value={form.service_includes}
                    onChange={(e) => setForm((prev) => ({ ...prev, service_includes: e.target.value }))}
                    placeholder="Landing page, contact form, responsive setup, basic SEO..."
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button className="rounded bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button className="rounded bg-[#c29a4b] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500" onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Sale'}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
