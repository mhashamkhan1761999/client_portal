
import supabase from '../../lib/supabaseClient'

export const uploadNoteFile = async (
  file: File,
  clientId: string,
  noteId: string
): Promise<string | null> => {
  const filePath = `client_${clientId}/note_${noteId}/${file.name}`

  const { data, error } = await supabase.storage
    .from('client-notes')
    .upload(filePath, file, {
      upsert: true,
      cacheControl: '3600',
    })

  if (error) {
    console.error('Error uploading file:', error)
    return null
  }

  return data?.path || null
}

export const getSignedUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from('client-notes')
    .createSignedUrl(filePath, 60 * 60) // 1 hour expiration

  if (error) {
    console.error('Error generating signed URL:', error)
    return null
  }

  return data.signedUrl
}
