'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { calculatePaid, canViewAllFinance, formatMoney } from '@/lib/finance'

type CommissionSplit = {
  id: string
  recipient_user_id?: string | null
  lead_gen_id?: string | null
  role_on_sale?: string | null
  commission_percent?: number
  commission_amount: number
  recipient_user?: { name?: string; sudo_name?: string } | null
  lead_gens?: { name?: string } | null
}

type SalePayment = {
  id: string
  amount_paid: number
  payment_date: string
  created_at?: string | null
  invoice_number?: string | null
  paypal_transaction_id?: string | null
  sale_commission_splits?: CommissionSplit[]
}

type FinanceSale = {
  id: string
  seller_user_id: string
  total_amount: number
  currency: string
  sale_date: string
  status: string
  clients?: { client_name?: string } | null
  seller?: { name?: string; sudo_name?: string } | null
  client_sale_payments?: SalePayment[]
}

const monthKey = (date: Date) => date.toISOString().slice(0, 7)
const personName = (person?: { name?: string; sudo_name?: string } | null) => person?.sudo_name || person?.name || 'Unknown'
const toDateInput = (date: Date) => date.toISOString().slice(0, 10)
const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : '-'

export default function FinanceAnalytics() {
  const { user } = useAuth()
  const [sales, setSales] = useState<FinanceSale[]>([])
  const [loading, setLoading] = useState(true)
  const [periodFilter, setPeriodFilter] = useState('current_month')
  const [customStart, setCustomStart] = useState(toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [customEnd, setCustomEnd] = useState(toDateInput(new Date()))
  const [commissionPersonFilter, setCommissionPersonFilter] = useState('all')

  const canSeeAll = canViewAllFinance(user?.role)

  useEffect(() => {
    if (!user) return
    fetchSales()
  }, [user])

  const fetchSales = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('client_sales')
      .select(`
        id,
        seller_user_id,
        total_amount,
        currency,
        sale_date,
        status,
        clients:clients!client_sales_client_id_fkey(client_name),
        seller:users!client_sales_seller_user_id_fkey(name, sudo_name),
        client_sale_payments(
          id,
          amount_paid,
          payment_date,
          created_at,
          invoice_number,
          paypal_transaction_id,
          sale_commission_splits(
            id,
            recipient_user_id,
            lead_gen_id,
            role_on_sale,
            commission_percent,
            commission_amount,
            recipient_user:users!sale_commission_splits_recipient_user_id_fkey(name, sudo_name),
            lead_gens:lead_gens!sale_commission_splits_lead_gen_id_fkey(name)
          )
        )
      `)
      .order('sale_date', { ascending: false })

    if (error) {
      console.error('Error fetching finance analytics:', error)
      toast.error('Could not load finance analytics. Please check finance table policies.')
      setSales([])
    } else {
      setSales((data || []) as FinanceSale[])
    }
    setLoading(false)
  }

  const visibleSales = useMemo(() => {
    if (!user) return []
    if (canSeeAll) return sales
    return sales.filter((sale) => {
      if (sale.seller_user_id === user.id) return true
      return (sale.client_sale_payments || []).some((payment) =>
        (payment.sale_commission_splits || []).some((split) => split.recipient_user_id === user.id)
      )
    })
  }, [canSeeAll, sales, user])

  const selectedSales = visibleSales.filter((sale) => {
    const now = new Date()
    const saleDate = sale.sale_date ? new Date(sale.sale_date) : null
    if (!saleDate) return false
    if (periodFilter === 'current_month') return (sale.sale_date || '').startsWith(monthKey(now))
    if (periodFilter === 'last_quarter') return saleDate >= new Date(now.getFullYear(), now.getMonth() - 3, 1)
    if (periodFilter === 'last_year') return saleDate >= new Date(now.getFullYear() - 1, now.getMonth(), 1)
    if (periodFilter === 'custom') return (sale.sale_date || '') >= customStart && (sale.sale_date || '') <= customEnd
    return true
  })
  const selectedPayments = selectedSales.flatMap((sale) =>
    (sale.client_sale_payments || []).map((payment) => ({ ...payment, sale }))
  )
  const commissionRows = selectedPayments.flatMap((payment) =>
    (payment.sale_commission_splits || []).map((split) => ({ ...split, payment }))
  )
  const filteredCommissionRows = commissionRows.filter((row) => {
    const key = row.lead_gen_id ? `lead:${row.lead_gen_id}` : `user:${row.recipient_user_id || 'unknown'}`
    return commissionPersonFilter === 'all' || commissionPersonFilter === key
  })
  const commissionPeople = Object.values(
    commissionRows.reduce<Record<string, { key: string; name: string; total: number; count: number }>>((acc, row) => {
      const key = row.lead_gen_id ? `lead:${row.lead_gen_id}` : `user:${row.recipient_user_id || 'unknown'}`
      if (!acc[key]) {
        acc[key] = {
          key,
          name: row.lead_gens?.name || personName(row.recipient_user),
          total: 0,
          count: 0,
        }
      }
      acc[key].total += Number(row.commission_amount || 0)
      acc[key].count += 1
      return acc
    }, {})
  ).sort((a, b) => b.total - a.total)

  const totalSales = selectedSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0)
  const totalPaid = selectedSales.reduce((sum, sale) => sum + calculatePaid(sale.client_sale_payments), 0)
  const totalBalance = Math.max(totalSales - totalPaid, 0)
  const totalCommission = selectedPayments.reduce(
    (sum, payment) => sum + (payment.sale_commission_splits || []).reduce((splitSum, split) => splitSum + Number(split.commission_amount || 0), 0),
    0
  )

  const sellerBreakdown = Object.values(
    selectedSales.reduce<Record<string, { seller: string; sales: number; paid: number; count: number }>>((acc, sale) => {
      const key = sale.seller_user_id
      if (!acc[key]) acc[key] = { seller: personName(sale.seller), sales: 0, paid: 0, count: 0 }
      acc[key].sales += Number(sale.total_amount || 0)
      acc[key].paid += calculatePaid(sale.client_sale_payments)
      acc[key].count += 1
      return acc
    }, {})
  ).sort((a, b) => b.paid - a.paid)

  if (loading) {
    return <div className="rounded-lg border border-slate-800 bg-[#161719] p-5 text-sm text-slate-400">Loading finance analytics...</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-[#161719] p-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Finance Overview</h2>
          <p className="mt-1 text-sm text-slate-400">Monthly sales, collected amount, open balance, and commission exposure.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm text-slate-300">
            Period
            <select
              className="mt-1 block rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm text-white"
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
            >
              <option value="current_month">Current month</option>
              <option value="last_quarter">Last quarter</option>
              <option value="last_year">Last year</option>
              <option value="custom">Custom</option>
              <option value="all">All dates</option>
            </select>
          </label>
          {periodFilter === 'custom' && (
            <>
              <input className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm text-white" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              <input className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm text-white" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <FinanceStat label="Total Sales" value={formatMoney(totalSales)} />
        <FinanceStat label="Received" value={formatMoney(totalPaid)} />
        <FinanceStat label="Balance" value={formatMoney(totalBalance)} />
        <FinanceStat label="Commission" value={formatMoney(totalCommission)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <section className="rounded-lg border border-slate-800 bg-[#161719] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-slate-400">Seller Breakdown</h3>
          {sellerBreakdown.length === 0 ? (
            <p className="text-sm text-slate-500">No sales for this month.</p>
          ) : (
            <div className="space-y-2">
              {sellerBreakdown.map((item) => (
                <div key={item.seller} className="grid grid-cols-[1fr_auto] gap-3 rounded border border-slate-800 bg-[#101113] p-3 text-sm">
                  <div>
                    <div className="font-semibold text-white">{item.seller}</div>
                    <div className="text-xs text-slate-500">{item.count} sale{item.count === 1 ? '' : 's'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#c29a4b]">{formatMoney(item.paid)}</div>
                    <div className="text-xs text-slate-500">of {formatMoney(item.sales)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-800 bg-[#161719] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-slate-400">Recent Payments</h3>
          {selectedPayments.length === 0 ? (
            <p className="text-sm text-slate-500">No payments for this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Client</th>
                    <th className="pb-2">Seller</th>
                    <th className="pb-2">PayPal Invoice</th>
                    <th className="pb-2 text-right">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedPayments.slice(0, 8).map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-2 text-slate-400">{formatDateTime(payment.created_at || payment.payment_date)}</td>
                      <td className="py-2 text-white">{payment.sale.clients?.client_name || 'Client'}</td>
                      <td className="py-2 text-slate-300">{personName(payment.sale.seller)}</td>
                      <td className="py-2 text-slate-400">{payment.invoice_number || payment.paypal_transaction_id || '-'}</td>
                      <td className="py-2 text-right text-[#c29a4b]">{formatMoney(payment.amount_paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {canSeeAll && (
        <section className="rounded-lg border border-slate-800 bg-[#161719] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-slate-400">Commission Drill-down</h3>
          {commissionRows.length === 0 ? (
            <p className="text-sm text-slate-500">No commissions for this period.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 md:grid-cols-3">
                <button
                  className={`rounded border px-3 py-2 text-left text-sm ${commissionPersonFilter === 'all' ? 'border-sky-500 bg-sky-500/15 text-sky-200' : 'border-slate-800 bg-[#101113] text-slate-300'}`}
                  onClick={() => setCommissionPersonFilter('all')}
                >
                  <span className="block text-xs uppercase text-slate-500">All People</span>
                  <span className="font-semibold">{formatMoney(totalCommission)}</span>
                </button>
                {commissionPeople.map((person) => (
                  <button
                    key={person.key}
                    className={`rounded border px-3 py-2 text-left text-sm ${commissionPersonFilter === person.key ? 'border-sky-500 bg-sky-500/15 text-sky-200' : 'border-slate-800 bg-[#101113] text-slate-300'}`}
                    onClick={() => setCommissionPersonFilter(person.key)}
                  >
                    <span className="block font-semibold text-white">{person.name}</span>
                    <span className="text-xs text-slate-500">{person.count} commission row{person.count === 1 ? '' : 's'}</span>
                    <span className="block text-[#c29a4b]">{formatMoney(person.total)}</span>
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="pb-2">Recipient</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2">Date / Time</th>
                    <th className="pb-2">Client</th>
                    <th className="pb-2">Seller</th>
                    <th className="pb-2 text-right">Commission</th>
                    <th className="pb-2 text-right">Sale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredCommissionRows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 text-white">{row.lead_gens?.name || personName(row.recipient_user)}</td>
                      <td className="py-2 text-slate-400">{row.role_on_sale || '-'}</td>
                      <td className="py-2 text-slate-400">{formatDateTime(row.payment.created_at || row.payment.payment_date)}</td>
                      <td className="py-2 text-slate-300">{row.payment.sale.clients?.client_name || 'Client'}</td>
                      <td className="py-2 text-slate-400">{personName(row.payment.sale.seller)}</td>
                      <td className="py-2 text-right text-[#c29a4b]">{formatMoney(row.commission_amount)}</td>
                      <td className="py-2 text-right">
                        <Link className="text-sky-300 hover:text-sky-200" href={`/finance/sales/${row.payment.sale.id}`}>
                          Open sale
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function FinanceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#161719] p-4">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
    </div>
  )
}
