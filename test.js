// Test if Supabase is connected
async function testConnection() {
    const { data, error } = await supabaseClient
        .from('services')
        .select('*');
    
    console.log('Data:', data);
    console.log('Error:', error);
}

testConnection();