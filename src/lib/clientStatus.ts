export const CLIENT_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'connected', label: 'Connected' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_responding', label: 'Not Responding' },
  { value: 'converted', label: 'Converted' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'drop', label: 'Drop' },
] as const

export const getClientStatusLabel = (status?: string) => {
  if (status === 'unresponsive') return 'Not Responding'
  if (status === 'in_progress') return 'Interested'
  if (status === 'completed') return 'Delivered'
  return CLIENT_STATUSES.find((item) => item.value === status)?.label || status || 'New'
}
