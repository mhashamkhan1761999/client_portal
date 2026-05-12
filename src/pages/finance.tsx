import Layout from '@/components/layout/Layout'
import SalesLedger from '@/components/finance/SalesLedger'
import FinanceAnalytics from '@/components/finance/FinanceAnalytics'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'

const financeRoles = ['admin', 'sales_head', 'seller', 'upseller', 'nurturer']
type FinanceTab = 'overview' | 'ledger'

export default function FinancePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview')
  const hasAccess = Boolean(user?.role && financeRoles.includes(user.role))

  return (
    <Layout>
      <div className="mx-auto mt-6 max-w-7xl space-y-5 text-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#c29a4b]">Finance</h1>
            <p className="mt-2 text-sm text-slate-400">
              Sales archive, PayPal payments, balances, and commission tracking.
            </p>
          </div>
        </div>

        {!hasAccess ? (
          <div className="rounded-lg border border-slate-800 bg-[#1c1c1e] p-6">
            <h2 className="text-lg font-semibold">Access restricted</h2>
            <p className="mt-2 text-sm text-slate-400">
              Finance records are visible only to approved sales and management roles.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'ledger', label: 'Sales Ledger' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`rounded border px-4 py-2 text-sm transition ${
                    activeTab === tab.id
                      ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                      : 'border-slate-700 bg-[#101113] text-slate-300 hover:border-slate-500'
                  }`}
                  onClick={() => setActiveTab(tab.id as FinanceTab)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && <FinanceAnalytics />}
            {activeTab === 'ledger' && <SalesLedger />}
          </>
        )}
      </div>
    </Layout>
  )
}
