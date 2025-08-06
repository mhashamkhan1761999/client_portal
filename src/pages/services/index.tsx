import { useState, useEffect } from 'react'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import Layout from '@/components/layout/Layout'

export default function ServicesPage() {
  const user = useUser()
  const supabase = useSupabaseClient()

  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    service_name: '',
    description: '',
    sold_price: '',
  })

  // Fetch services for the current user
  useEffect(() => {
    if (user) fetchServices()
  }, [user])

  const fetchServices = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('created_by', user?.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching services:', error.message)
    } else {
      setServices(data)
    }
    setLoading(false)
  }

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    if (!form.service_name || !form.sold_price) {
      alert('Service name and price are required')
      return
    }

    const { data, error } = await supabase.from('services').insert([
      {
        service_name: form.service_name,
        description: form.description,
        sold_price: parseInt(form.sold_price),
        created_by: user?.id,
      },
    ])

    if (error) {
      console.error('Error adding service:', error.message)
      alert('Failed to add service')
    } else {
      alert('Service added successfully')
      setForm({ service_name: '', description: '', sold_price: '' })
      fetchServices()
    }
  }

  return (
    <Layout>
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold mb-4">Manage Services</h1>

      {/* Add Service Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#222] p-4 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
      >
        <input
          type="text"
          name="service_name"
          placeholder="Service Name"
          value={form.service_name}
          onChange={handleChange}
          className="bg-[#333] text-white p-2 rounded"
          required
        />
        <input
          type="number"
          name="sold_price"
          placeholder="Price (USD)"
          value={form.sold_price}
          onChange={handleChange}
          className="bg-[#333] text-white p-2 rounded"
          required
        />
        <input
          type="text"
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          className="bg-[#333] text-white p-2 rounded"
        />
        <button
          type="submit"
          className="md:col-span-3 bg-blue-600 hover:bg-blue-500 p-2 rounded text-white"
        >
          Add Service
        </button>
      </form>

      {/* Services List */}
      <h2 className="text-xl font-semibold mb-2">Your Services</h2>
      {loading ? (
        <p>Loading...</p>
      ) : services.length === 0 ? (
        <p className="text-gray-400">No services found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-[#2a2a2a] p-4 rounded-lg shadow-md"
            >
              <h3 className="text-lg font-bold">{service.service_name}</h3>
              <p className="text-sm mt-1">{service.description || '—'}</p>
              <p className="text-md font-semibold mt-2">${service.sold_price}</p>
              <p className="text-xs text-gray-400 mt-1">
                Added on: {new Date(service.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
    </Layout>
  )
}
