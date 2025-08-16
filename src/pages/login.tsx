'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Login handler (works on Enter key)
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email || !password) return toast.error('Please fill in both fields')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('❌ ' + error.message)
    } else {
      toast.success('✅ Logged in successfully')
      router.push('/dashboard')
    }

    setLoading(false)
  }

  // Forgot password
  const handleForgotPassword = async () => {
    if (!email) return toast.error('Please enter your email.')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/login', // redirect to login after email click
    })

    if (error) toast.error(error.message)
    else toast.success('Password reset email sent! Check your inbox.')

    setLoading(false)
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#1c1c1e] text-white">
      {/* Right - Hero Panel */}
      <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-yellow-600/30 to-[#111] text-center p-10">
        <h2 className="text-4xl font-bold mb-4 leading-tight">
          Your Creative World<br />Starts Here.
        </h2>
        <p className="text-gray-300 text-lg max-w-md">
          Manage users, services, and grow your design agency faster with MetaMalistic’s internal tools.
        </p>
      </div>

      {/* Left - Login Form */}
      <div className="flex flex-col justify-center px-10 py-16 md:px-20">
        <h1 className="text-3xl font-bold mb-6">👋 Welcome Back</h1>
        <p className="mb-8 text-gray-400">Login to access your workspace.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="mb-2 w-full p-3 rounded-lg bg-[#111] border border-gray-600 focus:ring-2 focus:ring-yellow-500"
            required
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 rounded-lg bg-[#111] border border-gray-600 focus:ring-2 focus:ring-yellow-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-300"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 py-3 rounded-lg shadow w-full"
          >
            {loading ? 'Logging in...' : '🔐 Login'}
          </button>
        </form>

        {/* <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Forgot Password?</h2>
          <p className="text-gray-400 mb-2">Enter your email to receive a reset link:</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 p-2 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-yellow-500"
            />
            <button
              onClick={handleForgotPassword}
              disabled={loading}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-4 py-2 rounded-lg"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div> */}
      </div>
    </div>
  )
}
