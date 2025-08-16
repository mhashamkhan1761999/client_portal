import { GetServerSidePropsContext } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default function Home() {
  return null; // nothing to render because we redirect
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const supabase = createPagesServerClient(ctx);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // Not logged in → go to login
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Logged in → go to dashboard
  return {
    redirect: {
      destination: '/dashboard',
      permanent: false,
    },
  };
}
