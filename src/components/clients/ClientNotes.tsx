'use client'

import React, { useState, useEffect } from 'react'
import supabase from '@/lib/supabaseClient'
import dayjs from 'dayjs'
import Image from 'next/image'
import { Dialog } from '@headlessui/react'

type ClientNotesProps = {
  clientId: string
  currentUser: string
}

type Note = {
  id: string
  note_text: string
  asset_url?: string | null
  asset_type?: string | null
  created_at: string
  users?: {
    name?: string
    email?: string
  } | null
  signed_asset_url?: string | null
}

export default function ClientNotes({ clientId, currentUser }: ClientNotesProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [noteInput, setNoteInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    fetchNotes()
  }, [])

  const generateSignedUrl = async (assetUrl: string): Promise<string | null> => {
    try {
      const match = assetUrl.match(/client-notes\/(.+)/)
      const objectPath = match?.[1]
      if (!objectPath) return null

      const { data, error } = await supabase
        .storage
        .from('client-notes')
        .createSignedUrl(objectPath, 60 * 60)

      if (error) {
        console.error('Error generating signed URL:', error.message)
        return null
      }

      return data?.signedUrl || null
    } catch (err) {
      console.error('Unexpected error in generateSignedUrl:', err)
      return null
    }
  }


  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('client_notes')
      .select(`
        id,
        note_text,
        asset_url,
        asset_type,
        created_at,
        users (
          name,
          email
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error || !data) {
      console.error('Error fetching notes:', error?.message)
      return
    }

    const notesWithUrls: Note[] = await Promise.all(
      data.map(async (note: any) => {
        const signed_asset_url = note.asset_url
          ? await generateSignedUrl(note.asset_url)
          : null

        const user = Array.isArray(note.users) ? note.users[0] : note.users

        return {
          ...note,
          signed_asset_url,
          users: user,
        }
      })
    )

    setNotes(notesWithUrls)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setSelectedNote(null)
  }

  const handleAddOrEditNote = async () => {
    if (!noteInput.trim()) return
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    let asset_url = null
    let asset_type = null

    if (file) {
      const { data, error } = await supabase.storage
        .from('client-notes')
        .upload(`notes/${Date.now()}-${file.name}`, file)

      if (!error && data) {
        const publicUrlResponse = supabase.storage
          .from('client-notes')
          .getPublicUrl(data.path)

        asset_url = publicUrlResponse.data.publicUrl
        asset_type = file.type
      } else {
        console.error('File upload error:', error?.message)
      }
    }

    if (editingNoteId) {
      if (!file) {
        const { data: existingNote } = await supabase
          .from('client_notes')
          .select('asset_url, asset_type')
          .eq('id', editingNoteId)
          .single()

        asset_url = existingNote?.asset_url || null
        asset_type = existingNote?.asset_type || null
      }

      await supabase
        .from('client_notes')
        .update({
          note_text: noteInput.trim(),
          asset_url,
          asset_type,
        })
        .eq('id', editingNoteId)
    } else {
      await supabase.from('client_notes').insert({
        client_id: clientId,
        created_by: userId,
        note_text: noteInput.trim(),
        asset_url,
        asset_type,
      })
    }

    setNoteInput('')
    setFile(null)
    setEditingNoteId(null)
    setLoading(false)
    fetchNotes()
  }

  const handleDeleteNote = async (id: string) => {
    const confirmDelete = confirm('Are you sure you want to delete this note?')
    if (!confirmDelete) return

    try {
      const { data: noteData, error: fetchError } = await supabase
        .from('client_notes')
        .select('asset_url')
        .eq('id', id)
        .single()

      if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`)

      if (noteData?.asset_url) {
        const publicPath = noteData.asset_url.split('/object/public/client-notes/')[1]
        if (publicPath) {
          const { error: removeError } = await supabase
            .storage
            .from('client-notes')
            .remove([publicPath])

          if (removeError) throw new Error(`Storage delete error: ${removeError.message}`)
        }
      }

      const { error: deleteError } = await supabase
        .from('client_notes')
        .delete()
        .eq('id', id)

      if (deleteError) throw new Error(`Delete error: ${deleteError.message}`)

      fetchNotes()
    } catch (err: any) {
      console.error('Failed to delete note and/or image:', err.message)
    }
  }

  const handleEdit = (note: Note) => {
    setNoteInput(note.note_text)
    setEditingNoteId(note.id)
  }

  const openViewFull = async (note: Note) => {
    setSelectedNote(note)
    setIsDialogOpen(true)
  }

  return (
    <div className="bg-[#2a2a2a] p-4 rounded-lg mt-4">
      <h2 className="text-lg font-semibold text-white mb-4">🗒️ Notes / Comments / Assets</h2>

      {/* Add Note */}
      <div className="mb-6">
        <textarea
          className="w-full p-2 rounded bg-[#1c1c1e] text-white border border-gray-600"
          placeholder="Add a note or upload a file..."
          rows={3}
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
        />
        <div className="flex items-center justify-between mt-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-white"
          />
          <button
            className="bg-yellow-500 text-black px-4 py-1 rounded text-sm"
            onClick={handleAddOrEditNote}
            disabled={loading}
          >
            {loading ? 'Saving...' : editingNoteId ? 'Update Note' : 'Add Note'}
          </button>
        </div>
        {file && (
          <p className="text-sm text-yellow-400 mt-1">
            Selected File: {file.name}
          </p>
        )}
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.map((note) => (
          <div key={note.id} className="bg-[#1c1c1e] p-3 rounded shadow border border-gray-700">
            <p className="text-white text-sm">{note.note_text}</p>
            {note.asset_url && note.asset_type?.startsWith('image/') && note.signed_asset_url && (
              <div className="mt-2">
                <Image
                  src={note.signed_asset_url}
                  alt="Asset"
                  width={150}
                  height={100}
                  className="rounded mb-3"
                />
              </div>
            )}
            <div className="text-xs text-gray-400 mt-2 flex justify-between items-center">
              <span>🕒 {dayjs(note.created_at).format('MMM D, YYYY - h:mm A')}</span>
              <span>
                👤 Added by: {note.users?.name || note.users?.email || 'Unknown'}
              </span>
            </div>
            <div className="flex gap-3 mt-2 text-sm text-yellow-400">
              <button onClick={() => handleEdit(note)}>📝 Edit</button>
              <button onClick={() => handleDeleteNote(note.id)}>🗑️ Delete</button>
              <button onClick={() => openViewFull(note)}>👁️ View Full</button>
            </div>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="text-gray-400 text-sm italic">No notes added yet.</div>
        )}
      </div>

      {/* View Full Dialog */}
      <Dialog open={isDialogOpen} onClose={closeDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-[#1c1c1e] p-6 rounded-xl max-w-lg w-full border border-yellow-500">
            <Dialog.Title className="text-yellow-400 text-lg font-semibold mb-3">
              📌 Note Details
            </Dialog.Title>
            {selectedNote && (
              <>
                <p className="text-white mb-2">{selectedNote.note_text}</p>
                {selectedNote.asset_type?.startsWith('image/') && selectedNote.signed_asset_url && (
                  <Image
                    src={selectedNote.signed_asset_url}
                    alt="Asset"
                    width={400}
                    height={300}
                    className="rounded mb-3"
                  />
                )}
                <div className="text-sm text-gray-400">
                  🕒 {dayjs(selectedNote.created_at).format('MMM D, YYYY - h:mm A')}
                  <br />
                  👤 {selectedNote.users?.name || selectedNote.users?.email || 'Unknown'}
                </div>
              </>
            )}
            <div className="mt-4 text-right">
              <button
                className="text-sm text-yellow-500 hover:underline"
                onClick={closeDialog}
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  )
}
