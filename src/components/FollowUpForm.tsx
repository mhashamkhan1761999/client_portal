'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import {
  DEFAULT_FOLLOW_UP_TIME_ZONE,
  FOLLOW_UP_TIME_ZONES,
  followUpInputToUtc,
  formatFollowUpTime,
  getFollowUpTimeZoneLabel,
  nowFollowUpInput,
  utcToFollowUpInput,
} from '@/lib/followUpTime'

type FollowUpReminder = {
  id?: string
  reminder_date: string
  note?: string
  user_id?: string
  added_by?: string
}

type FollowUpFormProps = {
  clientId: string
  existingReminder?: FollowUpReminder | null
  onSaved?: () => void
  onClose?: () => void
}

export default function FollowUpForm({
  clientId,
  existingReminder = null,
  onSaved,
  onClose,
}: FollowUpFormProps) {
  const [reminderDate, setReminderDate] = useState('')
  const [reminderTimeZone, setReminderTimeZone] = useState(DEFAULT_FOLLOW_UP_TIME_ZONE)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [upcomingReminders, setUpcomingReminders] = useState<FollowUpReminder[]>([])
  const router = useRouter()

  useEffect(() => {
    if (existingReminder?.reminder_date) {
      setReminderDate(utcToFollowUpInput(existingReminder.reminder_date, reminderTimeZone))
      setNote(existingReminder.note || '')
    }
  }, [existingReminder, reminderTimeZone])

  useEffect(() => {
    fetchUpcomingReminders()
  }, [])

  const fetchUpcomingReminders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('follow_ups')
      .select('*, users:user_id(name)')
      .eq('is_completed', false)
      .eq('client_id', clientId)
      .order('reminder_date', { ascending: true })

    if (error) {
      console.error('Error fetching reminders:', error.message)
      return
    }

    const upcoming = (data || []).filter((r: any) => dayjs(r.reminder_date).isAfter(dayjs()))
    const mapped = upcoming.map((r: any) => ({
      ...r,
      added_by: r.users?.name || 'Unknown',
    }))

    setUpcomingReminders(mapped.slice(0, 2))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('User not authenticated')
      setLoading(false)
      return
    }

    if (!reminderDate) {
      toast.error('Please select a reminder date')
      setLoading(false)
      return
    }

    const utcTime = followUpInputToUtc(reminderDate, reminderTimeZone)

    const payload = {
      client_id: clientId,
      user_id: user.id,
      reminder_date: utcTime,
      note,
      is_completed: false,
    }

    const result = existingReminder?.id
      ? await supabase.from('follow_ups').update(payload).eq('id', existingReminder.id)
      : await supabase.from('follow_ups').insert(payload)

    setLoading(false)

    if (result.error) {
      toast.error('Error saving reminder')
      console.error(result.error)
      return
    }

    const activityNote = existingReminder?.id
      ? `Updated follow-up for ${formatFollowUpTime(utcTime)}${note.trim() ? `. Comment: ${note.trim()}` : ''}`
      : `Added follow-up for ${formatFollowUpTime(utcTime)}${note.trim() ? `. Comment: ${note.trim()}` : ''}`

    await supabase.from('status_logs').insert({
      client_id: clientId,
      previous_status: null,
      new_status: null,
      changed_by: user.id,
      affected_user: user.id,
      action_type: existingReminder?.id ? 'follow_up_updated' : 'follow_up_created',
      note: activityNote,
    })

    toast.success(
      `Reminder saved for ${dayjs(reminderDate).format('MMM D, YYYY h:mm A')} ${getFollowUpTimeZoneLabel(reminderTimeZone)}`
    )

    setReminderDate('')
    setNote('')
    await fetchUpcomingReminders()
    onSaved?.()
    onClose?.()
  }

  return (
    <div className="space-y-4 p-4 bg-gray-900 rounded shadow">
      <div className="mt-4 p-3 border rounded">
        <h3 className="font-bold mb-2">Upcoming Reminders</h3>
        {upcomingReminders.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming reminders</p>
        ) : (
          <ul>
            {upcomingReminders.map((reminder) => (
              <li key={reminder.id} className="text-sm py-1">
                Reminder: {formatFollowUpTime(reminder.reminder_date, 'MMM D, YYYY h:mm A', reminderTimeZone)}
                {' - '}
                {reminder.note || 'No note'}{' '}
                <span className="text-gray-400 italic">- Added by {reminder.added_by}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          Reminder Date:
          <input
            type="datetime-local"
            className="mt-1 w-full border p-2 rounded"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
            min={nowFollowUpInput(reminderTimeZone)}
            required
          />
        </label>

        <label className="block">
          Client Time Zone:
          <select
            className="mt-1 w-full border p-2 rounded bg-gray-900"
            value={reminderTimeZone}
            onChange={(e) => setReminderTimeZone(e.target.value)}
          >
            {FOLLOW_UP_TIME_ZONES.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          Note:
          <textarea
            className="mt-1 w-full border p-2 rounded"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="flex justify-between items-center">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? 'Saving...' : existingReminder ? 'Update Reminder' : 'Save Reminder'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/follow-ups')}
            className="text-sm text-blue-600 hover:underline"
          >
            View All Reminders
          </button>
        </div>
      </form>
    </div>
  )
}
