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
