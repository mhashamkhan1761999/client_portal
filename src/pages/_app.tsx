import '../styles/globals.css';
import { useState } from 'react';
import { AppProps } from 'next/app';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';

export default function MyApp({ Component, pageProps }: AppProps) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  return (
    <>
      <SessionContextProvider
        supabaseClient={supabaseClient}
        initialSession={pageProps.initialSession}
      >
        <NotificationProvider>
        <AuthProvider>
          <Toaster position="top-right" richColors closeButton />
          <Component {...pageProps} />
        </AuthProvider>
        </NotificationProvider>
      </SessionContextProvider>
    </>
  );
}
