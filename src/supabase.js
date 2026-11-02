import { createClient } from '@supabase/supabase-js'

// One connection for the whole app. Every screen imports this rather than
// building its own, so there is a single place to change if anything moves.
//
// These two values come from .env.local, which is not in the repository
// (see .env.example). The key is the publishable one, which is meant to ship
// in the browser — what actually protects the data is row level security on
// the tables, not the key being secret (判断の記録 #57).

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Vite replaces import.meta.env at build time, so a missing value is baked
// into the build and cannot be fixed by restarting the server — the build has
// to be redone. Reporting that instead of throwing matters: throwing here runs
// before React mounts, and the page stays blank with nothing said.
export const missingConfig = !url || !anonKey

export const supabase = missingConfig ? null : createClient(url, anonKey)
