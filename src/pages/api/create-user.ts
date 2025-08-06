import type { NextApiRequest, NextApiResponse } from 'next'
import supabaseAdmin from '@/lib/supabaseAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  const baseUrl = process.env.BASE_URL
  if (!baseUrl) throw new Error('BASE_URL is missing in environment variables')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, sudo_name, email, work_email, role, assigned_phones } = req.body

  if (!name || !email || !work_email || !role || !assigned_phones?.length) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    console.log('[DEBUG] Checking if user already exists in Supabase Auth...')

    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listError) {
      console.error('User lookup failed:', listError)
      return res.status(500).json({ error: 'User lookup failed', details: listError.message })
    }

    const existingUser = usersData.users.find((u) => u.email === work_email)
    let userId: string

    if (existingUser) {
      console.log('[INFO] User already exists in Supabase Auth:', existingUser.id)
      userId = existingUser.id
    } else {
      console.log('[DEBUG] Creating user in Supabase Auth...')
      const { data: createdUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: work_email,
        email_confirm: true,
      })

      if (authError || !createdUser?.user?.id) {
        return res.status(500).json({ error: 'Supabase Auth Error', details: authError?.message })
      }

      userId = createdUser.user.id
    }

    // Check if user already exists in the 'users' table
    const { data: userInTable, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('[ERROR] Users table check failed:', userCheckError)
      return res.status(500).json({ error: 'User table check failed', details: userCheckError.message })
    }

    if (!userInTable) {
      const { error: insertError } = await supabaseAdmin.from('users').insert({
        id: userId,
        name,
        sudo_name,
        email,
        work_email,
        role,
        assigned_phones,
      })

      if (insertError) {
        return res.status(500).json({ error: 'Insert Error', details: insertError.message })
      }

      console.log('[INFO] User inserted into users table.')
    } else {
      console.log('[INFO] User already exists in users table.')
    }

    // Generate magic link
    const { data: magicLinkData, error: magicLinkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: work_email,
        options: {
          redirectTo: `${baseUrl}/set-password`,
        },
      })

    if (magicLinkError || !magicLinkData?.properties?.action_link) {
      return res.status(500).json({ error: 'Magic Link Error', details: magicLinkError?.message })
    }

    const magicLink = magicLinkData.properties.action_link

    // Try sending the invite
    let inviteEmailSuccess = false
    try {
      const emailRes = await fetch(`${req.headers.origin}/api/send-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: work_email, name, link: magicLink }),
      })

      if (emailRes.ok) {
        inviteEmailSuccess = true
      } else {
        console.error('Email send failed with status', emailRes.status)
      }
    } catch (e) {
      console.error('Email send failed:', e)
    }

    return res.status(200).json({
      message: existingUser ? 'User already existed – invite sent' : 'User created and invited',
      userId,
      magicLink,
      inviteEmailSuccess,
    })
  } catch (err: any) {
    console.error('[UNEXPECTED ERROR]', err)
    return res.status(500).json({ error: 'Unexpected Error', details: err.message })
  }
}
