import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qdtgolqqrvtqfknrgqye.supabase.co'
// FIXED: Added the missing 'e' at the beginning of the anon key
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdGdvbHFxcnZ0cWZrbnJncXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTg5NTksImV4cCI6MjA3Mzg5NDk1OX0.V6keMzKkrVR8gctDngFWdpa8PP0YNW7s3i3sS7PVf84'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase