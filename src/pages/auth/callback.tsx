import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return

    const hash = window.location.hash || ''
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
    const queryType = typeof router.query.type === 'string' ? router.query.type : null
    const hashType = hashParams.get('type')
    const code = typeof router.query.code === 'string' ? router.query.code : null

    if (hashType === 'recovery' || hashParams.get('access_token')) {
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

    router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1c1c1e] text-white">
      <p className="text-sm text-gray-300">Opening password setup...</p>
    </div>
  )
}
