// pages/follow-ups.tsx
import Layout from '@/components/layout/Layout'
import AdminFollowUpsView from '@/components/AdminFollowUpsView'

export default function FollowUpsPage() {
  return (
    <Layout>
      <h1 className="text-3xl font-bold text-[#c29a4b] mb-6">📋 All Follow-ups</h1>
      <AdminFollowUpsView />
    </Layout>
  )
}
