// pages/set-password.tsx
'use client'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { useRouter } from 'next/router'

export default function SetPasswordPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const handleMagicLink = async () => {
      const { error } = await supabase.auth.getSession()

      if (error) {
        console.error('Failed to get session:', error)
        return
      }

      // Optional: Redirect to dashboard or home
      router.replace('/dashboard') // or wherever you want
    }

    handleMagicLink()
  }, [])

  return (
    <div className="h-screen flex items-center justify-center bg-[#1c1c1e] text-white">
      <div className="text-center">
        <h1 className="text-2xl mb-4">🔐 Logging you in...</h1>
        <p className="text-gray-400">Please wait while we verify your session.</p>
      </div>
    </div>
  )
}
