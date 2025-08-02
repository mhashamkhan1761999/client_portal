export interface Client {
  id: string
  client_name: string
  phone_numbers: string[]
  email_addresses: string[]
  work_email: string
  service_id?: string
  assigned_to?: string
  status: string
  created_at: string
  updated_at: string
  website_url?: string
  gender?: string
  platform?: string
  profile_url?: string
  connecting_platform?: string
  platform_name?: string 
  sudo_name?: string // Added for sudo_name from platform
  lead_gen_id?: string // Added for lead generation agent
  lead_gen_name?: string
  // Added for lead generation agent name
}

export interface ClientNote {
  id: string
  client_id: string
  note_text: string
  created_at: string
  added_by: string
  associated_service?: string
  asset_url?: string // file path in Supabase Storage
}
export interface ClientService {
  id: string
  service_name: string
  description?: string
  created_at: string
  updated_at: string
}


export type Service = {
  id: string
  service_name: string
  description?: string
  sold_price?: number | string
}