'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { toast } from 'sonner'
import router from 'next/router'
import Layout from '@/components/layout/Layout'
import { Toaster } from 'sonner'

export default function AdminUserManagement() {
  const [users, setUsers] = useState<any[]>([])

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  if (!baseUrl) throw new Error('BASE_URL is missing in environment variables')

  const [phoneInput, setPhoneInput] = useState('')
  const [form, setForm] = useState<{
    name: string
    sudo_name: string
    email: string
    work_email: string
    role: string
    assigned_phones: string[]
  }>({
    name: '', 
    sudo_name: '',
    email: '',
    work_email: '',
    role: 'seller',
    assigned_phones: [] // Start with one phone
  })

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    setUsers(data || [])
  }

  useEffect(() => {
    fetchUsers()
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    const id = session?.session?.user?.id

    if (sessionError || !id) {
      router.replace('/login')
      return
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single()

    if (userError || !user || user.role !== 'admin') {
      router.replace('/login')
    }
  }

  const resendMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // Sends invite if user doesn’t exist
        emailRedirectTo: `${baseUrl}/set-password`, // Or your desired route
      },
    })

    if (error) {
      console.error('Error sending magic link:', error.message)
      alert('Failed to send invite.')
    } else {
      alert('Magic link sent to the user’s email.')
    }
  }

  // const deleteUser = async (authUserId: string) => {
  //   const { error } = await supabase.auth.admin.deleteUser(authUserId);
    
  //   if (error) {
  //     console.error('Failed to delete user:', error.message);
  //     alert('Error deleting user.');
  //   } else {
  //     alert('User deleted successfully.');
  //     // Optionally: refetch your user list here
  //   }
  // };



  const handleCreateUser = async () => {
    if (!form.name || !form.email || !form.work_email || !form.role || form.assigned_phones.length === 0) {
      toast.error('⚠️ Please fill all fields and assign at least one phone number')
      return
    }

    const response = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const result = await response.json()

    if (!response.ok || !result?.userId) {
      toast.error('❌ Failed to create user: ' + (result?.details || result?.error || 'Unknown error'))
      return
    }

    // ✅ Show correct toast based on email status
    if (result.inviteEmailSuccess) {
      toast.success('✅ User created and invite email sent')
    } else {
      toast.success('✅ User created, but invite email failed ❌')
    }

    setForm({ name: '', sudo_name: '', email: '', work_email: '', role: 'seller', assigned_phones: [] })
    fetchUsers()
  }

  


  return (
    <>
     <Toaster richColors position="top-right" />
    <Layout>
      <div className="p-6 text-white bg-[#1c1c1e] min-h-screen">
        <h1 className="text-3xl font-bold mb-6">👤 Admin – Manage Users</h1>

        {/* Create User Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#2a2a2a] p-6 rounded-xl shadow-md mb-10">
          {['name', 'sudo_name', 'email', 'work_email'].map((field) => (
            <div key={field}>
              <label className="block text-sm text-gray-300 mb-1">
                {field.replace('_', ' ').toUpperCase()}
              </label>
              <input
                type="text"
                placeholder={`Enter ${field.replace('_', ' ')}`}
                value={(form as any)[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full bg-[#111] text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
              />
            </div>
          ))}

          <div>
          <label className="block text-sm text-gray-300 mb-1">Assigned Phone Numbers</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter phone number"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="flex-1 bg-[#111] text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
            />
            <button
              onClick={() => {
                if (phoneInput.trim()) {
                    setForm({
                    ...form,
                    assigned_phones: [...form.assigned_phones, phoneInput.trim() as string],
                    })
                  setPhoneInput('')
                }
              }}
              type="button"
              className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-600"
            >
              ➕ Add
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-400">
            {form.assigned_phones.map((phone, idx) => (
              <span key={idx} className="inline-block bg-gray-700 px-2 py-1 rounded mr-2 mb-1">
                {phone}{' '}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      assigned_phones: form.assigned_phones.filter((_, i) => i !== idx),
                    })
                  }
                  className="text-red-400 ml-1 hover:text-red-600"
                >
                  ✖
                </button>
              </span>
            ))}
          </div>
        </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">ROLE</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-[#111] text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
            >
              <option value="seller">Seller</option>
              <option value="upsell">Upsell</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-end mt-4 md:mt-0">
            <button
              onClick={handleCreateUser}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-bold shadow-md transition"
            >
              ➕ Create User
            </button>
          </div>
        </div>

        {/* User List Table */}
        <div className="overflow-x-auto rounded-lg shadow-md border border-gray-700">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs uppercase bg-[#2a2a2a] text-gray-400 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Sudo Name</th>                
                <th className="px-4 py-3">Assigned Phone Number</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={user.id} className="hover:bg-[#2f2f2f] border-b border-gray-800 transition">
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{user.name}</td>
                  <td className="px-4 py-2">{user.work_email}</td>
                  <td className="px-4 py-2 capitalize">{user.role}</td>
                  <td className="px-4 py-2 capitalize">{user.sudo_name}</td>
                  <td className="px-4 py-2 capitalize">{user.assigned_phones}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        user.is_active ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    <button
                      onClick={() => resendMagicLink(user.work_email)}
                      className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 text-sm"
                    >
                      Resend Invite
                    </button>                    
                    {/* <button
                      onClick={() => deleteUser(user.auth_user_id)}
                      className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 text-sm"
                    >
                      Delete User
                    </button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </Layout>
    </>
  )
}
