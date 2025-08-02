// src/lib/createUser.ts

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Only use this on server-side
)

export async function createUser(email: string, password: string, role: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (error) throw error

  // You can insert extra info into `public.users` table if needed
  await supabaseAdmin.from('users').insert({
    id: data.user?.id,
    email,
    role
  })

  return data
}
