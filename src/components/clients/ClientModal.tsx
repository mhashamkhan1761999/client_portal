'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import supabase from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation';
import { CLIENT_STATUSES } from '@/lib/clientStatus'
import { LEAD_NATURE_OPTIONS } from '@/lib/leadNature'

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
    connecting_platform: '',
    gender: '',
    profile_url: '',
    platform: '',
    lead_gen_id: '',
    lead_nature: '',
    secondary_phones: [''],
    business_name: '',
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

  if (phone && phone.length !== 10) {
    newErrors.phone_numbers = 'Phone number must be 10 digits long'
  }

  // Email is now optional, so we skip required check

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
  }


  useEffect(() => {
    fetchUsers()
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
        connecting_platform: clientData.connecting_platform || '',
        gender: clientData.gender || '',
        profile_url: clientData.profile_url || '',
        platform: clientData.platform || '',
        lead_gen_id: clientData?.lead_gen_id || '',
        lead_nature: clientData?.lead_nature || '',
        secondary_phones: clientData.secondary_phones || [''],
        business_name: clientData.business_name || '',
        
        
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
  
    // Secondary Phone Change
  const handleSecondaryPhoneChange = (index: number, value: string) => {
    const updated = [...form.secondary_phones];
    updated[index] = value;
    setForm({ ...form, secondary_phones: updated });
  };

  // Add more secondary phone fields
  const addSecondaryPhoneField = () => {
    setForm({ ...form, secondary_phones: [...form.secondary_phones, ''] });
  };


  const handleChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    const phoneToCheck = form.phone_numbers[0]?.trim()
    const normalizedForm = {
      ...form,
      phone_numbers: form.phone_numbers.map((phone) => phone.trim()).filter(Boolean),
      email_addresses: form.email_addresses.map((email) => email.trim()).filter(Boolean),
      work_email: form.work_email.trim(),
      profile_url: form.profile_url.trim(),
      website_url: form.website_url.trim(),
      lead_nature: form.lead_nature,
      secondary_phones: form.secondary_phones.map((phone) => phone.trim()).filter(Boolean),
    }

    const duplicateFilters = [`client_name.eq.${normalizedForm.client_name}`]
    if (normalizedForm.work_email) duplicateFilters.push(`work_email.eq.${normalizedForm.work_email}`)

    const { data: possibleDuplicates } = await supabase
      .from('clients')
      .select('id, client_name, phone_numbers')
      .or(duplicateFilters.join(','))

    const duplicate = possibleDuplicates?.find((c: any) => {
      if (clientData && c.id === clientData.id) return false
      return c.client_name === normalizedForm.client_name || (phoneToCheck && c.phone_numbers?.includes(phoneToCheck))
    })

    if (duplicate) {
      toast.error('Client already exists with same name, email, or phone number.')
      return
    }

    let clientId: string | null = null

    if (clientData) {
      const { data: updated } = await supabase
        .from('clients')
        .update(normalizedForm)
        .eq('id', clientData.id)
        .select('id')
        .single()

      clientId = updated?.id ?? null

      const assignedToChanged = clientData.assigned_to !== normalizedForm.assigned_to
      const statusChanged = clientData.status !== normalizedForm.status

      if (clientId && (assignedToChanged || statusChanged)) {
        const { data: authData } = await supabase.auth.getUser()
        const changedBy =
          currentUser && typeof currentUser === 'object' && currentUser.id
            ? currentUser.id
            : authData.user?.id

        await supabase.from('status_logs').insert({
          client_id: clientId,
          previous_status: clientData.status || null,
          new_status: normalizedForm.status || null,
          changed_by: changedBy || null,
          affected_user: normalizedForm.assigned_to || null,
          action_type: assignedToChanged ? 'client_transferred' : 'status_changed',
          note: assignedToChanged
            ? `Transferred from ${clientData.assigned_to || 'unassigned'} to ${normalizedForm.assigned_to || 'unassigned'}`
            : `Status changed from ${clientData.status || 'none'} to ${normalizedForm.status || 'none'}`,
        })
      }

      toast.success('Client updated successfully')
    } else {
      const { data: inserted, error } = await supabase.from('clients').insert([normalizedForm]).select('id').single()

      if (error || !inserted) {
        console.error('Failed to insert client:', error)
        toast.error(error?.message || 'Failed to insert client')
        return
      }

      clientId = inserted.id

      if (normalizedForm.assigned_to) {
        const { data: authData } = await supabase.auth.getUser()
        await supabase.from('client_assignments').insert({
          client_id: clientId,
          user_id: normalizedForm.assigned_to,
          assigned_by: authData.user?.id || null,
          lead_gen_id: normalizedForm.lead_gen_id || null,
          assignment_type: 'primary',
          status: normalizedForm.status || 'connected',
          remarks: 'Initial assignment',
          lead_nature: normalizedForm.lead_nature || null,
        })
      }

      toast.success('Client added successfully')
    }

    onSaved()
    onClose()
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
            <label className="block text-sm mb-1">Primary Phone Number</label>
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


          {/* Business Name */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-1">Business Name (Optional)</label>
            <input
              type="text"
              name="business_name"
              value={form.business_name || ''}
              onChange={(e) => handleChange('business_name', e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600"
            />
          </div>

          {/* Secondary Phone Numbers */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-1">Secondary Phone Numbers (Optional)</label>
            {form.secondary_phones.map((phone, index) => (
              <input
                key={index}
                type="text"
                value={phone}
                onChange={(e) => handleSecondaryPhoneChange(index, e.target.value)}
                className="w-full mb-2 px-3 py-2 rounded bg-gray-800 text-white border border-gray-600"
              />
            ))}
            <button
              type="button"
              onClick={addSecondaryPhoneField}
              className="text-blue-500 text-sm mt-1"
            >
              + Add another
            </button>
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
              <option value="">Select Connection</option>
              <option value="email">On Email</option>
              <option value="facebook">On Facebook</option>
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
              {CLIENT_STATUSES.filter((status) => status.value !== 'new').map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
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

          <div>
            <label className="block text-sm mb-1">Lead Nature</label>
            <select
              className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2"
              value={form.lead_nature}
              onChange={(e) => handleChange('lead_nature', e.target.value)}
            >
              <option value="">Select Lead Nature</option>
              {LEAD_NATURE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
