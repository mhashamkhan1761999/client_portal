'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import supabase from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import AddSaleModal from '@/components/finance/AddSaleModal'
import {
  SALE_TYPES,
  calculatePaid,
  canCreateSale,
  canViewAllFinance,
  formatMoney,
  getSaleStatus,
} from '@/lib/finance'

type UserOption = {
  id: string
  name?: string
  sudo_name?: string
  role?: string
}

type ClientOption = {
  id: string
  client_name: string
}

type LeadGenOption = {
  id: string
  name: string
}

type CommissionSplit = {
  id: string
  recipient_user_id?: string | null
  lead_gen_id?: string | null
  role_on_sale: string
  commission_percent: number
  commission_amount: number
  recipient_user?: {
    name?: string
    sudo_name?: string
  } | null
  lead_gens?: {
    name?: string
  } | null
}

type SalePayment = {
  id: string
  amount_paid: number
  payment_date: string
  created_at?: string | null
  payment_method?: string | null
  payment_stage?: string | null
  commission_locked?: boolean | null
  invoice_number?: string | null
  paypal_transaction_id?: string | null
  note?: string | null
  sale_commission_splits?: CommissionSplit[]
}

type ClientSale = {
  id: string
  client_id: string
  seller_user_id: string
  sale_type: string
  total_amount: number
  currency: string
  sold_items: string
  invoice_number?: string | null
  sale_date: string
  status: string
  clients?: {
    client_name?: string
  } | null
  seller?: {
    name?: string
    sudo_name?: string
    role?: string
  } | null
  client_sale_payments?: SalePayment[]
}

type SalesLedgerProps = {
  clientId?: string
  clientName?: string
}

const personName = (user?: { name?: string; sudo_name?: string } | null) => user?.sudo_name || user?.name || 'Unknown'
const isMissingColumnError = (error: { code?: string; message?: string } | null, column: string) =>
  error?.code === '42703' && (error.message || '').includes(column)
const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : '-'

const salesSelect = (includePaymentStage: boolean, includeCommissionLock: boolean) => `
  id,
  client_id,
  seller_user_id,
  sale_type,
  total_amount,
  currency,
  sold_items,
  invoice_number,
  sale_date,
  status,
  clients:clients!client_sales_client_id_fkey(client_name),
  seller:users!client_sales_seller_user_id_fkey(name, sudo_name, role),
  client_sale_payments(
    id,
    amount_paid,
    payment_date,
    created_at,
    payment_method,
    ${includePaymentStage ? 'payment_stage,' : ''}
    ${includeCommissionLock ? 'commission_locked,' : ''}
    invoice_number,
    paypal_transaction_id,
    note,
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
`

