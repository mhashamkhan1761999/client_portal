'use client';

import React, { useEffect, useState, useRef } from 'react';
import supabase from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { useNotification } from '@/context/NotificationContext';

interface FollowUp {
  id: string;
  client_id: string;
  client_name: string;
  follow_up_at: string; // ISO datetime
  follow_up_time?: string; // HH:mm for display
  status: 'Upcoming' | 'Completed' | 'Expired';
  last_note: string;
  assigned_to: string;
  assigned_to_name?: string;
  action_reason?: string;
}

const AllFollowUps: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || '';
  const userId = user?.id || null;

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedClient, setSelectedClient] = useState<string>('All');

  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState<'done' | 'reschedule' | null>(null);
  const [newDate, setNewDate] = useState('');

  const { notify, custom, dismiss } = useNotification();
  const notifiedKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    fetchFollowUps();
    fetchClients();
    requestNotificationPermission();
  }, [userId, role]);

  useEffect(() => {
    const id = setInterval(checkUpcomingFollowUps, 60 * 1000);
    return () => clearInterval(id);
  }, [followUps, role, userId]);

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  const fetchFollowUps = async () => {
    let query = supabase
      .from('follow_ups')
      .select(`
        id,
        client_id,
        user_id,
        reminder_date,
        note,
        is_completed,
        action_reason,
        clients:client_id(id, client_name),
        users:user_id(id, name)
      `);
    if (role !== 'admin' && userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) {
      console.error(error);
      return;
    }

    const now = new Date();

    const formatted: FollowUp[] = (data || []).map((fu: any) => {
      const at = fu.reminder_date ? new Date(fu.reminder_date) : null;
      let status: 'Upcoming' | 'Completed' | 'Expired' = 'Upcoming';

      if (fu.is_completed) status = 'Completed';
      else if (at && at.getTime() < now.getTime()) status = 'Expired';
      else status = 'Upcoming';

      return {
        id: fu.id,
        client_id: fu.client_id,
        client_name: fu.clients?.client_name || '',
        follow_up_at: fu.reminder_date || '',
        follow_up_time: at ? format(at, 'HH:mm') : '',
        status,
        last_note: fu.note || '',
        action_reason: fu.action_reason || '',
        assigned_to: fu.user_id,
        assigned_to_name: fu.users?.name || 'Unknown',
      };
    });

    setFollowUps(formatted);
  };

  const fetchClients = async () => {
    let query = supabase.from('clients').select('id, client_name');
    if (role !== 'admin' && userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (!error && data) setClients(data.map((c: any) => ({ id: c.id, name: c.client_name })));
  };

  const getRemainingTime = (iso: string) => {
    if (!iso) return 'No date set';
    const target = new Date(iso).getTime();
    if (Number.isNaN(target)) return 'Invalid date';
    const now = Date.now();
    const diffMs = target - now;

    if (diffMs <= 0) return '0m left';
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m left`;
    const h = Math.floor(diffMin / 60);
    if (h < 24) return `${h}h left`;
    const d = Math.floor(h / 24);
    return `${d}d left`;
  };

  const openReasonModal = (fu: FollowUp, type: 'done' | 'reschedule') => {
    setSelectedFollowUp(fu);
    setActionType(type);
    setReason('');
    setNewDate('');
    setShowReasonModal(true);
  };

  const handleSaveReason = async () => {
    if (!selectedFollowUp || !actionType) return;
    const updateObj: any = { action_reason: reason };

    if (actionType === 'done') updateObj.is_completed = true;
    if (actionType === 'reschedule') {
      if (!newDate) return notify('Please select a new date!', { duration: 5000 });
      const minFuture = new Date(Date.now() + 60 * 1000);
      if (new Date(newDate) < minFuture) return notify('Pick a future time.', { duration: 5000 });
      updateObj.reminder_date = newDate;
      updateObj.is_completed = false;
    }

    const { error } = await supabase.from('follow_ups').update(updateObj).eq('id', selectedFollowUp.id);
    if (error) {
      console.error(error);
      return notify('Failed to update follow-up!', { duration: 5000 });
    }

    await fetchFollowUps();
    notify(
      actionType === 'done'
        ? 'Follow-up completed ✅'
        : `Follow-up rescheduled to ${new Date(updateObj.reminder_date).toLocaleString()} 📅`,
      { duration: 5000 }
    );
    setShowReasonModal(false);
  };

  const handleSendReminder = async (fu: FollowUp) => {
    if (!user) return;
    const when = fu.follow_up_at ? format(new Date(fu.follow_up_at), 'yyyy-MM-dd HH:mm') : '';
    const message = `Reminder: Follow-up with ${fu.client_name} at ${when}`;

    const { error } = await supabase.from('follow_up_notifications').insert({
      follow_up_id: fu.id,
      user_id: fu.assigned_to,
      message,
      sent_by: user.id,
      status: 'pending',
    });
    if (error) {
      console.error(error);
      return notify('Failed to send reminder!', { duration: 5000 });
    }

    notify('Reminder sent successfully ✅', { duration: 5000 });
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Follow-up Reminder', { body: message });
    }
  };

  const insertNotificationRow = async (targetUserId: string, fu: FollowUp, mins: number) => {
    const message = `Follow-up with ${fu.client_name} in ${mins} minutes`;
    await supabase.from('follow_up_notifications').insert({
      follow_up_id: fu.id,
      user_id: targetUserId,
      message,
      sent_by: userId,
      status: 'pending',
    });
  };

  const checkUpcomingFollowUps = async () => {
    const now = Date.now();
    const thresholds = [10, 5]; // minutes
    for (const fu of followUps) {
      if (!fu.follow_up_at || fu.status === 'Completed') continue;
      const ts = new Date(fu.follow_up_at).getTime();
      const diffMin = Math.floor((ts - now) / 60000);
      for (const m of thresholds) {
        if (diffMin === m) {
          const key = `${fu.id}-${m}`;
          if (notifiedKeys.current.has(key)) continue;

          const msg = `Follow-up with ${fu.client_name} in ${m} minutes: ${fu.action_reason || fu.last_note || ''}`;

          // Persistent Custom Pop-up
          custom(
            (t) => (
              <div
                className="fixed bottom-6 right-6 max-w-xs bg-purple-700 text-white p-4 rounded-lg shadow-xl flex justify-between items-center animate-slide-in"
                style={{ zIndex: 9999 }}
              >
                <div className="flex-1">{msg}</div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="ml-4 bg-white text-purple-700 px-2 py-1 rounded hover:bg-gray-200 transition"
                >
                  Close
                </button>
              </div>
            ),
            { id: key, duration: Infinity }
          );

          // Toast (top-right)
          notify(msg, { position: 'top-right', duration: 6000 });

          // Chrome Notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Follow-up Reminder', { body: msg });
          }

          if (fu.assigned_to) await insertNotificationRow(fu.assigned_to, fu, m);
          if (userId && role === 'admin') await insertNotificationRow(userId, fu, m);

          notifiedKeys.current.add(key);
        }
      }
    }
  };

  if (!user) return <div>Loading...</div>;

  const filteredFollowUps = followUps.filter((fu) => {
    const statusMatch = selectedStatus === 'All' || fu.status.toLowerCase() === selectedStatus.toLowerCase();
    const clientMatch = selectedClient === 'All' || fu.client_id === selectedClient;
    return statusMatch && clientMatch;
  });

  return (
    <div className="p-6 bg-transparent min-h-screen">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-transparent p-4 rounded shadow">
        <select
          className="border rounded px-3 py-2 bg-black text-white w-full sm:w-auto"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Completed">Completed</option>
          <option value="Expired">Expired</option>
        </select>

        <select
          className="border rounded px-3 py-2 bg-black text-white w-full sm:w-auto"
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
        >
          <option value="All">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-transparent rounded shadow">
        <table className="w-full border-collapse text-white">
          <thead>
            <tr className="bg-gray-100 text-gray-800 uppercase text-sm">
              <th className="border-b p-3 text-left">Client</th>
              <th className="border-b p-3 text-left">Follow Up Date</th>
              <th className="border-b p-3 text-left">Time</th>
              <th className="border-b p-3 text-left">Time Left</th>
              <th className="border-b p-3 text-left">Status</th>
              <th className="border-b p-3 text-left">Last Note</th>
              <th className="border-b p-3 text-left">Assigned To</th>
              <th className="border-b p-3 text-left">Actions</th>
              {role === 'admin' && <th className="border-b p-3 text-left">Admin Notify</th>}
            </tr>
          </thead>
          <tbody>
            {filteredFollowUps.map((fu) => {
              const getLocalTime = (utc?: string) => {
                if (!utc) return '';
                return new Date(utc).toLocaleString('en-US', {
                  timeZone: 'Asia/Karachi',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });
              };
              const timeLeft = getRemainingTime(fu.follow_up_at);
              return (
                <tr key={fu.id} className="hover:bg-[#2a2a2a]">
                  <td className="border-b p-3 font-medium">{fu.client_name}</td>
                  <td className="border-b p-3">{fu.follow_up_at ? format(new Date(fu.follow_up_at), 'yyyy-MM-dd') : ''}</td>
                  <td>{getLocalTime(fu.follow_up_at)}</td>
                  <td className="border-b p-3">{fu.status === 'Completed' ? '' : timeLeft}</td>
                  <td className="border-b p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-white text-xs ${
                        fu.status === 'Completed'
                          ? 'bg-green-500'
                          : fu.status === 'Expired'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      }`}
                    >
                      {fu.status}
                    </span>
                  </td>
                  <td className="border-b p-3">{fu.action_reason || fu.last_note}</td>
                  <td className="border-b p-3 font-medium">{fu.assigned_to_name}</td>
                  <td className="border-b p-3 flex flex-wrap gap-2">
                    <button className="bg-green-500 px-3 py-1 rounded text-sm" onClick={() => openReasonModal(fu, 'done')}>
                      Complete
                    </button>
                    <button className="bg-yellow-500 px-3 py-1 rounded text-sm" onClick={() => openReasonModal(fu, 'reschedule')}>
                      Reschedule
                    </button>
                    <a href={`/clients/${fu.client_id}`} className="bg-blue-500 px-3 py-1 rounded text-sm">
                      View Client
                    </a>
                  </td>
                  {role === 'admin' && (
                    <td>
                      <button className="bg-purple-500 px-3 py-1 rounded text-sm" onClick={() => handleSendReminder(fu)}>
                        Send Reminder
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reason Modal */}
      {showReasonModal && selectedFollowUp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4 capitalize">{actionType} follow-up</h3>

            {actionType === 'reschedule' && (
              <input
                type="datetime-local"
                className="border w-full p-2 rounded mb-4"
                value={newDate}
                min={new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16)}
                onChange={(e) => setNewDate(e.target.value)}
              />
            )}

            <textarea
              className="border w-full p-2 rounded mb-4"
              placeholder="Enter reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div className="flex justify-end space-x-2">
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowReasonModal(false)}>
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={handleSaveReason}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllFollowUps;
