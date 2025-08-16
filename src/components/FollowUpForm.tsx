'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

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
  const [reminderDate, setReminderDate] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [upcomingReminders, setUpcomingReminders] = useState<FollowUpReminder[]>([])
  const router = useRouter()

  useEffect(() => {
    if (existingReminder?.reminder_date) {
      // Parse UTC from DB, convert to PKT for input
      const local = dayjs.utc(existingReminder.reminder_date).tz('Asia/Karachi').format('YYYY-MM-DDTHH:mm')
      setReminderDate(local)
      setNote(existingReminder.note || '')
    }
  }, [existingReminder])

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

    // Filter only upcoming (future) reminders
    const upcoming = (data || []).filter((r: any) =>
      dayjs(r.reminder_date).isAfter(dayjs())
    )

    // Map added_by name
    const mapped = upcoming.map((r: any) => ({
      ...r,
      added_by: r.users?.name || 'Unknown',
    }))

    setUpcomingReminders(mapped.slice(0, 2)) // only top 2
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

    // Convert PKT → UTC
    const utcTime = dayjs.tz(reminderDate, 'Asia/Karachi').utc().format()

    const payload = {
      client_id: clientId,
      user_id: user.id,
      reminder_date: utcTime,
      note,
      is_completed: false,
    }

    let result
    if (existingReminder?.id) {
      result = await supabase
        .from('follow_ups')
        .update(payload)
        .eq('id', existingReminder.id)
    } else {
      result = await supabase.from('follow_ups').insert(payload)
    }

    setLoading(false)

    if (result.error) {
      toast.error('Error saving reminder')
      console.error(result.error)
      return
    }

    toast.success(`Reminder saved for ${dayjs(reminderDate).format('MMM D, YYYY h:mm A')}`)

    setReminderDate('')
    setNote('')
    await fetchUpcomingReminders()
    onSaved?.()
    onClose?.()
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-900 rounded shadow">
      {/* Top 2 upcoming reminders */}
      <div className="mt-4 p-3 border rounded">
        <h3 className="font-bold mb-2">Upcoming Reminders</h3>
        {upcomingReminders.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming reminders</p>
        ) : (
          <ul>
            {upcomingReminders.map((reminder) => (
              <li key={reminder.id} className="text-sm py-1">
                📅 {dayjs.utc(reminder.reminder_date).tz('Asia/Karachi').format('MMM D, YYYY h:mm A')}
                {' — '}
                {reminder.note || 'No note'}{' '}
                <span className="text-gray-400 italic">— Added by {reminder.added_by}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          Reminder Date:
          <input
            type="datetime-local"
            className="mt-1 w-full border p-2 rounded"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
            min={dayjs().tz('Asia/Karachi').format('YYYY-MM-DDTHH:mm')}
            required
          />
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
            {loading
              ? 'Saving...'
              : existingReminder
              ? 'Update Reminder'
              : 'Save Reminder'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/follow-ups')}
            className="text-sm text-blue-600 hover:underline"
          >
            View All Reminders →
          </button>
        </div>
      </form>
    </div>
  )
}
