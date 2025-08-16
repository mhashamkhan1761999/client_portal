'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { toast, Toaster } from 'sonner'
import router from 'next/router'
import Layout from '@/components/layout/Layout'



// LeadGen type
interface LeadGen {
  id: string;
  name: string;
  platform: string | null;
  nature: string | null;
}


export default function AdminUserManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'user' | 'teamlead' | 'numbers'>('user')
  const [channels, setChannels] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  // State
  const [newChannel, setNewChannel] = useState({
    platform: "",
    phone_number: "",
    assigned_to: "",
  });

  // --- Lead Gens State ---
  const [leadGens, setLeadGens] = useState<LeadGen[]>([]);
  const [newLeadGen, setNewLeadGen] = useState({
    name: "",
    platform: "",
    nature: "",
  });

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
    assigned_phones: []
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
    fetchChannels()
    fetchLeadGens();
    checkAdmin()
  }, [activeTab])

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
        shouldCreateUser: true,
        emailRedirectTo: `${baseUrl}/set-password`,
      },
    })

    if (error) {
      console.error('Error sending magic link:', error.message)
      alert('Failed to send invite.')
    } else {
      alert('Magic link sent to the user’s email.')
    }
  }

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

    if (result.inviteEmailSuccess) {
      toast.success('✅ User created and invite email sent')
    } else {
      toast.success('✅ User created, but invite email failed ❌')
    }

    setForm({ name: '', sudo_name: '', email: '', work_email: '', role: 'seller', assigned_phones: [] })
    fetchUsers()
  }


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewChannel({ ...newChannel, [e.target.name]: e.target.value });
  };

  // Delete channel
  const handleDeleteChannel = async (id: string) => {
    const { error } = await supabase.from("client_contact_channels").delete().eq("id", id);
    if (!error) {
      setChannels(channels.filter((ch) => ch.id !== id));
    }
  };


  // Fetch Client Contact Channel Information

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from("client_contact_channels")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Failed to fetch channels", error);
    } else {
      setChannels(data);
    }
  };

  // Add channel
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from("client_contact_channels")
      .insert([newChannel])
      .select();

    if (!error && data) {
      setChannels([...channels, ...data]);
      setNewChannel({ platform: "", phone_number: "", assigned_to: "" });
    } else {
      console.error("Error adding channel:", error);
    }
  };

