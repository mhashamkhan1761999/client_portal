import React from 'react'

type ClientNotesProps = {
  clientId: string
  currentUser: string
}

export default function ClientNotes({ clientId, currentUser }: ClientNotesProps) {
  return (
    <div className="bg-[#2a2a2a] p-4 rounded-lg mt-4">
      <h2 className="text-lg font-semibold text-white mb-4">🗒️ Notes / Comments / Assets</h2>

      {/* Placeholder for Add Note Form */}
      <div className="mb-6">
        <textarea
          className="w-full p-2 rounded bg-[#1c1c1e] text-white border border-gray-600"
          placeholder="Add a note or upload a file..."
          rows={3}
        ></textarea>
        <div className="flex items-center justify-between mt-2">
          <button className="text-sm text-yellow-500 hover:underline">📎 Upload File</button>
          <button className="bg-yellow-500 text-black px-4 py-1 rounded text-sm">Add Note</button>
        </div>
      </div>

      {/* Placeholder for Notes List */}
      <div className="space-y-4">
        {/* Each Note */}
        <div className="bg-[#1c1c1e] p-3 rounded shadow border border-gray-700">
          <p className="text-white text-sm">Client shared login credentials for Instagram.</p>
          <div className="text-xs text-gray-400 mt-2 flex justify-between items-center">
            <span>🕒 July 28, 2025 - 10:30 AM</span>
            <span>👤 Added by: Admin</span>
          </div>
          <div className="flex gap-3 mt-2 text-sm text-yellow-400">
            <button>📝 Edit</button>
            <button>🗑️ Delete</button>
            <button>👁️ View Full</button>
          </div>
        </div>
      </div>
    </div>
  )
}
