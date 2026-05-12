export const FINANCE_ADMIN_ROLES = ['admin', 'sales_head'] as const
export const SALE_CREATOR_ROLES = ['admin', 'sales_head', 'seller', 'upseller'] as const

export const SALE_TYPES = [
  { value: 'new_sale', label: 'New Sale' },
  { value: 'upsell', label: 'Upsell' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'add_on', label: 'Add-on' },
] as const

export const COMMISSION_ROLES = [
  { value: 'lead_gen', label: 'Lead Gen' },
  { value: 'nurturer', label: 'Nurturer' },
  { value: 'seller', label: 'Seller' },
  { value: 'closer', label: 'Closer' },
  { value: 'upseller', label: 'Upseller' },
  { value: 'helper', label: 'Helper' },
] as const

export const canViewAllFinance = (role?: string) => Boolean(role && FINANCE_ADMIN_ROLES.includes(role as any))

export const canCreateSale = (role?: string) => Boolean(role && SALE_CREATOR_ROLES.includes(role as any))

export const canRecordPayment = (role?: string) => role === 'admin'

export const formatMoney = (value?: number | string | null, currency = 'USD') => {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const calculatePaid = (payments?: { amount_paid?: number | string | null }[]) =>
  (payments || []).reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0)

export const getSaleStatus = (total: number, paid: number) => {
  if (paid <= 0) return 'open'
  if (paid >= total) return 'paid'
  return 'partially_paid'
}
