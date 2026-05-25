'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import {
  Copy,
  Eye,
  FileText,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/context/AuthContext'
import supabase from '@/lib/supabaseClient'
import {
  PORTFOLIO_CATEGORIES,
  SOCIAL_PLATFORMS,
  defaultPortfolioStats,
  defaultSocialLinks,
  getDefaultProfile,
  makeSlug,
  sampleCaseStudies,
  seoSmmResultPrompt,
} from '@/lib/portfolioDefaults'
import type {
  PortfolioCaseStudy,
  PortfolioMetric,
  PortfolioProfile,
  PortfolioSocialLink,
  PortfolioStat,
} from '@/types/portfolio'

type CaseDraft = Omit<PortfolioCaseStudy, 'id' | 'profile_id' | 'sort_order'> & { id?: string }
type BuilderTab = 'profile' | 'contact' | 'sections' | 'cases'

const blankCase = (): CaseDraft => ({
  title: '',
  client_name: '',
  category: 'SEO',
  summary: '',
  actions: ['', '', ''],
  result: '',
  generated_results: '',
  metrics: [{ label: '', value: '' }],
  image_urls: [],
  pdf_url: '',
  resource_label: '',
})

const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean)
const joinLines = (items?: string[]) => (items || []).join('\n')

const normalizeProfile = (profile: any): PortfolioProfile => ({
  ...profile,
  services: profile.services || [],
  stats: profile.stats?.length ? profile.stats : defaultPortfolioStats,
  personal_phone: profile.personal_phone || '',
  whatsapp_number: profile.whatsapp_number || '',
  social_links: profile.social_links?.length ? profile.social_links : defaultSocialLinks,
  enabled_categories: profile.enabled_categories?.length ? profile.enabled_categories : PORTFOLIO_CATEGORIES,
})

const normalizeCase = (item: any): PortfolioCaseStudy => ({
  ...item,
  actions: item.actions || [],
  image_urls: item.image_urls || [],
  metrics: item.metrics || [],
  generated_results: item.generated_results || '',
  pdf_url: item.pdf_url || '',
  resource_label: item.resource_label || '',
})

const socialIcon = (platform: string) => {
  const normalized = platform.toLowerCase()
  if (normalized.includes('linkedin')) return <Linkedin className="h-4 w-4" />
  if (normalized.includes('instagram')) return <Instagram className="h-4 w-4" />
  if (normalized.includes('website')) return <Globe className="h-4 w-4" />
  return <Globe className="h-4 w-4" />
}

