import { useState } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  const handleSetPassword = async () => {
    if (!password || password.length < 6) {
      toast.error('❌ Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      toast.error('❌ Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error('❌ ' + error.message)
    } else {
      toast.success('✅ Password set successfully')
      router.push('/login')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1c1c1e] text-white">
      <div className="bg-[#2a2a2a] p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">🔒 Set Your Password</h1>
        <p className="text-gray-400 mb-6 text-sm">
          Please set a password for your account. You’ll use this to log in next time.
        </p>

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-3 rounded-lg bg-[#111] border border-gray-600 focus:ring-2 focus:ring-yellow-500"
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full mb-6 p-3 rounded-lg bg-[#111] border border-gray-600 focus:ring-2 focus:ring-yellow-500"
        />

        <button
          onClick={handleSetPassword}
          disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-4 py-3 rounded-lg shadow"
        >
          {loading ? 'Setting...' : '✅ Set Password'}
        </button>
      </div>
    </div>
  )
}