export default function SalesLedger({ clientId, clientName }: SalesLedgerProps) {
  const { user } = useAuth()
  const [sales, setSales] = useState<ClientSale[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [leadGens, setLeadGens] = useState<LeadGenOption[]>([])
  const [loading, setLoading] = useState(false)
  const [showSaleForm, setShowSaleForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sellerFilter, setSellerFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('current_month')

  const canSeeAll = canViewAllFinance(user?.role)
  const canAddSale = canCreateSale(user?.role)

  const visibleSales = useMemo(() => {
    if (!user) return []
    if (canSeeAll) return sales
    return sales.filter((sale) => sale.seller_user_id === user.id)
  }, [canSeeAll, sales, user])

  const filteredSales = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const now = new Date()
    const currentMonth = now.toISOString().slice(0, 7)
    const lastQuarterStart = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const lastYearStart = new Date(now.getFullYear() - 1, now.getMonth(), 1)

    return visibleSales.filter((sale) => {
      const paid = calculatePaid(sale.client_sale_payments)
      const balance = Number(sale.total_amount || 0) - paid
      const computedStatus = getSaleStatus(Number(sale.total_amount || 0), paid)
      const saleDate = sale.sale_date ? new Date(sale.sale_date) : null
      const matchesStatus =
        statusFilter === 'all' ||
        computedStatus === statusFilter ||
        (statusFilter === 'balance_due' && balance > 0)
      const matchesSeller = sellerFilter === 'all' || sale.seller_user_id === sellerFilter
      const matchesDate =
        dateFilter === 'all' ||
        (dateFilter === 'current_month' && (sale.sale_date || '').startsWith(currentMonth)) ||
        (dateFilter === 'last_quarter' && Boolean(saleDate && saleDate >= lastQuarterStart)) ||
        (dateFilter === 'last_year' && Boolean(saleDate && saleDate >= lastYearStart))
      const matchesSearch =
        !normalizedSearch ||
        sale.sold_items.toLowerCase().includes(normalizedSearch) ||
        (sale.clients?.client_name || '').toLowerCase().includes(normalizedSearch) ||
        (sale.invoice_number || '').toLowerCase().includes(normalizedSearch) ||
        (sale.client_sale_payments || []).some((payment) =>
          (payment.invoice_number || '').toLowerCase().includes(normalizedSearch) ||
          (payment.paypal_transaction_id || '').toLowerCase().includes(normalizedSearch)
        )

      return matchesStatus && matchesSeller && matchesDate && matchesSearch
    })
  }, [dateFilter, searchTerm, sellerFilter, statusFilter, visibleSales])

  const ledgerStats = useMemo(() => {
    const total = filteredSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0)
    const paid = filteredSales.reduce((sum, sale) => sum + calculatePaid(sale.client_sale_payments), 0)
    const commission = canSeeAll ? filteredSales.reduce((sum, sale) => (
      sum + (sale.client_sale_payments || []).reduce((paymentSum, payment) => (
        paymentSum + (payment.sale_commission_splits || []).reduce(
          (splitSum, split) => splitSum + Number(split.commission_amount || 0),
          0
        )
      ), 0)
    ), 0) : 0

    return {
      total,
      paid,
      balance: Math.max(total - paid, 0),
      commission,
    }
  }, [canSeeAll, filteredSales])

  useEffect(() => {
    if (!user) return
    fetchOptions()
    fetchSales()
  }, [user, clientId])

  const fetchOptions = async () => {
    const [{ data: usersData }, { data: clientsData }, { data: leadGensData }] = await Promise.all([
      supabase.from('users').select('id, name, sudo_name, role').eq('is_active', true),
      supabase.from('clients').select('id, client_name').order('client_name', { ascending: true }),
      supabase.from('lead_gens').select('id, name').order('name', { ascending: true }),
    ])

    setUsers((usersData || []) as UserOption[])
    setClients((clientsData || []) as ClientOption[])
    setLeadGens((leadGensData || []) as LeadGenOption[])
  }

  const fetchSales = async () => {
    setLoading(true)

    const buildQuery = (includePaymentStage: boolean, includeCommissionLock: boolean) => {
      let nextQuery = supabase
        .from('client_sales')
        .select(salesSelect(includePaymentStage, includeCommissionLock))
        .order('sale_date', { ascending: false })

      if (clientId) nextQuery = nextQuery.eq('client_id', clientId)
      return nextQuery
    }

    let includePaymentStage = true
    let includeCommissionLock = true
    let { data, error } = await buildQuery(includePaymentStage, includeCommissionLock)

    for (let attempt = 0; attempt < 2 && error; attempt += 1) {
      if (isMissingColumnError(error, 'payment_stage')) includePaymentStage = false
      else if (isMissingColumnError(error, 'commission_locked')) includeCommissionLock = false
      else break

      ;({ data, error } = await buildQuery(includePaymentStage, includeCommissionLock))
    }

    if (error) {
      console.error('Error fetching sales:', error)
      toast.error('Could not load sales. Make sure finance SQL is installed in the test DB.')
      setSales([])
    } else {
      setSales((data || []) as unknown as ClientSale[])
    }

    setLoading(false)
  }

  const renderSaleDetails = (sale: ClientSale) => {
    const payments = sale.client_sale_payments || []
    const paid = calculatePaid(payments)
    const balance = Number(sale.total_amount || 0) - paid
    const commissionPaid = payments.reduce(
      (sum, payment) => sum + (payment.sale_commission_splits || []).reduce((splitSum, split) => splitSum + Number(split.commission_amount || 0), 0),
      0
    )
    return (
      <div className="mt-4 space-y-4">
        <div className={`grid gap-3 ${canSeeAll ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <MoneyStat label="Total" value={formatMoney(sale.total_amount, sale.currency)} />
          <MoneyStat label="Paid" value={formatMoney(paid, sale.currency)} />
          <MoneyStat label="Balance" value={formatMoney(Math.max(balance, 0), sale.currency)} />
          {canSeeAll && <MoneyStat label="Commission Paid" value={formatMoney(commissionPaid, sale.currency)} />}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-200">Payments</div>
            <Link href={`/finance/sales/${sale.id}`}>
              <button className="rounded bg-sky-700 px-3 py-1.5 text-xs text-white hover:bg-sky-600">
                Manage Payments
              </button>
            </Link>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500">No payments recorded yet.</p>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="rounded border border-slate-800 bg-[#101113] p-3">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-semibold text-white">{formatMoney(payment.amount_paid, sale.currency)}</span>
                  <span className="text-slate-400">
                    {formatDateTime(payment.created_at || payment.payment_date)} | {payment.payment_stage || 'upfront'} | Invoice: {payment.invoice_number || '-'} | TX: {payment.paypal_transaction_id || '-'}
                  </span>
                </div>
                {payment.note && <p className="mt-2 text-sm text-slate-400">{payment.note}</p>}

                {canSeeAll && <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap justify-between gap-2 rounded bg-[#161719] px-3 py-2 text-xs text-slate-300">
                    <span>Commission paid on this payment</span>
                    <span>{formatMoney((payment.sale_commission_splits || []).reduce((sum, split) => sum + Number(split.commission_amount || 0), 0), sale.currency)} {payment.commission_locked ? '(locked)' : '(open)'}</span>
                  </div>
                  {(payment.sale_commission_splits || []).map((split) => (
                    <div key={split.id} className="flex flex-wrap justify-between gap-2 rounded bg-[#161719] px-3 py-2 text-xs">
                      <span>{split.lead_gens?.name || personName(split.recipient_user)} ({split.role_on_sale})</span>
                      <span>{split.commission_percent}% - {formatMoney(split.commission_amount, sale.currency)}</span>
                    </div>
                  ))}
                </div>}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 text-white">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#c29a4b]">Sales Ledger</h2>
          {clientName && <p className="mt-1 text-sm text-slate-400">{clientName}</p>}
        </div>
        {canAddSale && clientId && (
          <button
            className="rounded bg-[#c29a4b] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500"
            onClick={() => setShowSaleForm((value) => !value)}
          >
            {showSaleForm ? 'Close' : 'Add Sale'}
          </button>
        )}
      </div>

      {clientId && (
        <AddSaleModal
          isOpen={showSaleForm}
          onClose={() => setShowSaleForm(false)}
          clientId={clientId}
          clientName={clientName}
          onSaved={fetchSales}
        />
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <MoneyStat label="Ledger Total" value={formatMoney(ledgerStats.total)} />
        <MoneyStat label="Received" value={formatMoney(ledgerStats.paid)} />
        <MoneyStat label="Balance" value={formatMoney(ledgerStats.balance)} />
        {canSeeAll && <MoneyStat label="Commission" value={formatMoney(ledgerStats.commission)} />}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-[#161719] p-3 md:flex-row md:items-center">
        <input
          className="min-w-0 flex-1 rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm"
          placeholder="Search client, sold item, invoice, transaction..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select
          className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="partially_paid">Partially paid</option>
          <option value="paid">Paid</option>
          <option value="balance_due">Balance due</option>
        </select>
        {canSeeAll && (
          <select
            className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm"
            value={sellerFilter}
            onChange={(event) => setSellerFilter(event.target.value)}
          >
            <option value="all">All sales people</option>
            {users.filter((item) => ['seller', 'upseller', 'sales_head', 'admin'].includes(item.role || '')).map((item) => (
              <option key={item.id} value={item.id}>{personName(item)}</option>
            ))}
          </select>
        )}
        <select
          className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
        >
          <option value="current_month">Current month</option>
          <option value="last_quarter">Last quarter</option>
          <option value="last_year">Last year</option>
          <option value="all">All dates</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-800 bg-[#161719] p-4 text-sm text-slate-400">Loading sales...</div>
      ) : filteredSales.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-[#161719] p-4 text-sm text-slate-400">No visible sales yet.</div>
      ) : (
        <div className="space-y-4">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="rounded-lg border border-slate-800 bg-[#161719] p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{sale.clients?.client_name || clientName || 'Client'}</div>
                  <div className="mt-1 text-sm text-slate-400">{sale.sold_items}</div>
                  {sale.invoice_number && <div className="mt-2 text-xs text-slate-500">Sale invoice: {sale.invoice_number}</div>}
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold text-[#c29a4b]">{SALE_TYPES.find((item) => item.value === sale.sale_type)?.label || sale.sale_type}</div>
                  <div className="text-slate-400">{sale.sale_date} | {sale.status}</div>
                  <div className="text-slate-400">Seller: {personName(sale.seller)}</div>
                </div>
              </div>
              {renderSaleDetails(sale)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MoneyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-800 bg-[#101113] p-3">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-white">{value}</div>
    </div>
  )
}
