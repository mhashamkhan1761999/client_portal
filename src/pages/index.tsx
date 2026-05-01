import { useEffect } from 'react'
import { useRouter } from 'next/router'
import supabase from '@/lib/supabaseClient'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const redirectFromSession = async () => {
      const hash = window.location.hash || ''
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
      const queryType = typeof router.query.type === 'string' ? router.query.type : null
      const code = typeof router.query.code === 'string' ? router.query.code : null

      if (hashParams.get('type') === 'recovery' || hashParams.get('access_token')) {
        router.replace(`/set-password${hash}`)
        return
      }

      if (queryType === 'recovery' || code) {
        const query = new URLSearchParams()
        if (code) query.set('code', code)
        if (queryType) query.set('type', queryType)
        router.replace(`/set-password?${query.toString()}`)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      router.replace(session ? '/dashboard' : '/login')
    }

    redirectFromSession()
  }, [router])

  return <div className="text-white">Loading...</div>
}
