export type PortfolioProfile = {
  id: string
  user_id: string
  slug: string
  display_name: string
  headline: string
  summary: string
  services: string[]
  stats: PortfolioStat[]
  personal_phone?: string
  whatsapp_number?: string
  social_links: PortfolioSocialLink[]
  enabled_categories: string[]
  is_published: boolean
  created_at?: string
  updated_at?: string
}

export type PortfolioStat = {
  label: string
  value: string
}

export type PortfolioSocialLink = {
  platform: string
  url: string
}

export type PortfolioMetric = {
  label: string
  value: string
}

export type PortfolioCaseStudy = {
  id: string
  profile_id: string
  title: string
  client_name: string
  category: string
  summary: string
  actions: string[]
  result: string
  generated_results?: string
  metrics: PortfolioMetric[]
  image_urls: string[]
  pdf_url?: string
  resource_label?: string
  sort_order: number
  created_at?: string
  updated_at?: string
}
