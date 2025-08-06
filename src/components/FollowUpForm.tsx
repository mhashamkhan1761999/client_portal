'use client'

import { useState, useEffect } from 'react'
import supabase from '@/lib/supabaseClient'

// Define type for follow-up reminder
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

  useEffect(() => {
    if (existingReminder) {
      setReminderDate(existingReminder.reminder_date)
      setNote(existingReminder.note || '')
    }
  }, [existingReminder])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('User not authenticated')
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
      console.error(result.error.message)
      return
    }

    onSaved?.()
    onClose?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white dark:bg-gray-900 rounded shadow">
      <label className="block">
        Reminder Date:
        <input
          type="date"
          className="mt-1 w-full border p-2 rounded"
          value={reminderDate}
          onChange={(e) => setReminderDate(e.target.value)}
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

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? 'Saving...' : existingReminder ? 'Update Reminder' : 'Save Reminder'}
      </button>
    </form>
  )
}
