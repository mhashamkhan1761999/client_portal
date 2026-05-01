export const ASSIGNMENT_STATUSES = [
  { value: 'connected', label: 'Connected' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'followup', label: 'Follow Up' },
  { value: 'converted', label: 'Converted' },
  { value: 'drop', label: 'Drop' },
] as const

export const getAssignmentStatusLabel = (value?: string | null) => {
  return ASSIGNMENT_STATUSES.find((item) => item.value === value)?.label || value || '-'
}

export const ASSIGNMENT_TYPES = [
  { value: 'connected', label: 'Connected Person' },
  { value: 'nurturer', label: 'Lead Nurturer' },
  { value: 'seller', label: 'Seller' },
  { value: 'closer', label: 'Closer' },
] as const

export const getAssignmentTypeLabel = (value?: string | null) => {
  if (value === 'primary') return 'Primary Owner'
  return ASSIGNMENT_TYPES.find((item) => item.value === value)?.label || value || 'Connected Person'
}
