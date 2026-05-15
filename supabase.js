const { createClient } = supabase;

const supabaseUrl = 'https://yzwkolfmlpnlnsziqlly.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tvbGZtbHBubG5zemlxbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTkzODcsImV4cCI6MjA5MDUzNTM4N30.DP32e8oH0aaedkz_iOxaa0NPaT8enMjw06M_uCqSmTo';

const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Make it available everywhere
window.supabaseClient = supabaseClient;