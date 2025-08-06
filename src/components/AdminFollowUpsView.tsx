'use client'

import { useEffect, useState } from 'react'
import supabase  from '@/lib/supabaseClient'
import dayjs from 'dayjs'

type AdminFollowUpReminder = {
  id: string
  reminder_date: string
  is_completed: boolean
  client_id: string
  user_id: string
  note?: string
   users: {
    email: string
  }[]
  clients: {
    client_name: string
  }[]
}

export default function AdminFollowUpsView() {
  const [reminders, setReminders] = useState<AdminFollowUpReminder[]>([])

  useEffect(() => {
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('id, reminder_date, note, is_completed, client_id, user_id, users(email), clients(client_name)')
      .eq('is_completed', false)

    if (error) {
      console.error('Error fetching reminders:', error.message)
      return
    }

    setReminders(data as AdminFollowUpReminder[])
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">📋 All Team Follow-ups</h2>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="p-2">Client</th>
            <th className="p-2">Due Date</th>
            <th className="p-2">Assigned To</th>
            <th className="p-2">Note</th>
          </tr>
        </thead>
        <tbody>
          {reminders.map((reminder) => (
            <tr key={reminder.id} className="border-t">
              <td className="p-2">{reminder.clients?.[0]?.client_name ?? 'Unknown Client'}</td>
              <td className="p-2">{dayjs(reminder.reminder_date).format('MMM D, YYYY')}</td>
              <td className="p-2">{reminder.users?.[0]?.email ?? 'Unknown User'}</td>
              <td className="p-2">{reminder.note ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
