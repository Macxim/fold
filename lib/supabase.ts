import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableDefaultKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

if (!supabaseUrl || !supabasePublishableDefaultKey) {
  console.warn('Supabase credentials missing. History tracking may not work.')
}

export const supabase = createClient(supabaseUrl, supabasePublishableDefaultKey)
