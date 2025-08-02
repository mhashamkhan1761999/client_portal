import { useState } from 'react'
import { useRouter } from 'next/router'
import supabase from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard') // Redirect after successful login
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-2xl font-semibold">Login</h2>
        <input
          className="w-full p-2 bg-[#111] rounded border border-gray-600"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full p-2 bg-[#111] rounded border border-gray-600"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="bg-yellow-500 hover:bg-yellow-600 text-black w-full py-2 rounded"
        >
          Sign In
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  )
}
