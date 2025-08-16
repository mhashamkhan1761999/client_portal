'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const access_token = searchParams.get('access_token') // Supabase passes automatically
  const type = searchParams.get('type') // Should be 'recovery'

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!access_token || type !== 'recovery') {
      toast.error('Invalid or expired reset link.')
    }
  }, [access_token, type])

  const handleResetPassword = async () => {
    if (!access_token) return toast.error('Invalid or expired reset link.')

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password }) // Uses token automatically

    if (error) toast.error(error.message)
    else {
      toast.success('Password updated successfully!')
      router.push('/login')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="p-6 bg-gray-800 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Reset Password</h2>

        <div className="mb-4 relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New Password"
            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-yellow-500"
          />
          <button
            type="button"
            className="absolute right-3 top-3 text-gray-300"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        <button
          onClick={handleResetPassword}
          disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 py-3 rounded-lg shadow"
        >
          {loading ? 'Updating...' : 'Reset Password'}
        </button>
      </div>
    </div>
  )
}
