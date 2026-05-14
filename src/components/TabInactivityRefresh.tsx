'use client'

import { useEffect } from 'react'

const HIDDEN_AT_KEY = 'portal-tab-hidden-at'
const INACTIVITY_RELOAD_MS = 10 * 60 * 1000

export default function TabInactivityRefresh() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        window.sessionStorage.setItem(HIDDEN_AT_KEY, String(Date.now()))
        return
      }

      if (document.visibilityState !== 'visible') return

      const hiddenAt = Number(window.sessionStorage.getItem(HIDDEN_AT_KEY) || 0)
      window.sessionStorage.removeItem(HIDDEN_AT_KEY)

      if (hiddenAt && Date.now() - hiddenAt >= INACTIVITY_RELOAD_MS) {
        window.location.reload()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null
}
