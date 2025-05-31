// Test script for calendar API with Bearer token authentication
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const dotenvPath = path.resolve(__dirname, '.env');
if (fs.existsSync(dotenvPath)) {
  const dotenv = require('dotenv');
  dotenv.config({ path: dotenvPath });
}

async function testCalendarAPI() {
  try {
    console.log('🧪 Testing calendar API with Bearer token authentication...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env');
      return;
    }
    
    console.log('Using Supabase URL:', supabaseUrl);
    
    // 1. Authenticate with Supabase to get a token
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'josh3@rwxt.org',
      password: 'yo50mhO4xqkdd',
    });
    
    if (error) {
      console.log('❌ Authentication failed:', error.message);
      return;
    }
    
    console.log('✅ Authentication successful');
    
    // 2. Test calendar API with Bearer token
    const accessToken = data.session.access_token;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2);
    
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    console.log(`📆 Requesting calendar events from ${formattedStartDate} to ${formattedEndDate}`);
    
    const response = await fetch(`http://localhost:3001/api/calendar?startDate=${formattedStartDate}&endDate=${formattedEndDate}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📊 Calendar API response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Calendar API working correctly!');
      console.log('Response structure:', Object.keys(data));
      console.log('Events found:', data.events ? data.events.length : 0);
      
      if (data.events && data.events.length > 0) {
        console.log('Sample event:', {
          title: data.events[0].title,
          start: data.events[0].start,
          runType: data.events[0].runType,
          // Include more fields as needed
        });
      }
    } else {
      const errorData = await response.text();
      console.log('❌ Calendar API error:', errorData);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error);
  }
}

testCalendarAPI();
