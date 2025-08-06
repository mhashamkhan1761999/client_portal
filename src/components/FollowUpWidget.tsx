'use client'

import { useEffect, useState } from 'react'
import supabase  from '@/lib/supabaseClient'
import dayjs from 'dayjs'

// Define types for the reminder
type FollowUpReminder = {
  id: string
  reminder_date: string
  note?: string
  is_completed: boolean
  client_id: string
  clients: {
    client_name: string
  }[] // 👈 Fix: make this an array
}

export default function FollowUpWidget() {
  const [followUps, setFollowUps] = useState<FollowUpReminder[]>([])

  useEffect(() => {
    fetchFollowUps()
  }, [])

  const fetchFollowUps = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Not authenticated')
      return
    }

    const today = dayjs().format('YYYY-MM-DD')

    const { data, error } = await supabase
    .from('follow_ups')
    .select('id, reminder_date, note, is_completed, client_id, clients(client_name)')
    .eq('user_id', user.id)
    .eq('is_completed', false)
    .lte('reminder_date', today)
    .order('reminder_date', { ascending: true })

    if (error) {
    console.error('Failed to fetch reminders:', error.message)
    return
    }

    setFollowUps(data as FollowUpReminder[])

  const markDone = async (id: string) => {
    await supabase.from('follow_ups').update({ is_completed: true }).eq('id', id)
    fetchFollowUps()
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
      <h2 className="text-lg font-bold mb-2">📌 Today's & Overdue Follow-ups</h2>
      {followUps.length === 0 ? (
        <p className="text-sm text-gray-400">No follow-ups due.</p>
      ) : (
        <ul className="space-y-3">
          {followUps.map(reminder => (
            <li key={reminder.id} className="p-3 border rounded flex justify-between items-start">
              <div>
                <p className="font-semibold">{reminder.clients?.[0]?.client_name}</p>
                <p className="text-sm">Due: {dayjs(reminder.reminder_date).format('MMM D')}</p>
                {reminder.note && <p className="text-xs italic">{reminder.note}</p>}
              </div>
              <button onClick={() => markDone(reminder.id)} className="text-green-600 text-sm">
                ✅ Done
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
}