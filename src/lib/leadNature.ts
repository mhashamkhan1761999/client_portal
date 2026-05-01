export const LEAD_NATURE_OPTIONS = [
  { value: 'website_design', label: 'Website Design' },
  { value: 'logo_design', label: 'Logo Design' },
  { value: 'flyer_design', label: 'Flyer Design' },
  { value: 'ecommerce_website', label: 'E-Commerce Website' },
  { value: 'social_media_marketing', label: 'Social Media Marketing' },
  { value: 'social_media_management', label: 'Social Media Management' },
  { value: 'video_editing', label: 'Video Editing' },
  { value: 'graphic_design', label: 'Graphic Design' },
  { value: 'other', label: 'Other' },
] as const

export const getLeadNatureLabel = (value?: string | null) => {
  return LEAD_NATURE_OPTIONS.find((item) => item.value === value)?.label || value || '-'
}
