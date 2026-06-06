const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oahfnvlfwkaxpwlcakmv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9haGZudmxmd2theHB3bGNha212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNjQzODMsImV4cCI6MjA5NTc0MDM4M30.rRFjqSMjLZJxHoNnMCBKwJvEw1Uvsy1fVNYMQucLjJg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Attempting login...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@techcorp.com',
    password: '123456'
  });
  if (error) {
    console.error('Login Error:', error.message);
  } else {
    console.log('Login Success! User ID:', data.user.id);
  }
}
test();
