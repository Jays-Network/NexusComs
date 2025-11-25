import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
export let isSupabaseConfigured = false;

const getSupabaseCredentials = () => {
  const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  
  const supabaseUrl = rawUrl.replace(/\s+/g, '').replace(/\/+$/, '');
  const supabaseAnonKey = rawKey.replace(/\s+/g, '');
  
  console.log('🔍 [supabaseClient] Checking credentials:');
  console.log('  Raw URL:', JSON.stringify(rawUrl));
  console.log('  Cleaned URL:', supabaseUrl);
  console.log('  URL length:', supabaseUrl.length);
  console.log('  Key exists:', !!supabaseAnonKey);
  console.log('  Key length:', supabaseAnonKey?.length);
  
  const isUrlValid = supabaseUrl && 
    supabaseUrl.startsWith('https://') && 
    supabaseUrl.includes('.supabase.co');
  const isKeyValid = supabaseAnonKey && 
    supabaseAnonKey.length > 20 && 
    supabaseAnonKey.startsWith('eyJ');
  
  console.log('  URL valid:', isUrlValid);
  console.log('  Key valid:', isKeyValid);
  
  return { supabaseUrl, supabaseAnonKey, isValid: !!(isUrlValid && isKeyValid) };
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  const { supabaseUrl, supabaseAnonKey, isValid } = getSupabaseCredentials();
  
  if (!isValid) {
    console.warn('⚠️ Supabase not configured - real-time sync disabled');
    console.warn('  URL valid:', supabaseUrl?.startsWith('https://'));
    console.warn('  Key valid:', supabaseAnonKey?.startsWith('eyJ'));
    return null;
  }
  
  try {
    console.log('🔄 Creating Supabase client...');
    console.log('  URL:', supabaseUrl);
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
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
    
    isSupabaseConfigured = true;
    console.log('✅ Supabase client initialized successfully');
    return supabaseInstance;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to initialize Supabase client:', errorMessage);
    isSupabaseConfigured = false;
    return null;
  }
};

export const supabase = getSupabaseClient();

export const subscribeToUsers = (callback: (payload: any) => void) => {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('⚠️ Cannot subscribe to users - Supabase not configured');
    return null;
  }
  console.log('🔔 Subscribing to users table changes...');
  return client
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

export const subscribeToUserById = (userId: string, callback: (payload: any) => void) => {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('⚠️ Cannot subscribe to user - Supabase not configured');
    return null;
  }
  console.log('🔔 Subscribing to user changes:', userId);
  return client
    .channel(`public:users:id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        console.log('📡 User updated:', userId);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('👤 User subscription status:', status);
    });
};

export const fetchUserFromSupabase = async (userId: string) => {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('⚠️ Cannot fetch user - Supabase not configured');
    return null;
  }
  try {
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching user from Supabase:', error.message);
      return null;
    }

    console.log('✅ User fetched from Supabase:', userId);
    return data;
  } catch (err) {
    console.error('❌ Failed to fetch user:', err);
    return null;
  }
};

export const fetchAllUsersFromSupabase = async () => {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('⚠️ Cannot fetch users - Supabase not configured');
    return [];
  }
  try {
    const { data, error } = await client
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users from Supabase:', error.message);
      return [];
    }

    console.log('✅ Fetched', data?.length || 0, 'users from Supabase');
    return data || [];
  } catch (err) {
    console.error('❌ Failed to fetch users:', err);
    return [];
  }
};

export const updateUserInSupabase = async (userId: string, updates: Record<string, any>) => {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('⚠️ Cannot update user - Supabase not configured');
    return null;
  }
  try {
    const { data, error } = await client
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

export const unsubscribeFromChannel = (channel: any) => {
  const client = getSupabaseClient();
  if (channel && client) {
    client.removeChannel(channel);
    console.log('🔕 Unsubscribed from channel');
  }
};
