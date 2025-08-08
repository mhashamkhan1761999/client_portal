'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Types
type FollowUpReminder = {
  id?: string
  reminder_date: string
  note?: string
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
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    if (existingReminder) {
      setReminderDate(existingReminder.reminder_date)
      setNote(existingReminder.note || '')
    }
  }, [existingReminder])

  useEffect(() => {
    fetchUpcomingReminders()
  }, [])

  // Fetch the top 2 upcoming reminders for the current user
  const fetchUpcomingReminders = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('is_completed', false)
      .order('reminder_date', { ascending: true })
      .limit(2) // limit to 2

    if (error) {
      console.error('Error fetching reminders:', error.message)
      return
    }

    setUpcomingReminders(data || [])
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User not authenticated')
      setLoading(false)
      return
    }

    const payload = {
      client_id: clientId,
      user_id: user.id,
      reminder_date: reminderDate,
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

    const formattedDate = new Date(reminderDate).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    toast.success(`Reminder saved for ${formattedDate}`)

    // Clear form
    setReminderDate('')
    setNote('')

    // Refresh top reminders
    await fetchUpcomingReminders()

    onSaved?.()
    onClose?.()
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-900 rounded shadow">
      {/* Top 2 upcoming reminders */}
      <div className="mt-4 p-3 border rounded">
        <h3 className="font-bold mb-2">Top 2 Upcoming Reminders</h3>
        {upcomingReminders.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming reminders</p>
        ) : (
          <ul>
            {upcomingReminders.map((reminder) => (
              <li key={reminder.id} className="text-sm py-1">
                📅{' '}
                {new Date(reminder.reminder_date).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}{' '}
                — {reminder.note || 'No note'}
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
            min={new Date().toISOString().slice(0, 16)}
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
