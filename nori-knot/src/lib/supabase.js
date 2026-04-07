import { createClient } from '@supabase/supabase-js'

// Get these from Supabase Dashboard → Project Settings → API
const supabaseUrl = 'https://dsvmvleewwfobirjqssr.supabase.co'
const supabaseAnonKey = 'sb_publishable_v8XlY9LQ4SwAuej6Gd8MHw_LFPTDo8D'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
