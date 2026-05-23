import type { PortfolioCaseStudy, PortfolioProfile, PortfolioSocialLink, PortfolioStat } from '@/types/portfolio'

export const PORTFOLIO_CATEGORIES = ['SEO', 'SMM', 'Website', 'Logo', 'Branding', 'Video Editing', 'Ads', 'Content', 'Both']

export const SOCIAL_PLATFORMS = ['Website', 'LinkedIn', 'Instagram', 'Facebook', 'TikTok', 'YouTube', 'Behance', 'Dribbble']

export const defaultPortfolioStats: PortfolioStat[] = [
  { label: 'Campaigns Built', value: '40+' },
  { label: 'Avg. Lead Lift', value: '3.2x' },
  { label: 'Client Niches', value: '12+' },
]

export const defaultSocialLinks: PortfolioSocialLink[] = [
  { platform: 'Website', url: '' },
  { platform: 'LinkedIn', url: '' },
  { platform: 'Instagram', url: '' },
]

export const getDefaultProfile = (name?: string): Omit<PortfolioProfile, 'id' | 'user_id'> => ({
  slug: '',
  display_name: name || 'MetaMalistic Growth Partner',
  headline: 'SEO, SMM & Website Growth Portfolio',
  summary:
    'A practical portfolio of growth work across search visibility, social media presence, conversion-focused websites, and client acquisition campaigns.',
  services: ['SEO', 'SMM', 'Website'],
  stats: defaultPortfolioStats,
  personal_phone: '',
  whatsapp_number: '',
  social_links: defaultSocialLinks,
  enabled_categories: ['SEO', 'SMM', 'Website', 'Logo', 'Branding', 'Video Editing'],
  is_published: false,
})

export const sampleCaseStudies: Array<Omit<PortfolioCaseStudy, 'id' | 'profile_id' | 'sort_order'>> = [
  {
    title: 'Local SEO Visibility Sprint',
    client_name: 'Service Business',
    category: 'SEO',
    summary: 'Improved search presence by tightening technical SEO, optimizing service pages, and building a focused local content plan.',
    actions: ['Audited site structure and indexing issues', 'Rebuilt keyword map around buyer intent', 'Optimized Google Business Profile and local pages'],
    result: 'More qualified inbound calls and stronger visibility across priority local searches.',
    generated_results: 'Organic visibility improved across priority local searches with stronger keyword coverage, cleaner on-page structure, and better conversion paths for inbound traffic.',
    metrics: [
      { label: 'Organic Growth', value: '2.8x' },
      { label: 'Keywords Moved', value: '36' },
    ],
    image_urls: [],
    pdf_url: '',
    resource_label: 'Open SEO Report',
  },
  {
    title: 'Social Media Authority Build',
    client_name: 'Personal Brand',
    category: 'SMM',
    summary: 'Created a repeatable content system with clear pillars, stronger visuals, and consistent posting for audience growth.',
    actions: ['Defined content pillars and weekly calendar', 'Created before/after proof posts and offer-led captions', 'Tracked engagement and adjusted creative direction'],
    result: 'Higher profile engagement and more warm conversations from social channels.',
    generated_results: 'The content system improved consistency, lifted engagement quality, and created more warm inbound conversations through proof-led posts and clearer calls to action.',
    metrics: [
      { label: 'Engagement Lift', value: '185%' },
      { label: 'Monthly Reach', value: '4.4x' },
    ],
    image_urls: [],
    pdf_url: '',
    resource_label: 'Open Social Report',
  },
  {
    title: 'Conversion Website Refresh',
    client_name: 'B2B Company',
    category: 'Website',
    summary: 'Repositioned the website around trust, services, proof, and simple conversion paths for inbound leads.',
    actions: ['Reworked hero messaging and service sections', 'Added case-study proof blocks', 'Improved mobile layout and call-to-action placement'],
    result: 'Cleaner buyer journey with stronger credibility for sales conversations.',
    generated_results: '',
    metrics: [
      { label: 'Pages Refreshed', value: '8' },
      { label: 'CTA Paths', value: '3' },
    ],
    image_urls: [],
    pdf_url: '',
    resource_label: 'View Website Preview',
  },
]

export const seoSmmResultPrompt = `You are helping a sales portfolio writer turn a raw SEO or SMM report into a clean case-study result.

Use the report I share and return:
1. A short result summary in 2-3 sentences.
2. 3-5 simple growth metrics with label + value.
3. 3 bullet points explaining what improved.
4. Keep it honest. Do not invent numbers. If a number is missing, say "Not provided".
5. Write in simple sales-friendly language for a business owner.

Report:
[Paste report details here]`

export const makeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
