import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'

export default function SetPassword() {
  const [supabase] = useState(() => createPagesBrowserClient())
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const prepareSession = async () => {
      if (!router.isReady) return

      const code = typeof router.query.code === 'string' ? router.query.code : null
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          toast.error('Invite link is invalid or expired. Please ask admin to resend it.')
          setCheckingSession(false)
          return
        }
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          toast.error('Invite link is invalid or expired. Please ask admin to resend it.')
          setCheckingSession(false)
          return
        }

        window.history.replaceState(null, '', window.location.pathname)
      }

      const { data } = await supabase.auth.getSession()
      setHasSession(Boolean(data.session))
      setCheckingSession(false)

      if (!data.session) {
        toast.error('Invite link is invalid or expired. Please ask admin to resend it.')
      }
    }

    prepareSession()
  }, [router.isReady, router.query.code, supabase])

  const handleSetPassword = async () => {
    if (!hasSession) {
      toast.error('Please open the latest invite email before setting your password.')
      return
    }

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password set successfully. Please log in.')
      await supabase.auth.signOut()
      router.push('/login')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1c1c1e] text-white">
      <div className="bg-[#2a2a2a] p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Set Your Password</h1>
        <p className="text-gray-400 mb-6 text-sm">
          Admin and users use the same login screen. Your role controls what you can access after login.
        </p>

        {checkingSession ? (
          <p className="mb-4 text-sm text-yellow-400">Checking invite link...</p>
        ) : !hasSession ? (
          <p className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-300">
            This invite link is invalid or expired. Please ask admin to resend the invite.
          </p>
        ) : null}

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
          disabled={loading || checkingSession || !hasSession}
          className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-black font-bold px-4 py-3 rounded-lg shadow"
        >
          {loading ? 'Setting...' : 'Set Password'}
        </button>
      </div>
    </div>
  )
}