// Fetching Lead Gen Agent Things

  const fetchLeadGens = async () => {
    const { data, error } = await supabase.from("lead_gens").select("*");
    if (error) {
      console.error("❌ Error fetching lead gens:", error);
    } else {
      setLeadGens(data || []);
    }
  };

  // Add lead gen
  const handleAddLeadGen = async () => {
    if (!newLeadGen.name.trim()) {
      alert("Name is required!");
      return;
    }

    const { data, error } = await supabase
      .from("lead_gens")
      .insert([newLeadGen])
      .select();

    if (error) {
      console.error("❌ Error adding lead gen:", error);
    } else {
      setLeadGens((prev) => [...prev, ...(data || [])]);
      setNewLeadGen({ name: "", platform: "", nature: "" }); // reset form
    }
  };

  // Delete lead gen
  const handleDeleteLeadGen = async (id: string) => {
    const { error } = await supabase.from("lead_gens").delete().eq("id", id);

    if (error) {
      console.error("❌ Error deleting lead gen:", error);
    } else {
      setLeadGens((prev) => prev.filter((lg) => lg.id !== id));
    }
  };


  return (
    <>
      <Toaster richColors position="top-right" />
      <Layout>
        <div className="p-6 text-white bg-[#1c1c1e] min-h-screen">
          <h1 className="text-3xl font-bold mb-6">👤 Admin – Manage Users</h1>

          {/* Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('user')}
              className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'user' ? 'bg-yellow-500 text-black' : 'bg-[#2a2a2a] text-gray-300'}`}
            >
              ➕ Add User
            </button>
            <button
              onClick={() => setActiveTab('teamlead')}
              className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'teamlead' ? 'bg-yellow-500 text-black' : 'bg-[#2a2a2a] text-gray-300'}`}
            >
              📞 Assign Numbers
            </button>
            <button
              onClick={() => setActiveTab('numbers')}
              className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'numbers' ? 'bg-yellow-500 text-black' : 'bg-[#2a2a2a] text-gray-300'}`}
            >
              👨‍💼 Add Lead Gen Memebers
            </button>
          </div>

         {/* Tab Content */}
          {activeTab === 'user' && (
            <>
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

                {/* Assigned Phone Numbers */}
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
                          });
                          setPhoneInput('');
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
                      <span
                        key={idx}
                        className="inline-block bg-gray-700 px-2 py-1 rounded mr-2 mb-1"
                      >
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

                {/* Role Selector */}
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

                {/* Submit */}
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
                      <tr
                        key={user.id}
                        className="hover:bg-[#2f2f2f] border-b border-gray-800 transition"
                      >
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2">{user.name}</td>
                        <td className="px-4 py-2">{user.work_email}</td>
                        <td className="px-4 py-2 capitalize">{user.role}</td>
                        <td className="px-4 py-2 capitalize">{user.sudo_name}</td>
                        <td className="px-4 py-2 capitalize">{user.assigned_phones}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              user.is_active
                                ? 'bg-green-600 text-green-100'
                                : 'bg-red-600 text-red-100'
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
            </>
          )}

          {activeTab === 'teamlead' && (
            <div className="bg-[#2a2a2a] p-6 rounded-xl shadow-md mb-10">
              <h2 className="text-xl font-bold mb-4">📞 Client Contact Channels</h2>
              <p className="text-gray-400 mb-4">Manage client contact channels (Zoom, 3CX, Dialpad, 8X8).</p>

              {/* Add New Contact Channel Form */}
              <form
                onSubmit={handleAddChannel}
                className="space-y-4 bg-[#1e1e1e] p-4 rounded-lg shadow"
              >
                {/* Platform */}
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Platform</label>
                  <select
                    name="platform"
                    value={newChannel.platform}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 rounded bg-[#2a2a2a] text-white border border-gray-600"
                  >
                    <option value="">-- Select Platform --</option>
                    <option value="Zoom">Zoom</option>
                    <option value="3CX">3CX</option>
                    <option value="Dialpad">Dialpad</option>
                    <option value="8X8">8X8</option>
                  </select>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={newChannel.phone_number}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 rounded bg-[#2a2a2a] text-white border border-gray-600"
                  />
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Assigned To</label>
                  <select
                    name="assigned_to"
                    value={newChannel.assigned_to}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 rounded bg-[#2a2a2a] text-white border border-gray-600"
                  >
                    <option value="">-- Select User --</option>
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  ➕ Add Channel
                </button>
              </form>

              {/* Channel List */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                    📋 <span>Existing Channels</span>
                  </h3>

                  {channels.length === 0 ? (
                    <p className="text-gray-400 italic text-sm">
                      No channels have been added yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {channels.map((ch: any) => {
                        const assignedUser = users.find((u: any) => u.id === ch.assigned_to);

                        return (
                          <li
                            key={ch.id}
                            className="flex justify-between items-center bg-[#242424] p-4 rounded-xl border border-gray-700 hover:border-gray-500 transition-all shadow-sm"
                          >
                            {/* Channel Info */}
                            <div className="flex flex-col">
                              <span className="text-gray-200 font-medium">
                                {ch.platform} - {ch.phone_number}
                              </span>
                              <span className="text-sm text-gray-400">
                                Assigned to:{" "}
                                <span className="text-gray-300 font-medium">
                                  {assignedUser?.name || "N/A"}
                                </span>
                              </span>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this Assigned Number?")) {
                                  handleDeleteLeadGen(ch.id);
                                }
                              }}
                              className="px-3 py-1 text-sm font-medium text-red-400 hover:text-red-200 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

            </div>
          )}

          {/* ✅ Lead Gen Members Tab */}
          {activeTab === "numbers" && (
            <div className="bg-[#2a2a2a] p-6 rounded-xl shadow-md mb-10">
              <h2 className="text-xl font-bold mb-4">
                👨‍💼 Add Lead Generation Members
              </h2>

              {/* Add Lead Gen Form */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={newLeadGen.name}
                  onChange={(e) =>
                    setNewLeadGen({ ...newLeadGen, name: e.target.value })
                  }
                  className="px-3 py-2 rounded bg-[#1e1e1e] border border-gray-600 text-white"
                />
                <input
                  type="text"
                  placeholder="Platform"
                  value={newLeadGen.platform}
                  onChange={(e) =>
                    setNewLeadGen({ ...newLeadGen, platform: e.target.value })
                  }
                  className="px-3 py-2 rounded bg-[#1e1e1e] border border-gray-600 text-white"
                />
                <input
                  type="text"
                  placeholder="Nature"
                  value={newLeadGen.nature}
                  onChange={(e) =>
                    setNewLeadGen({ ...newLeadGen, nature: e.target.value })
                  }
                  className="px-3 py-2 rounded bg-[#1e1e1e] border border-gray-600 text-white"
                />
                <button
                  onClick={handleAddLeadGen}
                  className="bg-blue-500 px-4 py-2 rounded text-white font-semibold"
                >
                  Add
                </button>
              </div>

              {/* Lead Gen List */}
              <ul className="space-y-2">
                {leadGens.map((lg) => (
                  <li
                    key={lg.id}
                    className="flex justify-between items-center bg-[#1e1e1e] px-4 py-2 rounded"
                  >
                    <span>
                      {lg.name} — {lg.platform || "N/A"} ({lg.nature || "N/A"})
                    </span>
                  {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this Lead Gen member?")) {
                          handleDeleteLeadGen(lg.id);
                        }
                      }}
                      className="px-3 py-1 text-sm font-medium text-red-400 hover:text-red-200 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}


        </div>
      </Layout>
    </>
  )
}
