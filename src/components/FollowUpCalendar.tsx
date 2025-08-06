'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import dayjs from 'dayjs'

type FollowUpReminder = {
  id: string
  reminder_date: string
  is_completed: boolean
  client_id: string
  note?: string
  clients: {
    client_name: string
  }[]
}

export default function FollowUpCalendar() {
  const [reminders, setReminders] = useState<FollowUpReminder[]>([])

  useEffect(() => {
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('id, reminder_date, note, is_completed, client_id, clients(client_name)')
      .eq('is_completed', false)

    if (error) {
      console.error('Fetch failed', error.message)
      return
    }

    setReminders(data as FollowUpReminder[])
  }

  const events = reminders.map((reminder) => ({
    id: reminder.id,
    title: reminder.clients?.[0]?.client_name ?? 'Follow-up',
    date: dayjs(reminder.reminder_date).format('YYYY-MM-DD'),
  }))

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">📅 Upcoming Follow-Ups</h2>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        height="auto"
      />
    </div>
  )
}
