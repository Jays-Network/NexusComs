import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
export let isSupabaseConfigured = false;

const getSupabaseCredentials = () => {
  const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // Clean URL more aggressively - handle all bundler quirks
  // Remove all quotes, escapes, and whitespace first
  let cleanedUrl = rawUrl
    .replace(/\\"/g, '')
    .replace(/\\'/g, '')
    .replace(/["'`]/g, '')
    .replace(/\s/g, '')
    .trim();
  
  // Extract URL using regex - most robust way to handle bundler quirks
  const urlMatch = cleanedUrl.match(/https:\/\/[a-zA-Z0-9-]+\.supabase\.co/);
  let supabaseUrl = urlMatch ? urlMatch[0] : cleanedUrl;
  
  // Ensure no trailing characters
  supabaseUrl = supabaseUrl.replace(/[^a-zA-Z0-9./:_-]/g, '');
  
  // Clean key more aggressively
  let cleanedKey = rawKey
    .replace(/\\"/g, '')
    .replace(/\\'/g, '')
    .replace(/["'`]/g, '')
    .replace(/\s/g, '')
    .trim();
  
  // Extract JWT key using regex - matches base64 JWT format
  const keyMatch = cleanedKey.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  let supabaseAnonKey = keyMatch ? keyMatch[0] : cleanedKey;
  
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
  console.log('🔔 Subscribing to user changes (stream_id):', userId);
  return client
    .channel(`public:users:stream_id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `stream_id=eq.${userId}`,
      },
      (payload) => {
        console.log('📡 User updated (stream_id):', userId);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('👤 User subscription status:', status);
    });
};

export const fetchUserFromSupabase = async (streamId: string) => {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('⚠️ Cannot fetch user - Supabase not configured');
    return null;
  }
  try {
    console.log('🔍 Fetching user by stream_id:', streamId);
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('stream_id', streamId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('ℹ️ No user found with stream_id:', streamId);
      } else {
        console.error('❌ Error fetching user from Supabase:', error.message);
      }
      return null;
    }

    console.log('✅ User fetched from Supabase by stream_id:', streamId);
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

export const updateUserInSupabase = async (streamId: string, updates: Record<string, any>) => {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('⚠️ Cannot update user - Supabase not configured');
    return null;
  }
  try {
    const { data, error } = await client
      .from('users')
      .update(updates)
      .eq('stream_id', streamId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating user:', error.message);
      return null;
    }

    console.log('✅ User updated in Supabase by stream_id:', streamId);
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
