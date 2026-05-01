export const TRANSFER_REASONS = [
  { value: 'not_my_category', label: 'Not my category' },
  { value: 'client_requested_another_agent', label: 'Client requested another agent' },
  { value: 'senior_closer_required', label: 'Senior closer required' },
  { value: 'website_lead', label: 'Website Lead' },
  { value: 'workload', label: 'Workload' },
  { value: 'other', label: 'Other' },
] as const

export const getTransferReasonLabel = (value?: string | null) => {
  return TRANSFER_REASONS.find((item) => item.value === value)?.label || value || '-'
}
