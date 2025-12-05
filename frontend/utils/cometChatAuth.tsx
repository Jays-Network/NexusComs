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
  id: string;
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
        await loginUser(userData.id, userData.name, userData.image);
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

  const loginUser = async (userId: string, userName: string, userImage?: string) => {
    console.log('[CometChatAuth] loginUser() called for:', userName);
    try {
      let cometchatUserId = userId;
      
      // Get CometChat token from backend
      console.log('[CometChatAuth] Requesting CometChat token...');
      try {
        const tokenResponse = await getCometChatToken(userId, userName, userImage);
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
        id: cometchatUserId,
        name: userName,
        image: userImage,
      };
      
      console.log('[CometChatAuth] Saving user to state with ID:', cometchatUserId);
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
      
      // Store session token for API calls
      await AsyncStorage.setItem('@session_token', sessionToken);
      setAuthToken(sessionToken);
      
      // Pass the email to create a proper CometChat UID
      await loginUser(backendUser.email, backendUser.username);
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
