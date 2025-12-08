import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getApiUrl(): string {
  const manifest = Constants.expoConfig || Constants.manifest2 || Constants.manifest;
  const debuggerHost = Constants.expoGoConfig?.debuggerHost || (manifest as any)?.debuggerHost;
  
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location?.hostname || '';
    if (hostname.includes('replit.dev') || hostname.includes('repl.co') || hostname.includes('platform.replit.com')) {
      const backendUrl = 'https://NexusComs.replit.app';
      console.log('[CometChatApi] Using production backend URL for web:', backendUrl);
      return backendUrl;
    }
  }
  
  if (debuggerHost && (Platform.OS === 'android' || Platform.OS === 'ios')) {
    const hostMatch = debuggerHost.match(/^([^:]+)/);
    if (hostMatch) {
      const host = hostMatch[1];
      if (host.includes('replit.dev') || host.includes('repl.co') || host.includes('worf.replit.dev')) {
        const backendUrl = `https://${host}:3000`;
        console.log('[CometChatApi] Using mobile dev backend URL:', backendUrl);
        return backendUrl;
      }
    }
  }
  
  if (process.env.EXPO_PUBLIC_API_URL && typeof process.env.EXPO_PUBLIC_API_URL === 'string' && process.env.EXPO_PUBLIC_API_URL.length > 0) {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL.trim();
    console.log('[CometChatApi] Using configured API URL:', apiUrl);
    return apiUrl;
  }
  
  console.log('[CometChatApi] Using default localhost fallback');
  return 'http://localhost:3000';
}

const API_URL = getApiUrl();
console.log('[CometChatApi] API URL configured:', API_URL);

export interface CometChatTokenResponse {
  authToken: string;
  userId: string;
  appId: string;
  region: string;
  authKey: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    billing_plan?: string;
  };
}

export async function loginWithUsernamePassword(
  username: string,
  password: string
): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return await response.json();
  } catch (error) {
    console.warn('[CometChatApi] Login request failed:', error);
    throw error;
  }
}

export async function getCometChatToken(
  userId: string,
  userName: string,
  userImage?: string
): Promise<CometChatTokenResponse> {
  try {
    const response = await fetch(`${API_URL}/api/auth/cometchat-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        userName,
        userImage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get CometChat token');
    }

    return await response.json();
  } catch (error) {
    console.warn('[CometChatApi] CometChat token request failed:', error);
    throw error;
  }
}

// Legacy function for backwards compatibility (calls CometChat endpoint)
export async function getStreamToken(
  userId: string,
  userName: string,
  userImage?: string
): Promise<{ token: string; userId: string; apiKey: string }> {
  const response = await getCometChatToken(userId, userName, userImage);
  return {
    token: response.authToken,
    userId: response.userId,
    apiKey: response.appId,
  };
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  parent_group_id?: number | null;
  cometchat_group_id?: string | null;
  member_count: number;
  created_at: string;
  created_by: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  parentGroupId?: number | null;
  memberIds?: string[];
}

export async function fetchGroups(authToken: string): Promise<Group[]> {
  try {
    const response = await fetch(`${API_URL}/api/groups`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch groups');
    }

    return await response.json();
  } catch (error) {
    console.warn('[CometChatApi] Fetch groups failed:', error);
    throw error;
  }
}

export async function createGroup(
  authToken: string,
  data: CreateGroupRequest
): Promise<{ message: string; group: Group }> {
  try {
    const response = await fetch(`${API_URL}/api/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create group');
    }

    return await response.json();
  } catch (error) {
    console.warn('[CometChatApi] Create group failed:', error);
    throw error;
  }
}
