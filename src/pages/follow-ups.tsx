// pages/follow-ups.tsx
import Layout from '@/components/layout/Layout'
import AllFollowUpsView from '@/components/AllFollowUpsView'
import { Toaster } from 'react-hot-toast';

export default function FollowUpsPage() {
  return (
    <Layout>
      <Toaster position="top-right" reverseOrder={false} />
      <h1 className="text-3xl font-bold text-[#c29a4b] mb-6">📋 All Follow-ups</h1>
      <AllFollowUpsView />
    </Layout>
  )
}
