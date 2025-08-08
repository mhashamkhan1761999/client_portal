import '../styles/globals.css';
// src/pages/_app.tsx
import { useState } from 'react'
import { AppProps } from 'next/app'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Toaster } from 'sonner';

export default function MyApp({ Component, pageProps }: AppProps) {
  const [supabaseClient] = useState(() => createPagesBrowserClient())

  return (
    <>
    <Toaster position="top-right" richColors closeButton /> {/* ✅ Required for sonner */}
    
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
    </SessionContextProvider>
  
    </>
  )
}