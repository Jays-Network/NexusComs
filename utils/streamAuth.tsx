import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StreamChat } from 'stream-chat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getChatClient, 
  connectStreamUser, 
  disconnectStreamUser,
  generateUserToken,
  connectVideoUser,
  disconnectVideoUser
} from './streamClient';

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
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        await loginUser(userData.id, userData.name, userData.image);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loginUser = async (userId: string, userName: string, userImage?: string) => {
    try {
      // Generate token (in production, fetch from your backend)
      const token = generateUserToken(userId);
      
      // Connect to Stream Chat
      const client = await connectStreamUser(userId, userName, token, userImage);
      
      // Connect to Stream Video (optional, only works in custom dev builds)
      try {
        await connectVideoUser(userId, userName, token);
      } catch (error) {
        console.warn('Video SDK not available (Expo Go limitation)');
      }
      
      const userData: User = {
        id: userId,
        name: userName,
        image: userImage,
      };
      
      setUser(userData);
      setChatClient(client);
      
      // Save user to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Login error:', error);
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