export default function PortfolioManagerPage() {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id
  const router = useRouter()
  const [profiles, setProfiles] = useState<PortfolioProfile[]>([])
  const [profile, setProfile] = useState<PortfolioProfile | null>(null)
  const [cases, setCases] = useState<PortfolioCaseStudy[]>([])
  const [caseDraft, setCaseDraft] = useState<CaseDraft>(blankCase())
  const [builderTab, setBuilderTab] = useState<BuilderTab>('profile')
  const [caseFilter, setCaseFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingCase, setSavingCase] = useState(false)
  const [error, setError] = useState('')
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  const publicUrl = useMemo(() => {
    if (!profile?.slug || typeof window === 'undefined') return ''
    return `${window.location.origin}/portfolio/${profile.slug}`
  }, [profile?.slug])

  const visibleCases = useMemo(
    () => cases.filter((item) => caseFilter === 'All' || item.category === caseFilter),
    [caseFilter, cases]
  )

  useEffect(() => {
    if (!authLoading && !userId) {
      router.push('/login')
      return
    }
    if (!userId) return
    fetchProfiles()
  }, [authLoading, router, userId])

  const fetchProfiles = async (selectedId?: string) => {
    if (!user) return
    setLoading(true)
    setError('')

    const { data, error: profileError } = await supabase
      .from('portfolio_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (profileError) {
      setError('Portfolio tables are not ready yet. Run the updated supabase-portfolio.sql file first.')
      setLoading(false)
      return
    }

    const normalized = (data || []).map(normalizeProfile)
    setProfiles(normalized)

    const nextProfile = normalized.find((item) => item.id === selectedId) || normalized[0]
    if (nextProfile) {
      setProfile(nextProfile)
      await fetchCases(nextProfile.id)
    } else {
      const defaults = getDefaultProfile(user.sudo_name || user.name)
      setProfile({
        id: '',
        user_id: user.id,
        ...defaults,
        slug: makeSlug(user.sudo_name || user.name || 'portfolio'),
      })
      setCases([])
    }

    setLoading(false)
  }

  const fetchCases = async (profileId: string) => {
    const { data: caseRows, error: casesError } = await supabase
      .from('portfolio_cases')
      .select('*')
      .eq('profile_id', profileId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (casesError) {
      toast.error('Could not load case studies.')
      setCases([])
      return
    }

    setCases((caseRows || []).map(normalizeCase))
  }

  const startNewPersona = () => {
    if (!user) return
    const name = `${user.sudo_name || user.name || 'Seller'} Portfolio ${profiles.length + 1}`
    const defaults = getDefaultProfile(name)
    setProfile({
      id: '',
      user_id: user.id,
      ...defaults,
      slug: makeSlug(name),
    })
    setCases([])
    setCaseDraft(blankCase())
    setBuilderTab('profile')
  }

  const selectProfile = async (id: string) => {
    const next = profiles.find((item) => item.id === id)
    if (!next) return
    setProfile(next)
    setCaseDraft(blankCase())
    setCaseFilter('All')
    setLoading(true)
    await fetchCases(next.id)
    setLoading(false)
  }

  const updateStat = (index: number, field: keyof PortfolioStat, value: string) => {
    setProfile((current) => {
      if (!current) return current
      const stats = [...current.stats]
      stats[index] = { ...stats[index], [field]: value }
      return { ...current, stats }
    })
  }

  const addStat = () => setProfile((current) => current ? { ...current, stats: [...current.stats, { label: '', value: '' }] } : current)
  const removeStat = (index: number) => setProfile((current) => current ? { ...current, stats: current.stats.filter((_, itemIndex) => itemIndex !== index) } : current)

  const updateSocial = (index: number, field: keyof PortfolioSocialLink, value: string) => {
    setProfile((current) => {
      if (!current) return current
      const social_links = [...current.social_links]
      social_links[index] = { ...social_links[index], [field]: value }
      return { ...current, social_links }
    })
  }

  const addSocial = () => setProfile((current) => current ? { ...current, social_links: [...current.social_links, { platform: 'Website', url: '' }] } : current)
  const removeSocial = (index: number) => setProfile((current) => current ? { ...current, social_links: current.social_links.filter((_, itemIndex) => itemIndex !== index) } : current)

  const toggleCategory = (category: string) => {
    setProfile((current) => {
      if (!current) return current
      const exists = current.enabled_categories.includes(category)
      const enabled_categories = exists
        ? current.enabled_categories.filter((item) => item !== category)
        : [...current.enabled_categories, category]
      return {
        ...current,
        enabled_categories,
        services: enabled_categories,
      }
    })
  }

  const updateMetric = (index: number, field: keyof PortfolioMetric, value: string) => {
    const metrics = [...caseDraft.metrics]
    metrics[index] = { ...metrics[index], [field]: value }
    setCaseDraft({ ...caseDraft, metrics })
  }

  const copyText = async (value: string, successMessage: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = value
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      toast.success(successMessage)
      return true
    } catch {
      toast.error('Could not copy. Please copy manually.')
      return false
    }
  }

  const saveProfile = async () => {
    if (!user || !profile) return
    setSavingProfile(true)

    const payload = {
      user_id: user.id,
      slug: makeSlug(profile.slug || profile.display_name),
      display_name: profile.display_name,
      headline: profile.headline,
      summary: profile.summary,
      services: profile.services,
      stats: profile.stats.filter((stat) => stat.label || stat.value),
      personal_phone: profile.personal_phone || '',
      whatsapp_number: profile.whatsapp_number || '',
      social_links: profile.social_links.filter((link) => link.url || link.platform),
      enabled_categories: profile.enabled_categories,
      is_published: profile.is_published,
    }

    const query = profile.id
      ? supabase.from('portfolio_profiles').update(payload).eq('id', profile.id).select('*').single()
      : supabase.from('portfolio_profiles').insert(payload).select('*').single()

    const { data, error: saveError } = await query

    if (saveError) {
      toast.error(saveError.code === '23505' ? 'That portfolio link is already taken.' : 'Could not save portfolio.')
    } else {
      const saved = normalizeProfile(data)
      setProfile(saved)
      await fetchProfiles(saved.id)
      toast.success('Portfolio saved.')
    }

    setSavingProfile(false)
  }

  const saveCase = async () => {
    if (!profile?.id) {
      toast.error('Save the portfolio profile first.')
      return
    }

    if (!caseDraft.title.trim()) {
      toast.error('Add a case study title.')
      return
    }

    setSavingCase(true)
    const payload = {
      profile_id: profile.id,
      title: caseDraft.title,
      client_name: caseDraft.client_name,
      category: caseDraft.category,
      summary: caseDraft.summary,
      actions: caseDraft.actions.filter(Boolean),
      result: caseDraft.result,
      generated_results: caseDraft.generated_results || '',
      metrics: caseDraft.metrics.filter((metric) => metric.label || metric.value),
      image_urls: caseDraft.image_urls.filter(Boolean),
      pdf_url: caseDraft.pdf_url || '',
      resource_label: caseDraft.resource_label || '',
      sort_order: cases.length,
    }

    const query = caseDraft.id
      ? supabase.from('portfolio_cases').update(payload).eq('id', caseDraft.id).select('*').single()
      : supabase.from('portfolio_cases').insert(payload).select('*').single()

    const { error: saveError } = await query

    if (saveError) {
      toast.error('Could not save case study.')
    } else {
      toast.success('Case study saved.')
      setCaseDraft(blankCase())
      await fetchCases(profile.id)
    }

    setSavingCase(false)
  }

  const deleteCase = async (id: string) => {
    const { error: deleteError } = await supabase.from('portfolio_cases').delete().eq('id', id)
    if (deleteError) {
      toast.error('Could not delete case study.')
      return
    }
    toast.success('Case study deleted.')
    setCases((current) => current.filter((item) => item.id !== id))
  }

  const addSampleCases = async () => {
    if (!profile?.id) {
      toast.error('Save the portfolio profile first.')
      return
    }

    const rows = sampleCaseStudies.map((item, index) => ({
      ...item,
      profile_id: profile.id,
      sort_order: cases.length + index,
    }))

    const { error: insertError } = await supabase.from('portfolio_cases').insert(rows)
    if (insertError) {
      toast.error('Could not add examples.')
      return
    }
    toast.success('Example case studies added.')
    await fetchCases(profile.id)
  }

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading portfolio...
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">{error}</div>
      </Layout>
    )
  }

  if (!profile) return null

  return (
    <Layout>
      <div className="mx-auto max-w-7xl text-white">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f0d28a]">Seller Portfolio Builder</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Create portfolio pages for each seller persona</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Build SEO, SMM, logo, branding, and website case studies with public image/PDF links. Files are not uploaded to Supabase storage.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={startNewPersona} className="inline-flex items-center gap-2 rounded border border-slate-700 bg-[#101113] px-4 py-2 text-sm text-slate-200 hover:border-[#c29a4b]">
              <Plus className="h-4 w-4" />
              New Sudo
            </button>
            {publicUrl && (
              <>
                <button
                  className="inline-flex items-center gap-2 rounded border border-slate-700 bg-[#101113] px-4 py-2 text-sm text-slate-200 hover:border-[#c29a4b]"
                  onClick={async () => {
                    await copyText(publicUrl, 'Portfolio link copied.')
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </button>
                <a href={publicUrl} target="_blank" className="inline-flex items-center gap-2 rounded border border-[#c29a4b]/60 bg-[#c29a4b]/10 px-4 py-2 text-sm text-[#f0d28a] hover:bg-[#c29a4b]/20">
                  <Eye className="h-4 w-4" />
                  Preview
                </a>
              </>
            )}
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-slate-800 bg-[#111214] p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Portfolio Sudos</div>
          <div className="flex flex-wrap gap-2">
            {profiles.map((item) => (
              <button
                key={item.id}
                onClick={() => selectProfile(item.id)}
                className={`rounded border px-4 py-2 text-sm transition ${profile.id === item.id ? 'border-[#c29a4b] bg-[#c29a4b]/15 text-[#f0d28a]' : 'border-slate-700 bg-[#161719] text-slate-300 hover:border-slate-500'}`}
              >
                {item.display_name}
              </button>
            ))}
            {profiles.length === 0 && <span className="text-sm text-slate-400">Save the first portfolio to create your first sudo.</span>}
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'contact', label: 'Contact & Social' },
            { id: 'sections', label: 'Tabs & Stats' },
            { id: 'cases', label: `Case Studies (${cases.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setBuilderTab(tab.id as BuilderTab)}
              className={`rounded border px-4 py-2 text-sm transition ${builderTab === tab.id ? 'border-[#c29a4b] bg-[#c29a4b]/15 text-[#f0d28a]' : 'border-slate-700 bg-[#101113] text-slate-300 hover:border-slate-500'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {builderTab !== 'cases' && (
          <section className="rounded-lg border border-slate-800 bg-[#161719] p-5">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{builderTab === 'profile' ? 'Portfolio Information' : builderTab === 'contact' ? 'Contact & Social Links' : 'Visible Tabs & Stats'}</h2>
                <p className="text-sm text-slate-400">This information appears on the public share page.</p>
              </div>
              <button onClick={saveProfile} disabled={savingProfile} className="inline-flex w-fit items-center gap-2 rounded bg-[#c29a4b] px-4 py-2 text-sm font-semibold text-black hover:bg-[#d7b464] disabled:opacity-60">
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Portfolio
              </button>
            </div>

            {builderTab === 'profile' && (
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  Sudo / display name
                  <input className="mt-1 w-full rounded border border-slate-700 bg-[#101113] px-3 py-2 text-white outline-none focus:border-[#c29a4b]" value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
                </label>
                <label className="block text-sm text-slate-300">
                  Public link slug
                  <input className="mt-1 w-full rounded border border-slate-700 bg-[#101113] px-3 py-2 text-white outline-none focus:border-[#c29a4b]" value={profile.slug} onChange={(e) => setProfile({ ...profile, slug: makeSlug(e.target.value) })} />
                </label>
                <label className="block text-sm text-slate-300 lg:col-span-2">
                  Headline
                  <input className="mt-1 w-full rounded border border-slate-700 bg-[#101113] px-3 py-2 text-white outline-none focus:border-[#c29a4b]" value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} />
                </label>
                <label className="block text-sm text-slate-300 lg:col-span-2">
                  Portfolio summary
                  <textarea className="mt-1 min-h-32 w-full rounded border border-slate-700 bg-[#101113] px-3 py-2 text-white outline-none focus:border-[#c29a4b]" value={profile.summary} onChange={(e) => setProfile({ ...profile, summary: e.target.value })} />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={profile.is_published} onChange={(e) => setProfile({ ...profile, is_published: e.target.checked })} />
                  Publish portfolio link
                </label>
              </div>
            )}

            {builderTab === 'contact' && (
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  Personal phone number
                  <div className="mt-1 flex items-center rounded border border-slate-700 bg-[#101113] px-3 focus-within:border-[#c29a4b]">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <input className="w-full bg-transparent px-3 py-2 text-white outline-none" value={profile.personal_phone || ''} onChange={(e) => setProfile({ ...profile, personal_phone: e.target.value })} placeholder="+1 555 123 4567" />
                  </div>
                </label>
                <label className="block text-sm text-slate-300">
                  WhatsApp number
                  <div className="mt-1 flex items-center rounded border border-slate-700 bg-[#101113] px-3 focus-within:border-[#c29a4b]">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    <input className="w-full bg-transparent px-3 py-2 text-white outline-none" value={profile.whatsapp_number || ''} onChange={(e) => setProfile({ ...profile, whatsapp_number: e.target.value })} placeholder="15551234567" />
                  </div>
                </label>
                <div className="lg:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Social Links</h3>
                    <button onClick={addSocial} className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-[#c29a4b]">Add Social</button>
                  </div>
                  <div className="grid gap-3">
                    {profile.social_links.map((link, index) => (
                      <div key={index} className="grid gap-2 md:grid-cols-[190px_1fr_auto]">
                        <div className="flex items-center gap-2 rounded border border-slate-700 bg-[#101113] px-3">
                          {socialIcon(link.platform)}
                          <select className="w-full bg-[#101113] py-2 text-sm text-white outline-none" value={link.platform} onChange={(e) => updateSocial(index, 'platform', e.target.value)}>
                            {SOCIAL_PLATFORMS.map((platform) => <option className="bg-[#101113] text-white" key={platform}>{platform}</option>)}
                          </select>
                        </div>
                        <input className="rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white outline-none focus:border-[#c29a4b]" placeholder="https://..." value={link.url} onChange={(e) => updateSocial(index, 'url', e.target.value)} />
                        <button onClick={() => removeSocial(index)} className="rounded border border-rose-800/70 px-3 py-2 text-rose-300 hover:bg-rose-950/40"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {builderTab === 'sections' && (
              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div>
                  <h3 className="mb-3 font-semibold text-white">Portfolio Tabs</h3>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {PORTFOLIO_CATEGORIES.map((category) => (
                      <label key={category} className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${profile.enabled_categories.includes(category) ? 'border-[#c29a4b] bg-[#c29a4b]/15 text-[#f0d28a]' : 'border-slate-700 bg-[#101113] text-slate-400'}`}>
                        <input type="checkbox" checked={profile.enabled_categories.includes(category)} onChange={() => toggleCategory(category)} />
                        {category}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Stats</h3>
                    <button onClick={addStat} className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-[#c29a4b]">Add Stat</button>
                  </div>
                  <div className="space-y-2">
                    {profile.stats.map((stat, index) => (
                      <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_44px]">
                        <input className="rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white" placeholder="Value, e.g. 3.2x" value={stat.value} onChange={(e) => updateStat(index, 'value', e.target.value)} />
                        <input className="rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white" placeholder="Label, e.g. Lead Lift" value={stat.label} onChange={(e) => updateStat(index, 'label', e.target.value)} />
                        <button onClick={() => removeStat(index)} className="flex h-10 items-center justify-center rounded border border-rose-800/70 text-rose-300 hover:bg-rose-950/40"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {builderTab === 'cases' && (
          <section className="rounded-lg border border-slate-800 bg-[#111214] p-5">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Case Study Builder</h2>
                <p className="text-sm text-slate-400">Use different categories for SEO, SMM, logo, branding, website, and PDF-backed work.</p>
              </div>
              <button onClick={addSampleCases} className="inline-flex w-fit items-center gap-2 rounded border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-[#c29a4b]">
                <Plus className="h-4 w-4" />
                Add Examples
              </button>
            </div>

            <div className="grid gap-5 xl:grid-cols-[460px_1fr]">
              <div className="rounded-lg border border-slate-800 bg-[#161719] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">{caseDraft.id ? 'Edit Case Study' : 'New Case Study'}</h3>
                  <button
                    onClick={async () => {
                      const copied = await copyText(seoSmmResultPrompt, 'SEO/SMM prompt copied.')
                      if (copied) {
                        setCopiedPrompt(true)
                        window.setTimeout(() => setCopiedPrompt(false), 1800)
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded border border-[#c29a4b]/40 px-3 py-1.5 text-xs text-[#f0d28a] hover:bg-[#c29a4b]/10"
                  >
                    <WandSparkles className="h-4 w-4" />
                    {copiedPrompt ? 'Prompt Copied' : 'Copy SEO/SMM Prompt'}
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white" placeholder="Project title" value={caseDraft.title} onChange={(e) => setCaseDraft({ ...caseDraft, title: e.target.value })} />
                    <input className="rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white" placeholder="Client or niche" value={caseDraft.client_name} onChange={(e) => setCaseDraft({ ...caseDraft, client_name: e.target.value })} />
                  </div>
                  <select className="w-full rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white" value={caseDraft.category} onChange={(e) => setCaseDraft({ ...caseDraft, category: e.target.value })}>
                    {PORTFOLIO_CATEGORIES.map((category) => <option className="bg-[#101113] text-white" key={category}>{category}</option>)}
                  </select>
                  <textarea className="min-h-24 w-full rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white" placeholder="Short case-study summary" value={caseDraft.summary} onChange={(e) => setCaseDraft({ ...caseDraft, summary: e.target.value })} />
                  <textarea className="min-h-24 w-full rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white" placeholder="What we did, one per line" value={joinLines(caseDraft.actions)} onChange={(e) => setCaseDraft({ ...caseDraft, actions: splitLines(e.target.value) })} />
                  <textarea className="min-h-20 w-full rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white" placeholder="Simple result / impact" value={caseDraft.result} onChange={(e) => setCaseDraft({ ...caseDraft, result: e.target.value })} />
                  <textarea className="min-h-24 w-full rounded border border-emerald-700/60 bg-emerald-950/20 px-3 py-2 text-sm text-white" placeholder="Paste ChatGPT SEO/SMM generated result here" value={caseDraft.generated_results || ''} onChange={(e) => setCaseDraft({ ...caseDraft, generated_results: e.target.value })} />

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-300">Growth Metrics</span>
                      <button onClick={() => setCaseDraft({ ...caseDraft, metrics: [...caseDraft.metrics, { label: '', value: '' }] })} className="text-xs text-[#f0d28a]">Add Metric</button>
                    </div>
                    <div className="space-y-2">
                      {caseDraft.metrics.map((metric, index) => (
                        <div key={index} className="grid gap-1 sm:grid-cols-[1fr_1fr_30px]">
                          <input className="rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white" placeholder="Value" value={metric.value} onChange={(e) => updateMetric(index, 'value', e.target.value)} />
                          <input className="rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white" placeholder="Label" value={metric.label} onChange={(e) => updateMetric(index, 'label', e.target.value)} />
                          <button onClick={() => setCaseDraft({ ...caseDraft, metrics: caseDraft.metrics.filter((_, metricIndex) => metricIndex !== index) })} className="flex h-10 items-center justify-center rounded border border-rose-800/70 text-rose-300"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <textarea className="min-h-24 w-full rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white" placeholder="Image URLs, one per line. Multiple images become a slider." value={joinLines(caseDraft.image_urls)} onChange={(e) => setCaseDraft({ ...caseDraft, image_urls: splitLines(e.target.value) })} />
                  <div className="grid gap-2 md:grid-cols-[1fr_220px]">
                    <div className="flex items-center rounded border border-slate-700 bg-[#101113] px-3 focus-within:border-[#c29a4b]">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <input className="w-full bg-transparent px-3 py-2 text-sm text-white outline-none" placeholder="PDF / video / website URL" value={caseDraft.pdf_url || ''} onChange={(e) => setCaseDraft({ ...caseDraft, pdf_url: e.target.value })} />
                    </div>
                    <input className="rounded border border-slate-700 bg-[#101113] px-3 py-2 text-sm text-white outline-none focus:border-[#c29a4b]" placeholder="Button text" value={caseDraft.resource_label || ''} onChange={(e) => setCaseDraft({ ...caseDraft, resource_label: e.target.value })} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={saveCase} disabled={savingCase} className="inline-flex items-center gap-2 rounded bg-[#c29a4b] px-4 py-2 text-sm font-semibold text-black hover:bg-[#d7b464] disabled:opacity-60">
                      {savingCase ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Case
                    </button>
                    {caseDraft.id && <button onClick={() => setCaseDraft(blankCase())} className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {['All', ...profile.enabled_categories].map((category) => (
                    <button key={category} onClick={() => setCaseFilter(category)} className={`rounded border px-3 py-1.5 text-sm ${caseFilter === category ? 'border-[#c29a4b] bg-[#c29a4b]/15 text-[#f0d28a]' : 'border-slate-700 bg-[#101113] text-slate-300'}`}>
                      {category}
                    </button>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {visibleCases.map((item) => (
                    <article key={item.id} className="overflow-hidden rounded-lg border border-slate-800 bg-[#161719]">
                      <div className="relative flex h-40 items-center justify-center overflow-hidden border-b border-slate-800 bg-[#0b0c0e]">
                        {item.image_urls?.[0] ? (
                          <img src={item.image_urls[0]} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="text-center text-xs uppercase tracking-[0.2em] text-slate-600">Image Slider</div>
                        )}
                        {item.image_urls.length > 1 && <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-[#f0d28a]">{item.image_urls.length} images</span>}
                      </div>
                      <div className="p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="rounded border border-[#c29a4b]/40 px-2 py-1 text-xs font-semibold text-[#f0d28a]">{item.category}</span>
                          <div className="flex gap-2">
                            <button className="text-slate-400 hover:text-white" onClick={() => setCaseDraft(item)}><Eye className="h-4 w-4" /></button>
                            <button className="text-rose-300 hover:text-rose-200" onClick={() => deleteCase(item.id)}><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#c29a4b]">{item.client_name}</p>
                        <p className="mt-3 line-clamp-3 text-sm text-slate-400">{item.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.metrics.slice(0, 2).map((metric) => (
                            <span key={`${metric.label}-${metric.value}`} className="rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">{metric.value} {metric.label}</span>
                          ))}
                          {item.pdf_url && <span className="rounded bg-sky-500/10 px-2 py-1 text-xs text-sky-300">{item.resource_label || 'Resource'}</span>}
                        </div>
                      </div>
                    </article>
                  ))}
                  {visibleCases.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-400 md:col-span-2">
                      Add a case study for this portfolio tab.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </Layout>
  )
}
