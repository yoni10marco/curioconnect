import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = (Constants.expoConfig?.extra?.supabaseUrl || 'https://anhfanmdotbzbpmimeem.supabase.co') as string;
const supabaseAnonKey = (Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuaGZhbm1kb3RiemJwbWltZWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzU3ODksImV4cCI6MjA4ODMxMTc4OX0._mbaSi5F3zDZREyvvlLQ4ZxOzU5KiaXXiQz_b1_FD4A') as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
