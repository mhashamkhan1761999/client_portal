'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import supabase from '../lib/supabaseClient'
import { useRouter } from 'next/navigation';

export default function ClientModal({
  open,
  onClose,
  onSaved,
  clientData,
  currentUser,
  isServiceEditable = true,

}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clientData?: any
  currentUser: any
  isServiceEditable?: boolean
}) {
  const router = useRouter()

  const [form, setForm] = useState({
    client_name: '',
    phone_numbers: [''],
    email_addresses: [''],
    work_email: '',
    website_url: '',
    status: 'new',
    assigned_to: '',
    service_id: '',
    connecting_platform: '',
    gender: '',
    profile_url: '',
    platform: '',
    lead_gen_id: '',
  })

  const [users, setUsers] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [number, setNumber] = useState<any[]>([])
  const [showAddService, setShowAddService] = useState(false)
  const [newService, setNewService] = useState({ name: '', description: '', })
  const [errors, setErrors] = useState<any>({})
  const [leadGens, setLeadGens] = useState<{ id: string; name: string }[]>([])

  const validateForm = () => {
  const newErrors: any = {}

  if (!form.client_name.trim()) {
    newErrors.client_name = 'Client name is required'
  }

  const phone = form.phone_numbers[0]?.replace(/\D/g, '')

  if (!phone) {
    newErrors.phone_numbers = 'Phone number is required'
  } else if (phone.length !== 10) {
    newErrors.phone_numbers = 'Phone number must be 10 digits long'
  }

  // Email is now optional, so we skip required check

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
  }


  useEffect(() => {
    fetchUsers()
    fetchServices()
    fetchNumbers()
    fetchLeadGens()

    if (clientData) {
      setForm({
        client_name: clientData.client_name || '',
        phone_numbers: clientData.phone_numbers || [''],
        email_addresses: clientData.email_addresses || [''],
        work_email: clientData.work_email || '',
        website_url: clientData.website_url || '',
        status: clientData.status || 'new',
        assigned_to: clientData.assigned_to || '',
        service_id: clientData.service_id || '',
        connecting_platform: clientData.connecting_platform || '',
        gender: clientData.gender || '',
        profile_url: clientData.profile_url || '',
        platform: clientData.platform || '',
        lead_gen_id: clientData?.lead_gen_id || '',
      })
    } else if (currentUser?.role !== 'admin') {
      setForm(prev => ({ ...prev, assigned_to: currentUser?.id }))
    }
  }, [clientData])

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('id, sudo_name')
    setUsers(data || [])
  }

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('id, service_name')
    setServices(data || [])
  }

  const fetchNumbers = async () => {
  const { data } = await supabase
    .from('client_contact_channels')
    .select('id, platform, phone_number, assigned_to')

  setNumber(data || [])
  }


  const handleChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    const phoneToCheck = form.phone_numbers[0]?.trim()

    // Fetch clients with matching name or email
    const { data: possibleDuplicates, error } = await supabase
      .from('clients')
      .select('id, phone_numbers')
      .or(`work_email.eq.${form.work_email},client_name.eq.${form.client_name}`)

    const duplicate = possibleDuplicates?.find((c: any) => {
      if (clientData && c.id === clientData.id) return false
      return c.phone_numbers?.includes(phoneToCheck)
    })

    if (duplicate) {
      toast.error('Client already exists with same name, email, or phone number.')
      return
    }

    let clientId: string | null = null

    if (clientData) {
      const { data: updated } = await supabase
        .from('clients')
        .update(form)
        .eq('id', clientData.id)
        .select('id')
        .single()

      clientId = updated?.id ?? null

      toast.success('Client updated successfully')
    } else {
      const { data: inserted, error } = await supabase.from('clients').insert([form]).select('id').single()

      if (error || !inserted) {
        toast.error('Failed to insert client')
        return
      }

      clientId = inserted.id
      toast.success('Client added successfully')
    }

    onSaved()
    onClose()
  }

  const handleAddNewService = async () => {
    if (!newService.name) {
      toast.error('Service name is required')
      return
    }

    const { data, error } = await supabase.from('services').insert([
      {
        service_name: newService.name,
        description: newService.description,
        created_by: currentUser?.id,
      },
    ]).select()

    if (error) {
      toast.error('Failed to add service')
      return
    }

    if (data?.[0]) {
      setServices(prev => [...prev, data[0]])
      handleChange('service_id', data[0].id)
      toast.success('New service added!')
      setShowAddService(false)
      setNewService({ name: '', description: ''})
    }
  }

  const formatPhoneUS = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    const match = digits.match(/^(\d{3})(\d{3})(\d{4})$/)
      return match ? `(${match[1]}) ${match[2]}-${match[3]}` : value
  }

  const fetchLeadGens = async () => {
    const { data, error } = await supabase
      .from('lead_gens')
      .select('id, name')

    if (!error) setLeadGens(data || [])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#1c1c1e] text-white rounded-xl p-6 w-full max-w-3xl shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-3xl font-bold mb-6 text-[#c29a4b]">
          {clientData ? 'Edit Client' : 'Add New Client'}
        </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Name */}
            <div>
              <label className="block mb-1">Client Name</label>
              <input
                  className={`w-full p-2 rounded bg-[#111] border ${errors.client_name ? 'border-red-500' : 'border-gray-600'}`}
                  value={form.client_name}
                  onChange={(e) => handleChange('client_name', e.target.value)}
              />
              {errors.client_name && <p className="text-red-500 text-sm">{errors.client_name}</p>}
          </div>

          <div> 
            {/* Email Addresses */}

            <label className="block text-sm mb-1">Email Addresses</label>
            {form.email_addresses.map((email, i) => (
              <input
                key={i}
                className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2 mb-2"
                value={email}
                onChange={(e) => {
                  const updated = [...form.email_addresses]
                  updated[i] = e.target.value
                  handleChange('email_addresses', updated)
                }}
              />
            ))}
          
          </div>
           {/* Phone Numbers */}
          <div>
            <label className="block text-sm mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="1234567890"
                value={form.phone_numbers[0]}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '')
                  setForm((prev) => ({ ...prev, phone_numbers: [digits] }))
                }}
                className="w-full p-2 mb-2 rounded bg-[#111] border border-gray-600"
              />
              {errors.phone_numbers && <p className="text-red-500 text-sm">{errors.phone_numbers}</p>}
          </div>

          {/* Work Email */}
          <div>
              <label className="block mb-1">Work Email</label>
              <input
                  type="email"
                  className={`w-full p-2 rounded bg-[#111] border ${errors.work_email ? 'border-red-500' : 'border-gray-600'}`}
                  value={form.work_email}
                  onChange={(e) => handleChange('work_email', e.target.value)}
              />
              {errors.work_email && <p className="text-red-500 text-sm">{errors.work_email}</p>}
          </div>

          {/* Gender Dropdown */}
          <div>
            <label className="block text-sm mb-1">Gender</label>
            <select
              className="w-full p-2 mb-2 rounded bg-[#111] border border-gray-600"
              value={form.gender || ''}
              onChange={(e) => handleChange('gender', e.target.value)}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>


          {/* Own Connecting Dropdown */}
          <div className="mb-4">
            <label className="block text-sm mb-1">Connected With</label>
              <select
                value={form.connecting_platform}
                onChange={(e) => handleChange('connecting_platform', e.target.value)}
                className="w-full p-2 mb-2 rounded bg-[#111] border border-gray-600"
              >
              <option value="">Select Platform</option>
              {number.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.platform} - {item.phone_number}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Dropdown */}
          <div>
            <label className="block text-sm mb-1">Platform</label>
            <select
              className="w-full p-2 mb-2 rounded bg-[#111] border border-gray-600"
              value={form.platform || ''}
              onChange={(e) => handleChange('platform', e.target.value)}
            >
              <option value="">Select Platform</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
              <option value="Threads">Threads</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Bark">Bark</option>
            </select>
          </div>


          {/* Profile URL */}
          <div>
            <label className="block text-sm mb-1">Profile URL</label>
            <input
              type="text"
              className="w-full p-2 mb-2 rounded bg-[#111] border border-gray-600"
              value={form.profile_url || ''}
              onChange={(e) => handleChange('profile_url', e.target.value)}
            />
          </div>



          {/* Website URL */}
          <div>
            <label className="block text-sm mb-1">Website URL (optional)</label>
            <input
              className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2"
              value={form.website_url}
              onChange={(e) => handleChange('website_url', e.target.value)}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm mb-1">Status</label>
            <select
              className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2"
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="upsell">Upsell</option>
              <option value="converted">Converted</option>
              <option value="followup">Follow Up</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm mb-1">Assigned To</label>
            <select
              className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2 disabled:opacity-50"
              value={form.assigned_to}
              onChange={(e) => handleChange('assigned_to', e.target.value)}
              disabled={!isServiceEditable} // 🔒 disable based on flag
            >
              <option value="">Select</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.sudo_name}
                </option>
              ))}
            </select>

            

            {!isServiceEditable && (
              <p className="text-xs text-gray-400 mt-1 italic">
                Editing assigned user is disabled on this screen.
              </p>
            )}
          </div>

          <div>
              <label className="block text-sm mb-1">Lead Gen Agent</label>
              <select
                className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2"
                value={form.lead_gen_id}
                onChange={(e) => handleChange('lead_gen_id', e.target.value)}
              >
                <option value="">Select</option>
                {leadGens.map((lg) => (
                  <option key={lg.id} value={lg.id}>
                    {lg.name}
                  </option>
                ))}
              </select>
            </div>

          {/* Service */}
          {/* <div>
            <label className="block text-sm mb-1">Service</label>
            <select
                className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2 disabled:opacity-50"
                value={form.service_id}
                onChange={(e) => handleChange('service_id', e.target.value)}
                disabled={!isServiceEditable  } // 🔒 Lock when false
                >
                <option value="">Select</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.service_name}
                  </option>
                ))}
            </select>
            {!isServiceEditable && (
              <p className="text-xs text-gray-400 mt-1 italic">
                Service selection is disabled on this screen.
              </p>
            )}


            {isServiceEditable && (
                <button
                  onClick={() => setShowAddService(!showAddService)}
                  className="text-xs text-yellow-400 hover:underline mt-1"
                >
                  {showAddService ? 'Cancel Add Service' : 'Add New Service'}
                </button>
              )}

            {isServiceEditable && showAddService &&  (
              <div className="mt-3 bg-[#111] border border-gray-700 p-3 rounded">
                <input
                  className="w-full mb-2 bg-[#1c1c1e] border border-gray-600 rounded px-3 py-2"
                  placeholder="Service Name"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                />
                <textarea
                  className="w-full bg-[#1c1c1e] border border-gray-600 rounded px-3 py-2"
                  placeholder="Service Description"
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                />
                <button
                  className="mt-2 bg-[#c29a4b] text-black px-4 py-1 rounded hover:bg-yellow-500"
                  onClick={handleAddNewService}
                >
                  Add
                </button>
              </div>
            )}
          </div> */}
          {/* Phone Numbers
            <div>
            <label className="block text-sm mb-1">Phone Numbers</label>
                {form.phone_numbers.map((num, i) => (
                    <input
                    key={i}
                    type="text"
                    className={`w-full p-2 mb-2 rounded bg-[#111] border ${errors.phone_numbers ? 'border-red-500' : 'border-gray-600'}`}
                    value={num}
                    onChange={(e) => {
                        const updated = [...form.phone_numbers];
                        updated[i] = e.target.value;
                        handleChange('phone_numbers', updated);
                    }}
                    />
                ))}
                {errors.phone_numbers && <p className="text-red-500 text-sm">{errors.phone_numbers}</p>}
            </div>
            */}
          
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-[#c29a4b] text-black px-6 py-2 font-semibold rounded hover:bg-yellow-500"
          >
            {clientData ? 'Update' : 'Add Client'}
          </button>
        </div>
      </div>
    </div>
  )
}
