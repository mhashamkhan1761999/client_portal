import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Layout from '@/components/layout/Layout'
import supabase from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import {
  COMMISSION_ROLES,
  SALE_TYPES,
  calculatePaid,
  canRecordPayment,
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
  note?: string | null
  recipient_user?: { name?: string; sudo_name?: string } | null
  lead_gens?: { name?: string } | null
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
  clients?: { client_name?: string } | null
  seller?: { name?: string; sudo_name?: string; role?: string } | null
  client_sale_payments?: SalePayment[]
}

const today = () => new Date().toISOString().slice(0, 10)
const personName = (person?: { name?: string; sudo_name?: string } | null) => person?.sudo_name || person?.name || 'Unknown'
const isMissingColumnError = (error: { code?: string; message?: string } | null, column: string) =>
  error?.code === '42703' && (error.message || '').includes(column)
const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : '-'

const saleSelect = (includePaymentStage: boolean, includeCommissionLock: boolean) => `
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
      note,
      recipient_user:users!sale_commission_splits_recipient_user_id_fkey(name, sudo_name),
      lead_gens:lead_gens!sale_commission_splits_lead_gen_id_fkey(name)
    )
  )
`

export default function SalePaymentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { saleId } = router.query
  const [sale, setSale] = useState<ClientSale | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [leadGens, setLeadGens] = useState<LeadGenOption[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: today(),
    stage: 'upfront',
    invoice: '',
    transaction: '',
    note: '',
  })
  const [splitForms, setSplitForms] = useState<Record<string, { recipientUserId: string; leadGenId: string; role: string; percent: string; note: string }>>({})

  const canSeeAll = canViewAllFinance(user?.role)
  const canAddPayment = canRecordPayment(user?.role)
  const payments = sale?.client_sale_payments || []
  const paid = calculatePaid(payments)
  const balance = Math.max(Number(sale?.total_amount || 0) - paid, 0)

  const canViewSale = useMemo(() => {
    if (!user || !sale) return false
    if (canSeeAll || sale.seller_user_id === user.id) return true
    return false
  }, [canSeeAll, sale, user])

  useEffect(() => {
    if (!router.isReady || !saleId || typeof saleId !== 'string' || !user) return
    fetchSale(saleId)
    fetchOptions()
  }, [router.isReady, saleId, user])

  const fetchOptions = async () => {
    const [{ data: usersData }, { data: leadGensData }] = await Promise.all([
      supabase.from('users').select('id, name, sudo_name, role').eq('is_active', true),
      supabase.from('lead_gens').select('id, name').order('name', { ascending: true }),
    ])

    setUsers((usersData || []) as UserOption[])
    setLeadGens((leadGensData || []) as LeadGenOption[])
  }

  const fetchSale = async (id: string) => {
    setLoading(true)
    const buildQuery = (includePaymentStage: boolean, includeCommissionLock: boolean) =>
      supabase
        .from('client_sales')
        .select(saleSelect(includePaymentStage, includeCommissionLock))
        .eq('id', id)
        .single()

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
      console.error(error)
      toast.error('Could not load sale payment view.')
      setSale(null)
    } else {
      setSale(data as unknown as ClientSale)
    }
    setLoading(false)
  }

  const handleAddPayment = async () => {
    if (!user || !sale || !canAddPayment) return
    if (!paymentForm.amount) return toast.error('Payment amount is required.')

    const amount = Number(paymentForm.amount)
    if (amount <= 0) return toast.error('Payment amount must be greater than zero.')

    const paymentPayload = {
      sale_id: sale.id,
      amount_paid: amount,
      payment_date: paymentForm.date || today(),
      payment_method: 'paypal',
      invoice_number: paymentForm.invoice.trim() || null,
      paypal_transaction_id: paymentForm.transaction.trim() || null,
      note: paymentForm.note.trim() || null,
      added_by: user.id,
    }

    let { error } = await supabase.from('client_sale_payments').insert({
      ...paymentPayload,
      payment_stage: paymentForm.stage,
    })

    if (isMissingColumnError(error, 'payment_stage')) {
      ;({ error } = await supabase.from('client_sale_payments').insert(paymentPayload))
    }

    if (error) {
      console.error(error)
      toast.error('Failed to add payment.')
      return
    }

    const nextStatus = getSaleStatus(Number(sale.total_amount), paid + amount)
    await supabase.from('client_sales').update({ status: nextStatus }).eq('id', sale.id)
    await supabase.from('status_logs').insert({
      client_id: sale.client_id,
      previous_status: sale.status || null,
      new_status: nextStatus,
      changed_by: user.id,
      affected_user: sale.seller_user_id,
      action_type: 'payment_added',
      note: `Recorded ${paymentForm.stage} payment of ${formatMoney(amount, sale.currency)}${paymentForm.invoice.trim() ? ` | Invoice: ${paymentForm.invoice.trim()}` : ''}${paymentForm.transaction.trim() ? ` | Transaction: ${paymentForm.transaction.trim()}` : ''}${paymentForm.note.trim() ? `. Comment: ${paymentForm.note.trim()}` : ''}`,
    })

    toast.success('Payment recorded.')
    setPaymentForm({ amount: '', date: today(), stage: 'upfront', invoice: '', transaction: '', note: '' })
    fetchSale(sale.id)
  }

  const handleAddSplit = async (payment: SalePayment) => {
    if (!user || !sale || !canAddPayment) return
    const currentSale = sale
    if (payment.commission_locked) {
      toast.error('Commission is locked. Edit existing splits only.')
      return
    }
    const form = splitForms[payment.id]
    const isLeadGenSplit = form?.role === 'lead_gen'
    const hasRecipient = isLeadGenSplit ? Boolean(form?.leadGenId) : Boolean(form?.recipientUserId)
    if (!hasRecipient || !form.percent) return toast.error('Recipient and percent are required.')

    const percent = Number(form.percent)
    if (percent < 0) return toast.error('Percent cannot be negative.')

    const amount = Number(((Number(payment.amount_paid) * percent) / 100).toFixed(2))
    const { error } = await supabase.from('sale_commission_splits').insert({
      payment_id: payment.id,
      recipient_user_id: isLeadGenSplit ? null : form.recipientUserId,
      lead_gen_id: isLeadGenSplit ? form.leadGenId : null,
      role_on_sale: form.role || 'helper',
      commission_percent: percent,
      commission_amount: amount,
      added_by: user.id,
      note: form.note.trim() || null,
    })

    if (error) {
      console.error(error)
      toast.error('Failed to add commission split.')
      return
    }

    toast.success('Commission split added.')
    await supabase.from('status_logs').insert({
      client_id: currentSale.client_id,
      previous_status: currentSale.status || null,
      new_status: currentSale.status || null,
      changed_by: user.id,
      affected_user: isLeadGenSplit ? null : form.recipientUserId,
      action_type: 'commission_split_added',
      note: `Added commission split: ${percent}% (${formatMoney(amount, currentSale.currency)}) for payment ${formatMoney(payment.amount_paid, currentSale.currency)}${form.note.trim() ? `. Comment: ${form.note.trim()}` : ''}`,
    })
    setSplitForms((prev) => ({ ...prev, [payment.id]: { recipientUserId: '', leadGenId: '', role: 'helper', percent: '', note: '' } }))
    if (typeof saleId === 'string') fetchSale(saleId)
  }

  const handleLockCommission = async (payment: SalePayment) => {
    if (!user || !sale || !canAddPayment) return
    const currentSale = sale
    if ((payment.sale_commission_splits || []).length === 0) return toast.error('Add at least one split before locking commission.')

    const { error } = await supabase
      .from('client_sale_payments')
      .update({ commission_locked: true })
      .eq('id', payment.id)

    if (error) {
      console.error(error)
      toast.error('Could not lock commission. Run the commission lock SQL in test DB first.')
      return
    }

    toast.success('Commission locked. You can still edit existing splits.')
    await supabase.from('status_logs').insert({
      client_id: currentSale.client_id,
      previous_status: currentSale.status || null,
      new_status: currentSale.status || null,
      changed_by: user.id,
      affected_user: currentSale.seller_user_id,
      action_type: 'commission_locked',
      note: `Locked commission for payment ${formatMoney(payment.amount_paid, currentSale.currency)}`,
    })
    if (typeof saleId === 'string') fetchSale(saleId)
  }

  const handleEditSplit = async (payment: SalePayment, split: CommissionSplit) => {
    if (!user || !sale || !canAddPayment) return
    const currentSale = sale

    const nextPercentText = window.prompt('Update commission percent', String(split.commission_percent || 0))
    if (nextPercentText === null) return

    const nextPercent = Number(nextPercentText)
    if (Number.isNaN(nextPercent) || nextPercent < 0) {
      toast.error('Enter a valid commission percent.')
      return
    }

    const nextAmount = Number(((Number(payment.amount_paid) * nextPercent) / 100).toFixed(2))
    const { error } = await supabase
      .from('sale_commission_splits')
      .update({
        commission_percent: nextPercent,
        commission_amount: nextAmount,
      })
      .eq('id', split.id)

    if (error) {
      console.error(error)
      toast.error('Failed to update commission.')
      return
    }

    toast.success('Commission updated.')
    await supabase.from('status_logs').insert({
      client_id: currentSale.client_id,
      previous_status: currentSale.status || null,
      new_status: currentSale.status || null,
      changed_by: user.id,
      affected_user: split.recipient_user_id || null,
      action_type: 'commission_split_updated',
      note: `Updated commission split from ${split.commission_percent}% to ${nextPercent}% (${formatMoney(nextAmount, currentSale.currency)})`,
    })
    if (typeof saleId === 'string') fetchSale(saleId)
  }

  const commissionUsers = users.filter((item) => item.role !== 'admin')
  const totalCommission = payments.reduce(
    (sum, payment) => sum + (payment.sale_commission_splits || []).reduce((splitSum, split) => splitSum + Number(split.commission_amount || 0), 0),
    0
  )

  if (loading) {
    return <Layout><div className="mt-6 text-sm text-slate-400">Loading sale...</div></Layout>
  }

  if (!sale || !canViewSale) {
    return (
      <Layout>
        <div className="mt-6 rounded-lg border border-slate-800 bg-[#161719] p-6 text-white">
          <h1 className="text-xl font-semibold">Sale not available</h1>
          <p className="mt-2 text-sm text-slate-400">This sale either does not exist or your role cannot view it.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto mt-6 max-w-6xl space-y-5 text-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#c29a4b]">Payment Record</h1>
            <p className="mt-1 text-sm text-slate-400">{sale.clients?.client_name || 'Client'} | Seller: {personName(sale.seller)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/clients/${sale.client_id}`}>
              <button className="rounded bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600">Open Client</button>
            </Link>
            <Link href="/finance">
              <button className="rounded bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600">Finance</button>
            </Link>
          </div>
        </div>

        <section className="rounded-lg border border-slate-800 bg-[#161719] p-4">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <div className="text-sm uppercase text-slate-500">{SALE_TYPES.find((type) => type.value === sale.sale_type)?.label || sale.sale_type}</div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{sale.sold_items}</div>
              <div className="mt-2 text-xs text-slate-500">Invoice: {sale.invoice_number || '-'}</div>
            </div>
            <div className={`grid min-w-[320px] gap-3 ${canSeeAll ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <MoneyStat label="Total" value={formatMoney(sale.total_amount, sale.currency)} />
              <MoneyStat label="Paid" value={formatMoney(paid, sale.currency)} />
              <MoneyStat label="Balance" value={formatMoney(balance, sale.currency)} />
              {canSeeAll && <MoneyStat label="Commission Paid" value={formatMoney(totalCommission, sale.currency)} />}
            </div>
          </div>
        </section>

        {canAddPayment && (
          <section className="rounded-lg border border-slate-800 bg-[#161719] p-4">
            <h2 className="mb-3 text-lg font-semibold">Add Payment</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <input className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm" type="number" placeholder="Amount paid" value={paymentForm.amount} onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm" type="date" value={paymentForm.date} onChange={(e) => setPaymentForm((prev) => ({ ...prev, date: e.target.value }))} />
              <select className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm" value={paymentForm.stage} onChange={(e) => setPaymentForm((prev) => ({ ...prev, stage: e.target.value }))}>
                <option value="upfront">Upfront</option>
                <option value="remaining">Remaining</option>
                <option value="partial">Partial</option>
                <option value="upsell">Upsell</option>
                <option value="refund">Refund</option>
                <option value="adjustment">Adjustment</option>
              </select>
              <input className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm" placeholder="PayPal invoice #" value={paymentForm.invoice} onChange={(e) => setPaymentForm((prev) => ({ ...prev, invoice: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm" placeholder="PayPal transaction ID" value={paymentForm.transaction} onChange={(e) => setPaymentForm((prev) => ({ ...prev, transaction: e.target.value }))} />
              <input className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm" placeholder="Payment note" value={paymentForm.note} onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))} />
            </div>
            <button className="mt-3 rounded bg-[#c29a4b] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500" onClick={handleAddPayment}>
              Save Payment
            </button>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Payments & Commission Splits</h2>
          {payments.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-[#161719] p-4 text-sm text-slate-400">No payments recorded yet.</div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="rounded-lg border border-slate-800 bg-[#161719] p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="font-semibold">{formatMoney(payment.amount_paid, sale.currency)} <span className="text-sm text-slate-400">({payment.payment_stage || 'upfront'})</span></div>
                    <div className="mt-1 text-xs text-slate-500">{formatDateTime(payment.created_at || payment.payment_date)} | Invoice: {payment.invoice_number || '-'} | TX: {payment.paypal_transaction_id || '-'}</div>
                  </div>
                  {canSeeAll && (
                    <div className="text-right text-xs text-slate-500">
                      <div>Commission: {formatMoney((payment.sale_commission_splits || []).reduce((sum, split) => sum + Number(split.commission_amount || 0), 0), sale.currency)}</div>
                      <div>{payment.commission_locked ? 'Locked' : 'Open'}</div>
                    </div>
                  )}
                </div>
                {payment.note && <p className="mt-2 text-sm text-slate-400">{payment.note}</p>}

                {canSeeAll && <div className="mt-3 space-y-2">
                  {(payment.sale_commission_splits || []).map((split) => (
                    <div key={split.id} className="flex flex-wrap justify-between gap-2 rounded bg-[#101113] px-3 py-2 text-sm">
                      <span>{split.lead_gens?.name || personName(split.recipient_user)} ({split.role_on_sale})</span>
                      <span className="flex items-center gap-2">
                        {split.commission_percent}% - {formatMoney(split.commission_amount, sale.currency)}
                        {canAddPayment && (
                          <button className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500" onClick={() => handleEditSplit(payment, split)}>
                            Edit
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                </div>}

                {canAddPayment && !payment.commission_locked && (
                  <div className="mt-3 grid gap-2 md:grid-cols-5">
                    <select className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm" value={splitForms[payment.id]?.role || 'helper'} onChange={(e) => setSplitForms((prev) => ({ ...prev, [payment.id]: { recipientUserId: '', leadGenId: '', role: e.target.value, percent: prev[payment.id]?.percent || '', note: prev[payment.id]?.note || '' } }))}>
                      {COMMISSION_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                    <select className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm" value={splitForms[payment.id]?.role === 'lead_gen' ? splitForms[payment.id]?.leadGenId || '' : splitForms[payment.id]?.recipientUserId || ''} onChange={(e) => setSplitForms((prev) => ({ ...prev, [payment.id]: { recipientUserId: prev[payment.id]?.role === 'lead_gen' ? '' : e.target.value, leadGenId: prev[payment.id]?.role === 'lead_gen' ? e.target.value : '', role: prev[payment.id]?.role || 'helper', percent: prev[payment.id]?.percent || '', note: prev[payment.id]?.note || '' } }))}>
                      <option value="">Recipient</option>
                      {(splitForms[payment.id]?.role === 'lead_gen' ? leadGens : commissionUsers).map((item) => (
                        <option key={item.id} value={item.id}>{'sudo_name' in item ? item.sudo_name || item.name : item.name}</option>
                      ))}
                    </select>
                    <input className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm" type="number" placeholder="%" value={splitForms[payment.id]?.percent || ''} onChange={(e) => setSplitForms((prev) => ({ ...prev, [payment.id]: { recipientUserId: prev[payment.id]?.recipientUserId || '', leadGenId: prev[payment.id]?.leadGenId || '', role: prev[payment.id]?.role || 'helper', percent: e.target.value, note: prev[payment.id]?.note || '' } }))} />
                    <input className="rounded border border-slate-700 bg-[#0b0c0e] px-3 py-2 text-sm" placeholder="Split note" value={splitForms[payment.id]?.note || ''} onChange={(e) => setSplitForms((prev) => ({ ...prev, [payment.id]: { recipientUserId: prev[payment.id]?.recipientUserId || '', leadGenId: prev[payment.id]?.leadGenId || '', role: prev[payment.id]?.role || 'helper', percent: prev[payment.id]?.percent || '', note: e.target.value } }))} />
                    <button className="rounded bg-sky-700 px-3 py-2 text-sm hover:bg-sky-600" onClick={() => handleAddSplit(payment)}>Add Split</button>
                  </div>
                )}
                {canAddPayment && !payment.commission_locked && (payment.sale_commission_splits || []).length > 0 && (
                  <button className="mt-3 rounded border border-amber-600 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-950/40" onClick={() => handleLockCommission(payment)}>
                    Lock Commission
                  </button>
                )}
                {canAddPayment && payment.commission_locked && (
                  <p className="mt-3 text-xs text-slate-500">Commission is locked for new split rows. Edit existing splits if correction is needed.</p>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </Layout>
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
