'use client'

import ClientTable from '../../components/ClientTable'
import Layout from '../../components/Layout'

export default function CompletedClientsPage() {
  return (
    <Layout>
    <ClientTable statusFilter="completed" />
    </Layout>
  )
}