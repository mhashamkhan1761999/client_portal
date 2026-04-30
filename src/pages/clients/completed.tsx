'use client'

import ClientTable from '@/components/clients/ClientTable'
import Layout from '@/components/layout/Layout'

export default function CompletedClientsPage() {
  return (
    <Layout>
    <ClientTable statusFilter="completed" />
    </Layout>
  )
}
