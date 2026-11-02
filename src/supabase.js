import { createClient } from '@supabase/supabase-js'

// One connection for the whole app. Every screen imports this rather than
// building its own, so there is a single place to change if anything moves.
//
// These two values come from .env.local, which is not in the repository
// (see .env.example). The key is the "anon" one, which is meant to ship in the
// browser — what actually protects the data is row level security on the
// tables, not the key being secret (判断の記録 #57).

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY が設定されていません。' +
      '.env.example を見て .env.local を作ってください。'
  )
}

export const supabase = createClient(url, anonKey)
