import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  supabase,
  subscribeToUserById,
  fetchUserFromSupabase,
  unsubscribeFromChannel,
} from './supabaseClient';

interface SyncedUser {
  id: string;
  username: string;
  email: string;
  account_name?: string;
  billing_plan?: string;
  permissions?: Record<string, any>;
  last_login?: string;
  created_at?: string;
  [key: string]: any;
}

interface SupabaseSyncContextType {
  syncedUser: SyncedUser | null;
  isSyncing: boolean;
  lastSync: Date | null;
  startSync: (userId: string) => Promise<void>;
  stopSync: () => void;
}

const SupabaseSyncContext = createContext<SupabaseSyncContextType | undefined>(undefined);

export const SupabaseSyncProvider = ({ children }: { children: ReactNode }) => {
  const [syncedUser, setSyncedUser] = useState<SyncedUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  const startSync = async (userId: string) => {
    console.log('🔄 [SupabaseSync] Starting real-time sync for user:', userId);
    setIsSyncing(true);

    try {
      // Fetch initial user data
      const userData = await fetchUserFromSupabase(userId);
      if (userData) {
        setSyncedUser(userData);
        setLastSync(new Date());
        console.log('✅ Initial user data loaded:', userData.username);

        // Save to local storage for offline access
        await AsyncStorage.setItem('@synced_user', JSON.stringify(userData));
      }

      // Subscribe to real-time changes
      const subscription = subscribeToUserById(userId, (payload) => {
        console.log('📡 [SupabaseSync] Real-time update received:', payload.eventType);

        if (payload.eventType === 'UPDATE') {
          const updatedData = payload.new;
          setSyncedUser(updatedData);
          setLastSync(new Date());
          AsyncStorage.setItem('@synced_user', JSON.stringify(updatedData));
          console.log('✅ User data synced from Supabase');
        } else if (payload.eventType === 'DELETE') {
          console.warn('⚠️ User deleted from Supabase');
          setSyncedUser(null);
          AsyncStorage.removeItem('@synced_user');
        }
      });

      setCurrentSubscription(subscription);
    } catch (error) {
      console.error('❌ Failed to start sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const stopSync = () => {
    console.log('🛑 [SupabaseSync] Stopping real-time sync');
    if (currentSubscription) {
      unsubscribeFromChannel(currentSubscription);
      setCurrentSubscription(null);
    }
  };

  // Restore synced user on app startup
  useEffect(() => {
    const restoreSyncedUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('@synced_user');
        if (stored) {
          setSyncedUser(JSON.parse(stored));
          console.log('✅ Restored synced user from storage');
        }
      } catch (error) {
        console.error('Failed to restore synced user:', error);
      }
    };

    restoreSyncedUser();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSync();
    };
  }, []);

  return (
    <SupabaseSyncContext.Provider value={{ syncedUser, isSyncing, lastSync, startSync, stopSync }}>
      {children}
    </SupabaseSyncContext.Provider>
  );
};

export const useSupabaseSync = () => {
  const context = useContext(SupabaseSyncContext);
  if (!context) {
    throw new Error('useSupabaseSync must be used within SupabaseSyncProvider');
  }
  return context;
};
