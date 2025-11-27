// Backend hosted on Replit, frontend on Expo.dev
// Safe API URL initialization - never parse undefined
import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getApiUrl(): string {
  // Get the Expo manifest/config to detect development mode
  const manifest = Constants.expoConfig || Constants.manifest2 || Constants.manifest;
  const debuggerHost = Constants.expoGoConfig?.debuggerHost || (manifest as any)?.debuggerHost;
  
  // For web development, use the dev domain backend (port 3003 is mapped to local 3000)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location?.hostname || '';
    // If running on Replit dev domain, use the backend port
    if (hostname.includes('replit.dev') || hostname.includes('repl.co')) {
      // Backend is on port 3003 (mapped from local 3000)
      const backendUrl = `https://${hostname.replace(':8081', '')}:3003`;
      console.log('🌐 [streamApi] Using dev backend URL:', backendUrl);
      return backendUrl;
    }
  }
  
  // For mobile (Android/iOS) in Expo Go development mode
  // The debuggerHost will be something like "hostname:port"
  if (debuggerHost && (Platform.OS === 'android' || Platform.OS === 'ios')) {
    // Extract hostname from debuggerHost (format: hostname:port)
    const hostMatch = debuggerHost.match(/^([^:]+)/);
    if (hostMatch) {
      const host = hostMatch[1];
      // Check if it's a Replit dev domain
      if (host.includes('replit.dev') || host.includes('repl.co') || host.includes('worf.replit.dev')) {
        // Backend is on port 3003
        const backendUrl = `https://${host}:3003`;
        console.log('🌐 [streamApi] Using mobile dev backend URL:', backendUrl);
        return backendUrl;
      }
    }
  }
  
  // For production or native apps, use the configured URL
  if (process.env.EXPO_PUBLIC_API_URL && typeof process.env.EXPO_PUBLIC_API_URL === 'string' && process.env.EXPO_PUBLIC_API_URL.length > 0) {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL.trim();
    console.log('🌐 [streamApi] Using configured API URL:', apiUrl);
    return apiUrl;
  }
  
  // Default fallback
  console.log('🌐 [streamApi] Using default localhost fallback');
  return 'http://localhost:3000';
}

const API_URL = getApiUrl();
console.log('🌐 [streamApi] API URL configured:', API_URL);
console.log('🔍 [streamApi] EXPO_PUBLIC_API_URL raw:', process.env.EXPO_PUBLIC_API_URL);

export interface StreamTokenResponse {
  token: string;
  userId: string;
  apiKey: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
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
    console.warn('⚠️ Login request failed:', error);
    throw error;
  }
}

export async function getStreamToken(
  userId: string,
  userName: string,
  userImage?: string
): Promise<StreamTokenResponse> {
  try {
    const response = await fetch(`${API_URL}/api/auth/stream-token`, {
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
      throw new Error(error.error || 'Failed to get Stream token');
    }

    return await response.json();
  } catch (error) {
    console.warn('⚠️ Stream token request failed (backend may be down):', error);
    throw error;
  }
}

// Group types
export interface Group {
  id: number;
  name: string;
  description?: string;
  parent_group_id?: number | null;
  stream_channel_id?: string | null;
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

// Fetch all groups from backend
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
    console.warn('⚠️ Fetch groups failed:', error);
    throw error;
  }
}

// Create a new group via backend
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
    console.warn('⚠️ Create group failed:', error);
    throw error;
  }
}
