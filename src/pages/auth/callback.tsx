// pages/auth/callback.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import supabase from '@/lib/supabaseClient'

export default function AuthCallback() {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.substring(1))
    const type = params.get('type')

    if (type !== 'recovery') {
      router.push('/dashboard')
    }
  }, [])

  const handleSetPassword = async () => {
    setStatus('loading')
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      console.error('Failed to set password:', error)
      setStatus('error')
    } else {
      setStatus('success')
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4">
      <h1 className="text-2xl mb-4 font-semibold">Set Your New Password</h1>

      <input
        type="password"
        placeholder="New Password"
        className="p-2 text-black rounded mb-4 w-full max-w-sm"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleSetPassword}
        disabled={status === 'loading'}
        className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 px-6 rounded"
      >
        {status === 'loading' ? 'Setting Password...' : 'Set Password'}
      </button>

      {status === 'success' && <p className="mt-4 text-green-400">Password set! Redirecting...</p>}
      {status === 'error' && <p className="mt-4 text-red-400">Failed to set password. Try again.</p>}
    </div>
  )
}
