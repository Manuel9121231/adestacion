// Supabase Configuration
const SUPABASE_URL = 'https://qzbzqszxsswpvfxgknjt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6Ynpxc3p4c3N3cHZmeGdrbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODA5MzEsImV4cCI6MjA5MzQ1NjkzMX0._Lqv75i2bMqi1CNxDkBnRjNrFpSiTQfZVgpV1Ep4DGk';

console.log("Initializing Supabase Client...");

if (!window.supabase) {
  console.error("Supabase SDK not found! Check your internet connection or script tags.");
} else {
  try {
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
    console.log("✅ Supabase Client initialized successfully.");
  } catch (err) {
    console.error("❌ Error initializing Supabase:", err);
  }
}
