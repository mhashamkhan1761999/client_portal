import { useEffect } from 'react'
import { useRouter } from 'next/router'
import supabase from '@/lib/supabaseClient'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const redirectFromSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      router.replace(session ? '/dashboard' : '/login')
    }

    redirectFromSession()
  }, [router])

  return <div className="text-white">Loading...</div>
}
