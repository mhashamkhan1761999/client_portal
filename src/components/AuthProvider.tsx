import supabase from '../lib/supabaseClient'

async function createAdmin() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@metamalistic.com',
    password: 'MetamMalistic@9900!!',
  })

  if (error) {
    console.error('Signup error:', error)
  } else {
    console.log('Admin created:', data)
  }
}

createAdmin()