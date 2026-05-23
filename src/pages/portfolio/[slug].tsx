'use client'

import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  FileText,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
  MessageCircle,
  Phone,
} from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { PORTFOLIO_CATEGORIES } from '@/lib/portfolioDefaults'
import type { PortfolioCaseStudy, PortfolioProfile } from '@/types/portfolio'

type PublicProfile = PortfolioProfile & {
  portfolio_cases?: PortfolioCaseStudy[]
}

const normalizeProfile = (profile: any): PublicProfile => ({
  ...profile,
  services: profile.services || [],
  stats: profile.stats || [],
  social_links: profile.social_links || [],
  enabled_categories: profile.enabled_categories?.length ? profile.enabled_categories : PORTFOLIO_CATEGORIES,
  portfolio_cases: (profile.portfolio_cases || [])
    .map((item: any) => ({
      ...item,
      actions: item.actions || [],
      image_urls: item.image_urls || [],
      metrics: item.metrics || [],
      generated_results: item.generated_results || '',
      pdf_url: item.pdf_url || '',
      resource_label: item.resource_label || '',
    }))
    .sort((a: PortfolioCaseStudy, b: PortfolioCaseStudy) => a.sort_order - b.sort_order),
})

const socialIcon = (platform: string) => {
  const normalized = platform.toLowerCase()
  if (normalized.includes('linkedin')) return <Linkedin className="h-4 w-4" />
  if (normalized.includes('instagram')) return <Instagram className="h-4 w-4" />
  return <Globe className="h-4 w-4" />
}

const getWhatsappUrl = (number?: string) => {
  const cleaned = (number || '').replace(/\D/g, '')
  return cleaned ? `https://wa.me/${cleaned}` : ''
}

