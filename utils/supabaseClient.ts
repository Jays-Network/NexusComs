import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for frontend
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables not configured');
  console.error('Missing:', { url: !supabaseUrl, key: !supabaseAnonKey });
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

console.log('✅ Supabase client initialized for real-time sync');

// Real-time subscription helpers
export const subscribeToUsers = (callback: (payload: any) => void) => {
  console.log('🔔 Subscribing to users table changes...');
  return supabase
    .channel('public:users')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
      },
      (payload) => {
        console.log('📡 Users table change detected:', payload.eventType);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('👥 Users subscription status:', status);
    });
};

// Subscribe to specific user changes
export const subscribeToUserById = (userId: string, callback: (payload: any) => void) => {
  console.log('🔔 Subscribing to user changes:', userId);
  return supabase
    .channel(`public:users:id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        console.log('📡 User data changed:', userId);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('👤 User subscription status:', status);
    });
};

// Fetch current user data from Supabase
export const fetchUserFromSupabase = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching user:', error.message);
      return null;
    }

    console.log('✅ User data fetched from Supabase:', data?.username);
    return data;
  } catch (err) {
    console.error('❌ Failed to fetch user:', err);
    return null;
  }
};

// Fetch all users (admin)
export const fetchAllUsersFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, account_name, billing_plan, last_login, created_at, permissions')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users:', error.message);
      return [];
    }

    console.log('✅ All users fetched from Supabase:', data?.length);
    return data || [];
  } catch (err) {
    console.error('❌ Failed to fetch users:', err);
    return [];
  }
};

// Update user data in Supabase
export const updateUserInSupabase = async (userId: string, updates: Record<string, any>) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating user:', error.message);
      return null;
    }

    console.log('✅ User updated in Supabase:', userId);
    return data;
  } catch (err) {
    console.error('❌ Failed to update user:', err);
    return null;
  }
};

// Unsubscribe from channel
export const unsubscribeFromChannel = (channel: any) => {
  if (channel) {
    supabase.removeChannel(channel);
    console.log('🔕 Unsubscribed from channel');
  }
};
