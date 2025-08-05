'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { toast } from 'sonner'
import router from 'next/router'
import Layout from '@/components/layout/Layout'

export default function AdminUserManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [form, setForm] = useState({
    name: '',
    sudo_name: '',
    email: '',
    work_email: '',
    role: 'seller',
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

  const handleCreateUser = async () => {
    const { name, email, work_email, sudo_name, role } = form

    if (!name || !email || !work_email || !role) {
      toast.error('Missing required fields')
      return
    }

    // 1. Create user via API
    const response = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const result = await response.json()

    if (!response.ok || !result?.userId) {
      toast.error('Failed to create user: ' + (result?.details || result?.error || 'Unknown error'))
      return
    }

    const userId = result.userId

    // 2. Insert into custom 'users' table
    const { error: dbError } = await supabase.from('users').insert({
      id: userId,
      name,
      sudo_name,
      email,
      work_email,
      role,
    })

    if (dbError) {
      toast.error('DB Error: ' + dbError.message)
      return
    }

    // 3. Generate magic link
    const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: work_email,
      options: {
        redirectTo: 'https://dashboard.metamalistic.com/set-password',
      },
    })

    if (magicLinkError || !magicLinkData?.properties?.action_link) {
      toast.error('Magic link error: ' + magicLinkError?.message)
      return
    }

    const magicLink = magicLinkData.properties.action_link

    // 4. Send invite email
    const emailRes = await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: work_email, name, link: magicLink }),
    })

    if (!emailRes.ok) {
      toast.error('Failed to send invite email')
      return
    }

    toast.success('User created & invite sent ✅')
    setForm({ name: '', sudo_name: '', email: '', work_email: '', role: 'seller' })
    fetchUsers()
  }

  return (
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
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={user.id} className="hover:bg-[#2f2f2f] border-b border-gray-800 transition">
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{user.name}</td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2 capitalize">{user.role}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        user.is_active ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
