'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('❌ ' + error.message)
    } else {
      toast.success('✅ Logged in successfully')
      router.push('/dashboard') // or wherever
    }

    setLoading(false)
  }

  // Add this function on your Login Page
  const handleForgotPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/auth/callback',
    })

    if (error) {
      console.error('Error sending recovery email:', error.message)
      alert('Failed to send reset email.')
    } else {
      alert('Password reset email sent! Check your inbox.')
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#1c1c1e] text-white">
       {/* Right - Hero Panel */}
      <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-yellow-600/30 to-[#111] text-center p-10">
        <h2 className="text-4xl font-bold mb-4 leading-tight">
          Your Creative World<br />
          Starts Here.
        </h2>
        <p className="text-gray-300 text-lg max-w-md">
          Manage users, services, and grow your design agency faster with MetaMalistic’s internal tools.
        </p>
      </div>
      {/* Left - Login Form */}
      <div className="flex flex-col justify-center px-10 py-16 md:px-20">
        <h1 className="text-3xl font-bold mb-6">👋 Welcome Back</h1>
        <p className="mb-8 text-gray-400">Login to access your workspace.</p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="mb-4 w-full p-3 rounded-lg bg-[#111] border border-gray-600 focus:ring-2 focus:ring-yellow-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mb-4 w-full p-3 rounded-lg bg-[#111] border border-gray-600 focus:ring-2 focus:ring-yellow-500"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 py-3 rounded-lg shadow"
        >
          {loading ? 'Logging in...' : '🔐 Login'}
        </button>
      </div>

     
    </div>
  )
}
