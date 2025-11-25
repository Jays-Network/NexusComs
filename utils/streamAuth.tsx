import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StreamChat } from 'stream-chat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getChatClient, 
  connectStreamUser, 
  disconnectStreamUser,
  connectVideoUser,
  disconnectVideoUser
} from './streamClient';
import { getStreamToken } from './streamApi';

interface User {
  id: string;
  name: string;
  image?: string;
}

interface StreamAuthContextType {
  user: User | null;
  chatClient: StreamChat | null;
  isLoading: boolean;
  login: (userId: string, userName: string, userImage?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const StreamAuthContext = createContext<StreamAuthContextType | undefined>(undefined);

const STORAGE_KEY = '@stream_user';

export const StreamAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    console.log('🔍 [streamAuth.tsx] Initializing authentication...');
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('📦 Stored user found:', !!storedUser);
      
      if (storedUser) {
        console.log('🔄 Restoring user session...');
        const userData = JSON.parse(storedUser);
        console.log('👤 Restoring user:', userData.name);
        await loginUser(userData.id, userData.name, userData.image);
      } else {
        console.log('ℹ️ No stored user - user will need to login');
      }
    } catch (error) {
      console.error('❌ Failed to initialize auth:', error);
      console.error('📋 Error details:', JSON.stringify(error));
    } finally {
      console.log('✅ Auth initialization complete');
      setIsLoading(false);
    }
  };

  const loginUser = async (userId: string, userName: string, userImage?: string) => {
    console.log('🔐 loginUser() called for:', userName);
    try {
      // Get token from backend
      console.log('🎫 Requesting Stream token...');
      const { token, userId: sanitizedUserId } = await getStreamToken(userId, userName, userImage);
      console.log('✅ Got Stream token for user:', sanitizedUserId);
      
      // Connect to Stream Chat (may return null if API key is missing)
      console.log('🔗 Connecting to Stream Chat...');
      const client = await connectStreamUser(sanitizedUserId, userName, token, userImage);
      console.log('✅ Connected to Stream Chat');
      
      // Connect to Stream Video (optional, only works in custom dev builds)
      try {
        console.log('📹 Attempting to connect Video SDK...');
        await connectVideoUser(sanitizedUserId, userName, token);
      } catch (error) {
        console.warn('⚠️ Video SDK not available (Expo Go limitation)');
      }
      
      const userData: User = {
        id: sanitizedUserId,
        name: userName,
        image: userImage,
      };
      
      console.log('💾 Saving user to state and storage...');
      setUser(userData);
      setChatClient(client); // client may be null if Stream is not available
      
      // Save user to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      console.log('✅ User logged in and saved:', userName);
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('📋 Error details:', JSON.stringify(error));
      throw error;
    }
  };

  const login = async (userId: string, userName: string, userImage?: string) => {
    setIsLoading(true);
    try {
      await loginUser(userId, userName, userImage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await disconnectStreamUser();
      await disconnectVideoUser();
      await AsyncStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setChatClient(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <StreamAuthContext.Provider value={{ user, chatClient, isLoading, login, logout }}>
      {children}
    </StreamAuthContext.Provider>
  );
};

export const useStreamAuth = () => {
  const context = useContext(StreamAuthContext);
  if (!context) {
    throw new Error('useStreamAuth must be used within StreamAuthProvider');
  }
  return context;
};
