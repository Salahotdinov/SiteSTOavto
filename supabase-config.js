// Замените на ваши реальные данные из панели Supabase
const SUPABASE_URL = 'https://qiqbkwhqxfapiqskycch.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpcWJrd2hxeGZhcGlxc2t5Y2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTEwMjYsImV4cCI6MjA5NjA4NzAyNn0.yT8EuQIt2CSXyCbe3arAHSvBuj3Eq7FThCf-rYotqvM'; 

// Инициализация клиента Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
