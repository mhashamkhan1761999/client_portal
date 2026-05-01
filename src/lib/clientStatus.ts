export const CLIENT_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'connected', label: 'Connected' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'followup', label: 'Follow Up' },
  { value: 'converted', label: 'Converted' },
  { value: 'completed', label: 'Completed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'upsell', label: 'Upsell' },
  { value: 'drop', label: 'Drop' },
] as const

export const getClientStatusLabel = (status?: string) => {
  return CLIENT_STATUSES.find((item) => item.value === status)?.label || status || 'New'
}
