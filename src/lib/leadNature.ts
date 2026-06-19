export const LEAD_NATURE_OPTIONS = [
  { value: 'website_design', label: 'Website Design' },
  { value: 'logo_design', label: 'Logo Design' },
  { value: 'flyer_design', label: 'Flyer Design' },
  { value: 'ecommerce_website', label: 'E-Commerce Website' },
  { value: 'social_media_marketing', label: 'Social Media Marketing' },
  { value: 'social_media_management', label: 'Social Media Management' },
  { value: 'video_editing', label: 'Video Editing' },
  { value: 'graphic_design', label: 'Graphic Design' },
  { value: 'e_books', label: 'E-Books' },
  { value: 'other', label: 'Other' },
] as const

export const parseLeadNatureValues = (value?: string | string[] | null) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export const formatLeadNatureValues = (values?: string[]) => {
  return (values || []).filter(Boolean).join(',')
}

export const getLeadNatureLabel = (value?: string | string[] | null) => {
  const values = parseLeadNatureValues(value)
  if (values.length === 0) return '-'

  return values
    .map((item) => LEAD_NATURE_OPTIONS.find((option) => option.value === item)?.label || item)
    .join(', ')
}
