import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  initializeCometChat,
  loginCometChatUser, 
  logoutCometChatUser,
  getLoggedInUser,
  CometChat,
  COMETCHAT_CONFIG_VALID,
} from './cometChatClient';
import { getCometChatToken, loginWithUsernamePassword } from './cometChatApi';

interface User {
  id: string;           // Supabase UUID for backend API calls
  cometChatId: string;  // CometChat UID for chat operations
  email: string;        // Email for CometChat token requests
  name: string;
  image?: string;
}

interface CometChatAuthContextType {
  user: User | null;
  cometChatUser: any | null;
  isLoading: boolean;
  authToken: string | null;
  isInitialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const CometChatAuthContext = createContext<CometChatAuthContextType | undefined>(undefined);

const STORAGE_KEY = '@cometchat_user';

export const CometChatAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [cometChatUser, setCometChatUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    console.log('[CometChatAuth] Initializing authentication...');
    try {
      // Initialize CometChat SDK first
      if (COMETCHAT_CONFIG_VALID) {
        const initialized = await initializeCometChat();
        setIsInitialized(initialized);
        
        if (initialized) {
          // Check if there's a logged-in user
          const loggedInUser = await getLoggedInUser();
          if (loggedInUser) {
            console.log('[CometChatAuth] Found logged in CometChat user:', loggedInUser.getUid());
            setCometChatUser(loggedInUser);
          }
        }
      }

      // Check for stored session
      const storedUser = await AsyncStorage.getItem(STORAGE_KEY);
      const storedToken = await AsyncStorage.getItem('@session_token');
      console.log('[CometChatAuth] Stored user found:', !!storedUser);
      
      if (storedToken) {
        setAuthToken(storedToken);
      }
      
      if (storedUser) {
        console.log('[CometChatAuth] Restoring user session...');
        const userData = JSON.parse(storedUser);
        console.log('[CometChatAuth] Restoring user:', userData.name);
        
        // Check if this is a valid UUID (new format) or CometChat UID (old format)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userData.id);
        
        if (isUUID && userData.cometChatId && userData.email) {
          // New format with all required fields - restore user state directly
          console.log('[CometChatAuth] Restoring user with new format (UUID + CometChat ID + Email)');
          setUser(userData);
          
          // Try to log into CometChat if initialized
          if (isInitialized) {
            try {
              const tokenResponse = await getCometChatToken(userData.email, userData.name, userData.image);
              const ccUser = await loginCometChatUser(userData.cometChatId, tokenResponse.authToken);
              setCometChatUser(ccUser);
              console.log('[CometChatAuth] CometChat restored successfully');
            } catch (e) {
              console.warn('[CometChatAuth] Could not restore CometChat session:', e);
            }
          }
        } else {
          // Old format - require re-login to get proper IDs
          console.log('[CometChatAuth] Legacy user data format detected - user will need to re-login');
          await AsyncStorage.removeItem(STORAGE_KEY);
          await AsyncStorage.removeItem('@session_token');
        }
      } else {
        console.log('[CometChatAuth] No stored user - user will need to login');
      }
    } catch (error) {
      console.error('[CometChatAuth] Failed to initialize auth:', error);
    } finally {
      console.log('[CometChatAuth] Auth initialization complete');
      setIsLoading(false);
    }
  };

  const loginUser = async (supabaseUserId: string, userEmail: string, userName: string, userImage?: string) => {
    console.log('[CometChatAuth] loginUser() called for:', userName);
    console.log('[CometChatAuth] Supabase user ID:', supabaseUserId);
    try {
      let cometchatUserId = userEmail.replace(/[@.]/g, '_').toLowerCase();
      
      // Get CometChat token from backend
      console.log('[CometChatAuth] Requesting CometChat token...');
      try {
        const tokenResponse = await getCometChatToken(userEmail, userName, userImage);
        console.log('[CometChatAuth] Got CometChat token for user:', tokenResponse.userId);
        
        cometchatUserId = tokenResponse.userId;
        
        // Login to CometChat with auth token
        if (isInitialized || await initializeCometChat()) {
          console.log('[CometChatAuth] Logging into CometChat...');
          try {
            const ccUser = await loginCometChatUser(cometchatUserId, tokenResponse.authToken);
            setCometChatUser(ccUser);
            console.log('[CometChatAuth] CometChat login successful');
          } catch (ccError) {
            console.warn('[CometChatAuth] CometChat login failed, continuing without chat:', ccError);
            setCometChatUser(null);
          }
        }
      } catch (tokenError) {
        console.warn('[CometChatAuth] Failed to get CometChat token, app will work in offline mode:', tokenError);
      }
      
      const userData: User = {
        id: supabaseUserId,           // Supabase UUID for backend API calls
        cometChatId: cometchatUserId, // CometChat UID for chat operations
        email: userEmail,             // Email for CometChat token requests
        name: userName,
        image: userImage,
      };
      
      console.log('[CometChatAuth] Saving user to state with Supabase ID:', supabaseUserId);
      console.log('[CometChatAuth] CometChat ID:', cometchatUserId);
      setUser(userData);
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      console.log('[CometChatAuth] User logged in and saved:', userName);
    } catch (error) {
      console.error('[CometChatAuth] Login error:', error);
      throw error;
    }
  };

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('[CometChatAuth] Authenticating with backend...');
      const { token: sessionToken, user: backendUser } = await loginWithUsernamePassword(username, password);
      console.log('[CometChatAuth] Backend authentication successful for:', backendUser.username);
      console.log('[CometChatAuth] Supabase user ID:', backendUser.id);
      
      // Store session token for API calls
      await AsyncStorage.setItem('@session_token', sessionToken);
      setAuthToken(sessionToken);
      
      // Pass the Supabase ID and email for proper user creation
      await loginUser(backendUser.id, backendUser.email, backendUser.username);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('[CometChatAuth] Logout initiated...');
    try {
      console.log('[CometChatAuth] Logging out of CometChat...');
      await logoutCometChatUser();
      console.log('[CometChatAuth] CometChat logout successful');
      
      console.log('[CometChatAuth] Clearing stored data...');
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem('@session_token');
      console.log('[CometChatAuth] Storage cleared');
      
      setUser(null);
      setCometChatUser(null);
      setAuthToken(null);
      console.log('[CometChatAuth] Logout complete - state cleared');
    } catch (error) {
      console.error('[CometChatAuth] Logout error:', error);
      // Still clear local state even if CometChat logout fails
      setUser(null);
      setCometChatUser(null);
      setAuthToken(null);
      await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      await AsyncStorage.removeItem('@session_token').catch(() => {});
      console.log('[CometChatAuth] Forced logout complete despite error');
    }
  };

  return (
    <CometChatAuthContext.Provider 
      value={{ 
        user, 
        cometChatUser, 
        isLoading, 
        authToken, 
        isInitialized, 
        login, 
        logout 
      }}
    >
      {children}
    </CometChatAuthContext.Provider>
  );
};

export const useCometChatAuth = () => {
  const context = useContext(CometChatAuthContext);
  if (!context) {
    throw new Error('useCometChatAuth must be used within CometChatAuthProvider');
  }
  return context;
};

// Alias for backwards compatibility during migration
export const useStreamAuth = useCometChatAuth;
export const StreamAuthProvider = CometChatAuthProvider;
