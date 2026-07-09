import { useRouter } from 'next/router'
import React, { useState, useEffect, ReactNode } from 'react'
import supabase from '../../lib/supabaseClient'
import {Client}  from '../../types/client'
import Layout from '../../components/layout/Layout'
import ClientNotes from '@/components/clients/ClientNotes'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ClientModal from '@/components/clients/ClientModal'
import AddServiceModal from '../../components/clients/AddServiceModal'
import FollowUpForm from '@/components/FollowUpForm'
import dayjs from 'dayjs'
import { getClientStatusLabel } from '@/lib/clientStatus'
import { getLeadNatureLabel } from '@/lib/leadNature'
import { TRANSFER_REASONS, getTransferReasonLabel } from '@/lib/leadTransfer'
import { ASSIGNMENT_STATUSES, ASSIGNMENT_TYPES, getAssignmentStatusLabel, getAssignmentTypeLabel } from '@/lib/clientAssignment'
import { useAuth } from '@/context/AuthContext'
import SalesLedger from '@/components/finance/SalesLedger'
import AddSaleModal from '@/components/finance/AddSaleModal'


const isUuid = (value?: string | null) =>
  Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))

const CONNECTION_CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  facebook: 'Facebook',
  thread: 'Thread',
}



export default function SingleClientPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { clientId } = router.query
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [clientServices, setClientServices] = useState<any[]>([])
  const [showAddSaleModal, setShowAddSaleModal] = useState(false)
  const [openAddModal, setOpenAddModal] = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [number, setNumber] = useState<any[]>([])
  const [followUps, setFollowUps] = useState<ClientFollowUp[]>([])  
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([])
  const [users, setUsers] = useState<{ id: string; name?: string; sudo_name?: string; role?: string }[]>([])
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferTo, setTransferTo] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [assignments, setAssignments] = useState<ClientAssignment[]>([])
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  const [assignmentUserId, setAssignmentUserId] = useState('')
  const [assignmentType, setAssignmentType] = useState('connected')
  const [assignmentStatus, setAssignmentStatus] = useState('connected')
  const [assignmentRemarks, setAssignmentRemarks] = useState('')
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [showFullDetails, setShowFullDetails] = useState(false)
  const [activeClientPanel, setActiveClientPanel] = useState<'people' | 'sales' | 'history' | 'followups' | 'notes'>('people')
  const [historyLimit, setHistoryLimit] = useState(50)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)

  type ClientFollowUp = {
    id: string
    reminder_date: string
    note?: string
    is_completed: boolean
  }

  type TransferLog = {
    id: string
    created_at: string
    previous_status?: string | null
    new_status?: string | null
    changed_by?: string | null
    affected_user?: string | null
    action_type?: string | null
    note?: string | null
    reason?: string | null
    transfer_type?: string | null
    changed_by_name?: string
    affected_user_name?: string
    from_user_name?: string
    to_user_name?: string
  }

  type ClientAssignment = {
    id: string
    user_id: string
    assigned_by?: string | null
    assignment_type?: string | null
    status?: string | null
    remarks?: string | null
    created_at?: string
    updated_at?: string
    users?: {
      name?: string
      sudo_name?: string
    } | null
  }

  const getPlatformLabel = (id: string | undefined) => {
    if (id && CONNECTION_CHANNEL_LABELS[id]) return CONNECTION_CHANNEL_LABELS[id]
    const platform = number.find((n) => n.id === id)
    return platform ? `${platform.platform} (${platform.phone_number})` : id || 'Not Set'
  }

  const fetchClientWithDetails = async () => {
    if (!clientId || typeof clientId !== 'string') return
    setLoading(true)

    // 1. Fetch client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !clientData) {
      toast.error('Failed to fetch client.')
      
      setLoading(false)
      return
    }

    // 2. Fetch connecting platforms (numbers)
    const { data: numberData, error: numberError } = await supabase
      .from('client_contact_channels')
      .select('id, platform, phone_number, assigned_to')

    setNumber(numberData || [])

    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, sudo_name, role')
      .eq('is_active', true)

    setUsers(usersData || [])


    const { data: followUpsData } = await supabase
      .from('follow_ups')
      .select('id, reminder_date, note, is_completed')
      .eq('client_id', clientId)

    // 3. Fetch related services
    const { data: servicesData, error: servicesError } = await supabase.from('services').select('*')
    setServices(servicesData || [])

    // 4. Fetch extra info
    let platformName: string | null = null
    let sudoName: string | null = null
    let leadAgentName: string | null = null

    if (clientData.connecting_platform && CONNECTION_CHANNEL_LABELS[clientData.connecting_platform]) {
      platformName = CONNECTION_CHANNEL_LABELS[clientData.connecting_platform]
    } else if (isUuid(clientData.connecting_platform)) {
      const { data: platformData } = await supabase
        .from('client_contact_channels')
        .select('platform')
        .eq('id', clientData.connecting_platform)
        .single()
      platformName = platformData?.platform || null
    }

    if (clientData.lead_gen_id) {
      const { data: leadGen } = await supabase
        .from('lead_gens')
        .select('name')
        .eq('id', clientData.lead_gen_id)
        .single()
      leadAgentName = leadGen?.name || null
    }

    if (clientData.assigned_to) {
      const { data: userData } = await supabase
        .from('users')
        .select('sudo_name')
        .eq('id', clientData.assigned_to)
        .single()
      sudoName = userData?.sudo_name || null
    }

    // 5. Update client state with extra data
    setClient({
      ...clientData,
      platform_name: platformName,
      sudo_name: sudoName,
      lead_gen_name: leadAgentName,
    })

    // 6. Client sales snapshot
    let serviceDetails: any[] = []

    if (clientId) {
      let salesQuery = supabase
        .from('client_sales')
        .select('id, seller_user_id, sold_items, total_amount, status, invoice_number, sale_date')
        .eq('client_id', clientId)
        .order('sale_date', { ascending: false })

      if (user?.role !== 'admin' && user?.id) {
        salesQuery = salesQuery.eq('seller_user_id', user.id)
      }

      const { data: salesData, error: salesError } = await salesQuery

      if (salesError) {
        console.error('Error fetching client sales:', salesError)
      } else {
        serviceDetails = salesData || []
      }
    }


    setClientServices(serviceDetails)
    await fetchTransferLogs(clientId)
    await fetchAssignments(clientId)
    setLoading(false)
  }

  const fetchAssignments = async (id: string) => {
    const { data, error } = await supabase
      .from('client_assignments')
      .select(`
        id,
        user_id,
        assigned_by,
        assignment_type,
        status,
        remarks,
        created_at,
        updated_at,
        users:user_id(name, sudo_name)
      `)
      .eq('client_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching connected people:', error.message)
      setAssignments([])
      return
    }

    setAssignments((data || []) as ClientAssignment[])
  }

  const fetchTransferLogs = async (id: string, limitOverride = historyLimit) => {
    const pageSize = limitOverride

    const { data: statusLogs, error: statusError } = await supabase
      .from('status_logs')
      .select('id, created_at, previous_status, new_status, changed_by, affected_user, action_type, note')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(pageSize + 1)

    const { data: leadTransfers, error: transferError } = await supabase
      .from('lead_transfers')
      .select('id, created_at, from_user_id, to_user_id, transferred_by, transfer_type, reason, note, client_status_at_transfer, lead_nature')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(pageSize + 1)

    if (statusError) {
      console.error('Error fetching client activity history:', statusError.message)
    }

    if (transferError) {
      console.error('Error fetching transfer history:', transferError.message)
    }

    const normalizedStatusLogs = (statusLogs || []).map((log: any) => ({
      ...log,
      transfer_type: log.action_type,
    }))

    const normalizedTransfers = (leadTransfers || []).map((transfer: any) => ({
      id: transfer.id,
      created_at: transfer.created_at,
      previous_status: transfer.client_status_at_transfer,
      new_status: transfer.client_status_at_transfer,
      changed_by: transfer.transferred_by,
      affected_user: transfer.to_user_id,
      from_user_id: transfer.from_user_id,
      to_user_id: transfer.to_user_id,
      transfer_type: transfer.transfer_type,
      reason: transfer.reason,
      note: transfer.note,
    }))

    const allLogs = [...normalizedStatusLogs, ...normalizedTransfers].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const logs = allLogs.slice(0, pageSize)
    setHasMoreHistory(allLogs.length > pageSize)

    const userIds = Array.from(
      new Set(
        (logs || [])
          .flatMap((log: any) => [log.changed_by, log.affected_user, log.from_user_id, log.to_user_id])
          .filter(Boolean)
      )
    ) as string[]

    let userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, sudo_name')
        .in('id', userIds)

      userMap = Object.fromEntries(
        (usersData || []).map((user: any) => [user.id, user.sudo_name || user.name || user.id])
      )
    }

    setTransferLogs(
      (logs || []).map((log: any) => ({
        ...log,
        changed_by_name: log.changed_by ? userMap[log.changed_by] || log.changed_by : '-',
        affected_user_name: log.affected_user ? userMap[log.affected_user] || log.affected_user : '-',
        from_user_name: log.from_user_id ? userMap[log.from_user_id] || log.from_user_id : '-',
        to_user_name: log.to_user_id ? userMap[log.to_user_id] || log.to_user_id : '-',
      }))
    )
  }

  const logClientActivity = async ({
    actionType,
    note,
    affectedUser,
    previousStatus = client?.status || null,
    newStatus = client?.status || null,
  }: {
    actionType: string
    note: string
    affectedUser?: string | null
    previousStatus?: string | null
    newStatus?: string | null
  }) => {
    if (!clientId || typeof clientId !== 'string') return

    const { error } = await supabase.from('status_logs').insert({
      client_id: clientId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: user?.id || null,
      affected_user: affectedUser || null,
      action_type: actionType,
      note,
    })

    if (error) console.error('Failed to write client activity:', error)
  }

  const isConnectedUser = Boolean(user && assignments.some((assignment) => assignment.user_id === user.id))
  const canEditMainClient = Boolean(user && client && (user.role === 'admin' || client.assigned_to === user.id))
  const canWorkClient = Boolean(canEditMainClient || isConnectedUser)
  const nonAdminUsers = users.filter((item) => item.role !== 'admin')
  const connectedPersonUsers = users
  const getTimelineTitle = (log: TransferLog) => {
    const type = log.transfer_type || log.action_type || 'status_changed'
    const labels: Record<string, string> = {
      client_created: 'Client Added',
      client_info_updated: 'Client Info Updated',
      client_transferred: 'Lead Transferred',
      transfer: 'Lead Transferred',
      initial_assignment: 'Initial Assignment',
      status_changed: 'Status Changed',
      service_assigned: 'Service Assigned',
      connected_person_added: 'Connected Person Added',
      connected_person_updated: 'Connected Person Updated',
      connected_person_removed: 'Connected Person Removed',
      follow_up_created: 'Follow-Up Added',
      follow_up_updated: 'Follow-Up Updated',
      follow_up_completed: 'Follow-Up Completed',
      follow_up_rescheduled: 'Follow-Up Rescheduled',
      follow_up_deleted: 'Follow-Up Deleted',
      client_note_added: 'Note / Asset Added',
      client_note_updated: 'Note / Asset Updated',
      client_note_deleted: 'Note / Asset Deleted',
      sale_added: 'Sale Added',
      payment_added: 'Payment Added',
      commission_split_added: 'Commission Split Added',
      commission_split_updated: 'Commission Split Updated',
      commission_locked: 'Commission Locked',
    }

    return labels[type] || type.replace(/_/g, ' ')
  }

  const getTimelineMeta = (log: TransferLog) => {
    const type = log.transfer_type || log.action_type || ''

    if (type === 'transfer' || type === 'client_transferred' || type === 'initial_assignment') {
      return `From ${log.from_user_name || '-'} to ${log.to_user_name || log.affected_user_name || '-'}`
    }

    if (type.startsWith('connected_person')) {
      const actorName = log.changed_by_name || '-'
      const personName = log.affected_user_name || '-'

      if (type === 'connected_person_added') return `${actorName} connected this client with ${personName}`
      if (type === 'connected_person_updated') return `${actorName} updated this client's connection with ${personName}`
      if (type === 'connected_person_removed') return `${actorName} removed ${personName} from this client`

      return `${actorName} changed this client's connection with ${personName}`
    }

    if (type.startsWith('follow_up')) {
      return `By ${log.changed_by_name || '-'}${log.affected_user_name && log.affected_user_name !== '-' ? ` | Assigned to ${log.affected_user_name}` : ''}`
    }

    if (type.startsWith('client_note')) {
      const actorName = log.changed_by_name || '-'

      if (type === 'client_note_added') return `${actorName} added a note or asset`
      if (type === 'client_note_updated') return `${actorName} updated a note or asset`
      if (type === 'client_note_deleted') return `${actorName} deleted a note or asset`

      return `By ${actorName}`
    }

    if (type.startsWith('sale') || type.startsWith('payment') || type.startsWith('commission')) {
      return `By ${log.changed_by_name || '-'}${log.affected_user_name && log.affected_user_name !== '-' ? ` | Related to ${log.affected_user_name}` : ''}`
    }

    if (type === 'status_changed') {
      return `Changed by ${log.changed_by_name || '-'}`
    }

    return `By ${log.changed_by_name || '-'}${log.affected_user_name && log.affected_user_name !== '-' ? ` | Related to ${log.affected_user_name}` : ''}`
  }

  const openAddAssignmentModal = () => {
    setEditingAssignmentId(null)
    setAssignmentUserId('')
    setAssignmentType('connected')
    setAssignmentStatus('connected')
    setAssignmentRemarks('')
    setShowAssignmentModal(true)
  }

  const handleSaveAssignment = async () => {
    if (!user || !client || !clientId || typeof clientId !== 'string') return
    if (!assignmentUserId) return toast.error('Please select a person.')
    if (!assignmentType) return toast.error('Please select this person role.')

    setAssignmentLoading(true)

    const existing = editingAssignmentId
      ? assignments.find((assignment) => assignment.id === editingAssignmentId)
      : assignments.find((assignment) => assignment.user_id === assignmentUserId)
    const resolvedAssignmentType = assignmentUserId === client.assigned_to ? 'primary' : assignmentType
    const payload = {
      client_id: clientId,
      user_id: assignmentUserId,
      assigned_by: user.id,
      lead_gen_id: client.lead_gen_id || null,
      assignment_type: resolvedAssignmentType,
      status: assignmentStatus,
      remarks: assignmentRemarks.trim() || null,
      lead_nature: client.lead_nature || null,
    }
    const assignmentChanged =
      !existing ||
      existing.user_id !== assignmentUserId ||
      existing.assignment_type !== resolvedAssignmentType ||
      existing.status !== assignmentStatus ||
      (existing.remarks || '').trim() !== (payload.remarks || '')

    const result = existing
      ? await supabase.from('client_assignments').update(payload).eq('id', existing.id)
      : await supabase.from('client_assignments').insert(payload)

    if (result.error) {
      console.error(result.error)
      toast.error('Failed to save connected person.')
    } else {
      const person = users.find((item) => item.id === assignmentUserId)
      const personName = person?.sudo_name || person?.name || 'Connected person'
      const actionType = existing ? 'connected_person_updated' : 'connected_person_added'
      const remarks = assignmentRemarks.trim()

      if (assignmentChanged) {
        await logClientActivity({
          actionType,
          affectedUser: assignmentUserId,
          note: `${existing ? 'Updated' : 'Added'} connected person: ${personName}${remarks ? `. Comment: ${remarks}` : ''}`,
        })
      }

      toast.success('Connected person saved.')
      setShowAssignmentModal(false)
      setEditingAssignmentId(null)
      setAssignmentUserId('')
      setAssignmentType('connected')
      setAssignmentStatus('connected')
      setAssignmentRemarks('')
      await fetchAssignments(clientId)
      await fetchTransferLogs(clientId)
    }

    setAssignmentLoading(false)
  }

  const handleDeleteAssignment = async (assignment: ClientAssignment) => {
    if (!client || !clientId || typeof clientId !== 'string' || !canEditMainClient) return

    const isPrimaryAssignment = assignment.assignment_type === 'primary' || assignment.user_id === client.assigned_to
    if (isPrimaryAssignment) {
      toast.error('Primary owner cannot be removed here. Use Transfer Lead first.')
      return
    }

    const personName = assignment.users?.sudo_name || assignment.users?.name || 'this person'
    if (!window.confirm(`Remove ${personName} from connected people?`)) return

    const { error } = await supabase
      .from('client_assignments')
      .delete()
      .eq('id', assignment.id)

    if (error) {
      console.error(error)
      toast.error('Failed to remove connected person.')
      return
    }

    toast.success('Connected person removed.')
    await logClientActivity({
      actionType: 'connected_person_removed',
      affectedUser: assignment.user_id,
      note: `Removed connected person: ${personName}${assignment.remarks ? `. Previous comment: ${assignment.remarks}` : ''}`,
    })
    await fetchAssignments(clientId)
    await fetchTransferLogs(clientId)
  }

  const handleTransferLead = async () => {
    if (!user || !client || !clientId || typeof clientId !== 'string') return
    if (!transferTo) return toast.error('Please select who should receive this lead.')
    if (transferTo === client.assigned_to) return toast.error('This lead is already assigned to that user.')
    if (!transferReason) return toast.error('Please select a transfer reason.')

    setTransferLoading(true)

    const { error: updateError } = await supabase
      .from('clients')
      .update({ assigned_to: transferTo })
      .eq('id', clientId)

    if (updateError) {
      toast.error('Failed to transfer lead.')
      console.error(updateError)
      setTransferLoading(false)
      return
    }

    const { error: transferError } = await supabase.from('lead_transfers').insert({
      client_id: clientId,
      lead_gen_id: client.lead_gen_id || null,
      from_user_id: client.assigned_to || null,
      to_user_id: transferTo,
      transferred_by: user.id,
      transfer_type: 'transfer',
      reason: transferReason,
      note: transferNote.trim() || null,
      client_status_at_transfer: client.status || null,
      lead_nature: client.lead_nature || null,
    })

    if (transferError) {
      toast.error('Lead owner changed, but transfer history failed to save.')
      console.error(transferError)
    } else {
      toast.success('Lead transferred successfully.')
    }

    setShowTransferModal(false)
    setTransferTo('')
    setTransferReason('')
    setTransferNote('')
    setTransferLoading(false)
    await fetchClientWithDetails()
  }

  const fetchFollowUps = async () => {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('id, reminder_date, note, is_completed')
      .eq('client_id', clientId)

    if (error) {
      console.error('Error fetching follow-ups:', error.message)
    } else {
      setFollowUps(data as ClientFollowUp[])
    }
  }

  useEffect(() => {
    if (!router.isReady || !clientId || typeof clientId !== 'string' || !user) return
    fetchClientWithDetails()
    if (clientId) fetchFollowUps()

  }, [router.isReady, clientId, user?.id])


  if (!router.isReady || loading) {
  return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#1A1A1D]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-t-4 border-yellow-400 animate-spin"></div>
        </div>
        <p className="mt-4 text-sm text-yellow-300">Loading client info, please wait...</p>
      </div>
    )
  }

  if (!client) {
    return <div className="text-red-500 p-8">Client not found.</div>
  }

  if (!clientId || typeof clientId !== 'string') return <div className="text-red-500 p-8">Invalid client ID.</div>

  if (!canWorkClient) {
    return (
      <Layout>
        <div className="mt-6 rounded-lg border border-gray-800 bg-[#1c1c1e] p-6 text-white">
          <h1 className="text-xl font-semibold">Access restricted</h1>
          <p className="mt-2 text-sm text-gray-400">
            This client is visible only to the primary owner, connected people, and admins.
          </p>
          <Link href="/all-clients">
            <button className="mt-4 rounded bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600">
              Back to Clients
            </button>
          </Link>
        </div>
      </Layout>
    )
  }

  
  return (
    
    <Layout>
      <div className="bg-[#1c1c1e] text-white p-6 rounded-xl mt-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{client.client_name}</h1>
            <div className="mt-2 flex gap-2 flex-wrap">
              <span className="bg-blue-700 text-white px-3 py-1 text-xs rounded-full capitalize">
                {getClientStatusLabel(client.status)}
              </span>
              {client.platform && (
                <span className="bg-gray-700 px-3 py-1 text-xs rounded-full">
                  {client.platform}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
              <Link href="/all-clients">
                <button className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded">
                  ← Back to Clients
                </button>
              </Link>

              
              {canEditMainClient && (
                <>
              <button
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded"
                onClick={() => setShowTransferModal(true)}
              >
                Transfer Lead
              </button>
                </>
              )}
             
              {canEditMainClient && (
                <>
              <button
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded"
                onClick={openAddAssignmentModal}
              >
                Add Connected Person
              </button>

              <button onClick={() => {
                setShowAddSaleModal(true)
                setActiveClientPanel('sales')
              }} className="hidden bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded">
                ➕ Add Service
              </button>
              
            
              <button
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded"
                onClick={() => {
                  setShowAddSaleModal(true)
                  setActiveClientPanel('sales')
                }}
              >
                Add Sale
              </button>

              <button
                className="bg-[#c29a4b] hover:bg-[#d3aa57] text-black text-sm px-4 py-2 rounded"
                onClick={() => setShowEditModal(true)}
              >
                Edit Client Info
              </button>
                </>
              )}
             
            </div>  
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryItem label="Owner" value={client?.sudo_name || '-'} />
          <SummaryItem label="Lead Gen" value={client.lead_gen_name || '-'} />
          <SummaryItem label="Connected People" value={assignments.length} />
          <SummaryItem label="Sales" value={clientServices.length} />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Client Info Section (2 columns) */}
          <div className="md:col-span-2">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-[#2a2a2a] p-4 rounded-lg ${showFullDetails ? '' : 'max-h-48 overflow-hidden'}`}>
              <InfoItem label="Phone" value={client.phone_numbers?.[0]} />
              <InfoItem label="Email Address" value={client.email_addresses} />
              <InfoItem label="Work Email" value={client.work_email} />
              <InfoItem
                label="Profile URL"
                value={
                  client.profile_url ? (() => {
                    try {
                      const url = new URL(
                        client.profile_url.startsWith('http')
                          ? client.profile_url
                          : `https://${client.profile_url}`
                      )
                      const domain = url.hostname.replace('www.', '')
                      return (
                        <a
                          href={url.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 underline hover:text-blue-300"
                        >
                          {domain}
                        </a>
                      )
                    } catch {
                      return client.profile_url
                    }
                  })() : '-'
                }
              />

              <InfoItem
                label="Website URL"
                value={
                  client.website_url ? (() => {
                    try {
                      const url = new URL(
                        client.website_url.startsWith('http')
                          ? client.website_url
                          : `https://${client.website_url}`
                      )
                      const domain = url.hostname.replace('www.', '')
                      return (
                        <a
                          href={url.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 underline hover:text-blue-300"
                        >
                          {domain}
                        </a>
                      )
                    } catch {
                      return client.website_url
                    }
                  })() : '-'
                }
              />
              <InfoItem label="Connecting Platform" value={getPlatformLabel(client.connecting_platform)}/>
              <InfoItem
                  label="Business Name"
                  value={
                    client.business_name ? (
                      <span className="font-semibold text-white">{client.business_name}</span>
                    ) : (
                      '-'
                    )
                  }
                />
                <InfoItem
                  label="Secondary Phone Numbers"
                  value={
                    Array.isArray(client.secondary_phones) && client.secondary_phones.length > 0
                      ? client.secondary_phones.join(', ')
                      : '-'
                  }
                />


              <InfoItem label="Assigned To" value={client?.sudo_name || '-'} />
              <InfoItem label="Gender" value={client.gender} />
              <InfoItem label="Lead Gen Agent" value={client.lead_gen_name || '-'} />
              <InfoItem label="Lead Nature" value={getLeadNatureLabel(client.lead_nature)} />
              <InfoItem label="Created At" value={new Date(client.created_at).toLocaleString()} />
            </div>
            <button
              className="mt-2 rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
              onClick={() => setShowFullDetails((value) => !value)}
            >
              {showFullDetails ? 'Show less' : 'Show all details'}
            </button>
          </div>

         
          {/* Sales Section with Smooth Scroll */}
          <div className="max-h-[350px] overflow-y-auto pr-2 scroll-smooth scrollbar-custom">

            <div className="grid grid-cols-1 gap-4">
              {clientServices.length === 0 ? (
                <div className="text-gray-400 text-sm">No sales added yet.</div>
              ) : (
                clientServices.map((service) => {
                  return (
                    <div
                      key={service.id}
                      className="p-4 rounded-lg text-white shadow-md bg-[#161719] border border-gray-700"
                    >
                      <h3 className="text-lg font-bold">{service.sold_items?.split('\n')[0]?.replace('Service: ', '') || 'Sale'}</h3>
                      <p className="mt-1 text-sm text-slate-300">
                        {service.sold_items && service.sold_items.length > 120
                          ? service.sold_items.substring(0, 120) + '...'
                          : service.sold_items || 'No sale details available'}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-semibold text-[#c29a4b]">${service.total_amount}</span>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/finance/sales/${service.id}`}>
                            <button className="rounded bg-sky-700 px-2 py-1 text-xs text-white hover:bg-sky-600">
                              Payments
                            </button>
                          </Link>
                          <span className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">{service.status}</span>
                        </div>
                      </div>
                      {service.invoice_number && <p className="mt-2 text-xs text-slate-500">Invoice: {service.invoice_number}</p>}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'people', label: `People (${assignments.length})` },
            { id: 'sales', label: 'Sales' },
            { id: 'history', label: `History (${transferLogs.length})` },
            { id: 'followups', label: 'Follow-ups' },
            { id: 'notes', label: 'Notes / Assets' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`rounded border px-4 py-2 text-sm transition ${
                activeClientPanel === tab.id
                  ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                  : 'border-slate-700 bg-[#101113] text-slate-300 hover:border-slate-500'
              }`}
              onClick={() => setActiveClientPanel(tab.id as typeof activeClientPanel)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={`${activeClientPanel === 'people' ? 'block' : 'hidden'} bg-[#202124] p-4 rounded-lg border border-gray-800`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#c29a4b]">Connected People</h3>
            {canEditMainClient && (
              <button
                className="rounded bg-sky-700 px-3 py-1.5 text-sm text-white hover:bg-sky-600"
                onClick={openAddAssignmentModal}
              >
                Add Person
              </button>
            )}
          </div>

          {assignments.length === 0 ? (
            <p className="text-sm text-gray-400">No connected people yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignments.map((assignment) => {
                const isPrimaryAssignment = assignment.assignment_type === 'primary' || assignment.user_id === client.assigned_to
                const canEditAssignment = canEditMainClient || assignment.user_id === user?.id
                return (
                  <div key={assignment.id} className="rounded border border-gray-700 bg-[#161719] p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-white">
                          {assignment.users?.sudo_name || assignment.users?.name || 'Unknown'}
                        </div>
                        <div className="mt-1 text-xs uppercase text-gray-500">
                          {getAssignmentTypeLabel(assignment.assignment_type)}
                        </div>
                      </div>
                      <span className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200">
                        {getAssignmentStatusLabel(assignment.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-gray-300">{assignment.remarks || 'No remarks yet.'}</p>
                    {canEditAssignment && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="rounded bg-gray-700 px-3 py-1 text-xs text-white hover:bg-gray-600"
                          onClick={() => {
                            setEditingAssignmentId(assignment.id)
                            setAssignmentUserId(assignment.user_id)
                            setAssignmentType(assignment.assignment_type && assignment.assignment_type !== 'primary' ? assignment.assignment_type : 'connected')
                            setAssignmentStatus(assignment.status || 'connected')
                            setAssignmentRemarks(assignment.remarks || '')
                            setShowAssignmentModal(true)
                          }}
                        >
                          Update
                        </button>
                        {canEditMainClient && !isPrimaryAssignment && (
                          <button
                            className="rounded bg-rose-900/70 px-3 py-1 text-xs text-rose-100 hover:bg-rose-800"
                            onClick={() => handleDeleteAssignment(assignment)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

          <div className={`${activeClientPanel === 'sales' ? 'block' : 'hidden'} mt-6`}>
            <SalesLedger clientId={clientId} clientName={client.client_name} />
          </div>

        <div className={`${activeClientPanel === 'history' ? 'block' : 'hidden'} bg-[#2a2a2a] p-4 rounded-lg`}>
          <h3 className="text-lg font-semibold mb-3 text-[#c29a4b]">Client Timeline</h3>
          {transferLogs.length === 0 ? (
            <p className="text-sm text-gray-400">No client history yet.</p>
          ) : (
            <div className="relative space-y-4 border-l border-gray-700 pl-4">
              {transferLogs.map((log) => (
                <div key={`${log.transfer_type || log.action_type}-${log.id}`} className="relative rounded border border-gray-700 bg-[#1b1c1f] p-3 text-sm">
                  <span className="absolute -left-[23px] top-4 h-3 w-3 rounded-full border border-[#c29a4b] bg-[#2a2a2a]" />
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium capitalize">
                      {getTimelineTitle(log)}
                    </span>
                    <span className="text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  {log.previous_status !== log.new_status && (log.previous_status || log.new_status) && (
                  <div className="mt-2 text-gray-300">
                    <span>{getClientStatusLabel(log.previous_status || '')}</span>
                    <span className="mx-2">to</span>
                    <span>{getClientStatusLabel(log.new_status || '')}</span>
                  </div>
                  )}
                  <div className="mt-1 text-gray-400">
                    {getTimelineMeta(log)}
                  </div>
                  {log.reason && <div className="mt-1 text-gray-400">Reason: {getTransferReasonLabel(log.reason)}</div>}
                  {log.note && <div className="mt-1 whitespace-pre-line break-words text-gray-300">{log.note}</div>}
                </div>
              ))}
              {hasMoreHistory && (
                <button
                  className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
                  onClick={async () => {
                    const nextLimit = historyLimit + 50
                    setHistoryLimit(nextLimit)
                    await fetchTransferLogs(client.id, nextLimit)
                  }}
                >
                  Load more history
                </button>
              )}
            </div>
          )}
        </div>

      <div className={`${activeClientPanel === 'followups' ? 'block' : 'hidden'} mt-6`}>
        {/* Follow-up Reminders */}
        <div className="bg-gray-800 p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">🔔 Follow-up Reminders</h3>
          <div className="mt-4">
            <FollowUpForm
              clientId={clientId}
              onSaved={() => {
                fetchFollowUps()
                fetchTransferLogs(clientId)
              }}
            />
          </div>
        </div>
      </div>

      <div className={`${activeClientPanel === 'notes' ? 'block' : 'hidden'} mt-6`}>
        {/* Notes / Assets Section */}
        <div className="bg-gray-800 p-4 rounded shadow">
          <ClientNotes
            clientId={client.id}
            currentUser="system_admin"
            onActivitySaved={() => fetchTransferLogs(client.id)}
          />
        </div>
      </div>



      </div>

      <ClientModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false)
            fetchClientWithDetails()
          }}
          clientData={client}
          currentUser={user}
          isServiceEditable={false}
        />

      {showTransferModal && client && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1c1c1e] text-white rounded-xl p-6 w-full max-w-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-[#c29a4b]">Transfer Lead</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Transfer To</label>
                <select
                  className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                >
                  <option value="">Select seller</option>
                  {nonAdminUsers
                    .filter((item) => item.id !== client.assigned_to)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sudo_name || item.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Reason</label>
                <select
                  className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                >
                  <option value="">Select reason</option>
                  {TRANSFER_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Note</label>
                <textarea
                  className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2 min-h-24"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Optional transfer context"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
                  onClick={() => setShowTransferModal(false)}
                  disabled={transferLoading}
                >
                  Cancel
                </button>
                <button
                  className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded"
                  onClick={handleTransferLead}
                  disabled={transferLoading}
                >
                  {transferLoading ? 'Transferring...' : 'Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssignmentModal && client && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1c1c1e] text-white rounded-xl p-6 w-full max-w-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-[#c29a4b]">Connected Person</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Person</label>
                <select
                  className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2 disabled:opacity-60"
                  value={assignmentUserId}
                  onChange={(e) => setAssignmentUserId(e.target.value)}
                  disabled={!canEditMainClient || Boolean(editingAssignmentId)}
                >
                  <option value="">Select person</option>
                  {connectedPersonUsers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sudo_name || item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Role</label>
                <select
                  className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2"
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value)}
                  disabled={assignmentUserId === client.assigned_to}
                >
                  {ASSIGNMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {assignmentUserId === client.assigned_to && (
                  <p className="mt-1 text-xs text-gray-400">The primary owner is tracked separately from nurturer/seller roles.</p>
                )}
              </div>

              <div>
                <label className="block text-sm mb-1">Status</label>
                <select
                  className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2"
                  value={assignmentStatus}
                  onChange={(e) => setAssignmentStatus(e.target.value)}
                >
                  {ASSIGNMENT_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Remarks</label>
                <textarea
                  className="w-full bg-[#111] border border-gray-600 rounded px-3 py-2 min-h-24"
                  value={assignmentRemarks}
                  onChange={(e) => setAssignmentRemarks(e.target.value)}
                  placeholder="Add remarks for this person"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
                  onClick={() => {
                    setShowAssignmentModal(false)
                    setEditingAssignmentId(null)
                    setAssignmentUserId('')
                    setAssignmentType('connected')
                    setAssignmentStatus('connected')
                    setAssignmentRemarks('')
                  }}
                  disabled={assignmentLoading}
                >
                  Cancel
                </button>
                <button
                  className="bg-sky-700 hover:bg-sky-600 px-4 py-2 rounded"
                  onClick={handleSaveAssignment}
                  disabled={assignmentLoading}
                >
                  {assignmentLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddSaleModal
        isOpen={showAddSaleModal}
        onClose={() => setShowAddSaleModal(false)}
        clientId={clientId}
        clientName={client.client_name}
        onSaved={fetchClientWithDetails}
      />

      <AddServiceModal
        isOpen={openAddModal}
        onClose={() => setOpenAddModal(false)}
        clientId={clientId}
        services={services}
        onServiceAssigned={fetchClientWithDetails} // 👈 REFRESH SERVICES
      />

    </Layout>
  )
}

function SummaryItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#161719] p-4">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="mt-2 truncate text-lg font-semibold text-white">{value || '-'}</div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-gray-400 text-xs uppercase tracking-wide">{label}</span>
      <span className="text-white mt-1">{value || '—'}</span>
    </div>
  )

  
}
