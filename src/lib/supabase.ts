import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iisejjtimakkwjrbmzvj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpc2VqanRpbWFra3dqcmJtenZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNDI4NzEsImV4cCI6MjA1MDkxODg3MX0.Ej6qJOQQGJOJQQGJOJQQGJOJQQGJOJQQGJOJQQGJOJQ';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);