export default function PublicPortfolioPage() {
  const router = useRouter()
  const { slug } = router.query
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeSlides, setActiveSlides] = useState<Record<string, number>>({})
  const [expandedCases, setExpandedCases] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!slug || Array.isArray(slug)) return
    fetchPortfolio(slug)
  }, [slug])

  const fetchPortfolio = async (portfolioSlug: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('portfolio_profiles')
      .select('*, portfolio_cases(*)')
      .eq('slug', portfolioSlug)
      .eq('is_published', true)
      .maybeSingle()

    setProfile(data ? normalizeProfile(data) : null)
    setLoading(false)
  }

  const cases = profile?.portfolio_cases || []
  const visibleCategories = useMemo(() => {
    if (!profile) return []
    const categoriesWithCases = new Set(cases.map((item) => item.category))
    return profile.enabled_categories.filter((category) => categoriesWithCases.has(category))
  }, [cases, profile])

  const filteredCases = useMemo(
    () => cases.filter((item) => activeCategory === 'All' || item.category === activeCategory),
    [activeCategory, cases]
  )

  const setSlide = (caseId: string, imageCount: number, direction: number) => {
    setActiveSlides((current) => {
      const next = ((current[caseId] || 0) + direction + imageCount) % imageCount
      return { ...current, [caseId]: next }
    })
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] text-slate-300">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading portfolio...
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] px-6 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold text-[#f0d28a]">Portfolio not found</h1>
          <p className="mt-3 text-slate-400">This portfolio may be unpublished or the link is incorrect.</p>
          <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded border border-[#c29a4b]/50 px-4 py-2 text-sm text-[#f0d28a]">
            <ArrowLeft className="h-4 w-4" />
            Back to portal
          </Link>
        </div>
      </main>
    )
  }

  const whatsappUrl = getWhatsappUrl(profile.whatsapp_number)

  return (
    <>
      <Head>
        <title>{profile.display_name} | Portfolio</title>
      </Head>
      <main className="min-h-screen bg-[#080808] text-[#f5f0e8]">
        <section className="relative overflow-hidden border-b border-[#c29a4b]/20 px-6 py-14 md:px-12 lg:px-16">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(194,154,75,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(194,154,75,0.06)_1px,transparent_1px)] bg-[size:56px_56px]" />
          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#39ff88]">MetaMalistic Portfolio</p>
                <h1 className="mt-5 text-5xl font-black uppercase leading-none tracking-wide text-white md:text-7xl">{profile.display_name}</h1>
                <h2 className="mt-4 text-2xl font-bold uppercase tracking-wide text-[#f0d28a] md:text-4xl">{profile.headline}</h2>
                <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">{profile.summary}</p>
              </div>
              <div className="grid min-w-64 gap-4">
                {profile.stats.map((stat) => (
                  <div key={`${stat.label}-${stat.value}`} className="text-left lg:text-right">
                    <div className="text-4xl font-black text-[#f0d28a]">{stat.value}</div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-2">
              {profile.personal_phone && (
                <a href={`tel:${profile.personal_phone}`} className="inline-flex items-center gap-2 rounded border border-slate-700 bg-black/30 px-4 py-2 text-sm text-slate-200 hover:border-[#c29a4b] hover:text-[#f0d28a]">
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              )}
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" className="inline-flex items-center gap-2 rounded border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
              {profile.social_links.filter((link) => link.url).map((link) => (
                <a key={`${link.platform}-${link.url}`} href={link.url} target="_blank" className="inline-flex items-center gap-2 rounded border border-slate-700 bg-black/30 px-4 py-2 text-sm text-slate-200 hover:border-[#c29a4b] hover:text-[#f0d28a]">
                  {socialIcon(link.platform)}
                  {link.platform}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12 md:px-12 lg:px-16">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#39ff88]">Case Studies</p>
              <h2 className="mt-2 text-4xl font-black uppercase tracking-wide text-white">Proof of Work</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {['All', ...visibleCategories].map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded border px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition ${activeCategory === category ? 'border-[#c29a4b] bg-[#c29a4b]/15 text-[#f0d28a]' : 'border-slate-800 bg-[#101113] text-slate-400 hover:border-slate-600'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {filteredCases.map((item) => {
              const activeSlide = activeSlides[item.id] || 0
              const activeImage = item.image_urls[activeSlide]
              const isGrowthCase = ['SEO', 'SMM', 'Ads', 'Content', 'Video Editing'].includes(item.category)
              const isBrandCase = ['Logo', 'Branding', 'Video Editing'].includes(item.category)
              const isExpanded = expandedCases[item.id] || false
              const hasMoreDetails = item.generated_results || item.actions?.length > 0 || item.result

              return (
                <article key={item.id} className={`flex h-full flex-col overflow-hidden rounded-lg border bg-[#161616] transition hover:-translate-y-1 ${isGrowthCase ? 'border-emerald-500/25 hover:border-emerald-400/70' : 'border-[#c29a4b]/20 hover:border-[#c29a4b]/70'}`}>
                  <div className={`relative min-h-72 border-b ${isBrandCase ? 'border-[#c29a4b]/20 bg-[#111]' : 'border-emerald-500/20 bg-[#0d0d0d]'}`}>
                    {activeImage ? (
                      <img src={activeImage} alt={item.title} className="h-72 w-full object-cover" />
                    ) : (
                      <div className="flex h-72 items-center justify-center text-xs uppercase tracking-[0.24em] text-slate-600">
                        {isBrandCase ? 'Logo / Branding Preview' : 'Campaign Screenshot'}
                      </div>
                    )}
                    {item.image_urls.length > 1 && (
                      <>
                        <button onClick={() => setSlide(item.id, item.image_urls.length, -1)} className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white hover:border-[#c29a4b]">
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button onClick={() => setSlide(item.id, item.image_urls.length, 1)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white hover:border-[#c29a4b]">
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                          {item.image_urls.map((url, index) => (
                            <button key={url} onClick={() => setActiveSlides((current) => ({ ...current, [item.id]: index }))} className={`h-2 w-6 rounded-full ${index === activeSlide ? 'bg-[#f0d28a]' : 'bg-white/25'}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className={`rounded border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${isGrowthCase ? 'border-[#39ff88]/40 text-[#39ff88]' : 'border-[#c29a4b]/40 text-[#f0d28a]'}`}>{item.category}</span>
                      {item.client_name && <span className="rounded border border-[#c29a4b]/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#f0d28a]">{item.client_name}</span>}
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-wide text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-400">{item.summary}</p>

                    {isGrowthCase && item.metrics.length > 0 && (
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        {item.metrics.map((metric) => (
                          <div key={`${metric.label}-${metric.value}`} className="rounded border border-emerald-500/20 bg-emerald-500/10 p-3">
                            <div className="text-2xl font-black text-[#39ff88]">{metric.value}</div>
                            <div className="text-xs uppercase tracking-[0.16em] text-emerald-200/70">{metric.label}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {hasMoreDetails && (
                      <button
                        onClick={() => setExpandedCases((current) => ({ ...current, [item.id]: !isExpanded }))}
                        className="mt-5 mb-5 inline-flex w-fit items-center gap-2 rounded border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-[#c29a4b] hover:text-[#f0d28a]"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {isExpanded ? 'Hide Details' : 'Show Details'}
                      </button>
                    )}

                    {isExpanded && (
                      <div className="mt-5">
                        {item.generated_results && (
                          <div className="rounded border border-emerald-500/20 bg-emerald-950/20 p-4 text-sm leading-7 text-emerald-100">
                            {item.generated_results}
                          </div>
                        )}

                        {item.actions?.length > 0 && (
                          <ul className="mt-5 space-y-2">
                            {item.actions.map((action) => (
                              <li key={action} className="border-b border-white/5 pb-2 text-sm text-slate-300">
                                <span className="mr-2 text-[#39ff88]">-&gt;</span>{action}
                              </li>
                            ))}
                          </ul>
                        )}

                        {item.result && (
                          <div className="mt-5 border-l-4 border-[#39ff88] bg-[#39ff88]/10 p-4 text-sm font-semibold text-[#39ff88]">{item.result}</div>
                        )}
                      </div>
                    )}

                    {item.pdf_url && (
                      <a href={item.pdf_url} target="_blank" className="mt-auto inline-flex w-fit items-center gap-2 rounded border border-[#c29a4b]/50 bg-[#c29a4b]/10 px-4 py-2 text-sm font-semibold text-[#f0d28a] hover:bg-[#c29a4b]/20 mt-10">
                        <FileText className="h-4 w-4" />
                        {item.resource_label || (isBrandCase ? 'Open Branding PDF' : 'Open Report')}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {filteredCases.length === 0 && (
            <div className="rounded-lg border border-dashed border-[#c29a4b]/30 p-10 text-center text-slate-400">
              Case studies are being prepared.
            </div>
          )}
        </section>
      </main>
    </>
  )
}
