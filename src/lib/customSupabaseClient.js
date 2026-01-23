import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wzifltoxfwzwrlkhvcsh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6aWZsdG94Znd6d3Jsa2h2Y3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTU1NTgsImV4cCI6MjA4NDY3MTU1OH0.DxWcNG3fjxH_d9NUQYVukwXNhafMjnvZWraAdlU57uY';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
