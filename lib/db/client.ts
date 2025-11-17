import { createClient } from '@supabase/supabase-js'

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-key'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL

if (!isBuildTime) {
  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL environment variable is missing. Please add it to your .env.local file.'
    )
  }

  if (!supabaseKey) {
    throw new Error(
      'SUPABASE_KEY environment variable is missing. Please add it to your .env.local file. ' +
        'This should be the service role key for server-side operations only.'
    )
  }
}

export const sb = createClient(supabaseUrl || PLACEHOLDER_URL, supabaseKey || PLACEHOLDER_KEY, {
  db: { schema: 'core' },
})
