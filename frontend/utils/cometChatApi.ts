import { Platform } from 'react-native';
import Constants from 'expo-constants';

const PRODUCTION_BACKEND_URL = 'https://NexusComs.replit.app';

function getApiUrl(): string {
  const manifest = Constants.expoConfig || Constants.manifest2 || Constants.manifest;
  const debuggerHost = Constants.expoGoConfig?.debuggerHost || (manifest as any)?.debuggerHost;
  
  // Check for explicitly configured API URL first (for EAS builds)
  if (process.env.EXPO_PUBLIC_API_URL && typeof process.env.EXPO_PUBLIC_API_URL === 'string' && process.env.EXPO_PUBLIC_API_URL.length > 0) {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL.trim();
    console.log('[CometChatApi] Using configured API URL:', apiUrl);
    return apiUrl;
  }
  
  // For web on Replit domains
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location?.hostname || '';
    if (hostname.includes('replit.dev') || hostname.includes('repl.co') || hostname.includes('platform.replit.com')) {
      console.log('[CometChatApi] Using production backend URL for web:', PRODUCTION_BACKEND_URL);
      return PRODUCTION_BACKEND_URL;
    }
  }
  
  // For mobile development with Expo Go on Replit
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
  
  // For EAS builds (production/preview) without EXPO_PUBLIC_API_URL set, use production backend
  // This is the fallback for standalone builds where env vars may not be configured
  if (!debuggerHost && (Platform.OS === 'android' || Platform.OS === 'ios')) {
    console.log('[CometChatApi] Using production backend URL for standalone build:', PRODUCTION_BACKEND_URL);
    return PRODUCTION_BACKEND_URL;
  }
  
  // Local development fallback
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

function getDeviceInfo(): string {
  const platform = Platform.OS;
  const version = Platform.Version;
  const deviceName = Constants.deviceName || 'Unknown Device';
  
  let deviceString = '';
  if (platform === 'ios') {
    deviceString = `iOS ${version} - ${deviceName}`;
  } else if (platform === 'android') {
    deviceString = `Android ${version} - ${deviceName}`;
  } else if (platform === 'web') {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Browser';
    deviceString = `Web - ${userAgent.substring(0, 100)}`;
  } else {
    deviceString = `${platform} - ${deviceName}`;
  }
  
  return deviceString;
}

export async function loginWithUsernamePassword(
  username: string,
  password: string
): Promise<LoginResponse> {
  try {
    const deviceInfo = getDeviceInfo();
    console.log('[CometChatApi] Sending login with device_info:', deviceInfo);
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        device_info: deviceInfo,
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

// ============= EMERGENCY ALERT API =============

export interface EmergencyTriggerRequest {
  message: string;
  location?: string;
  source_group_id?: string;
  source_group_name?: string;
}

export interface EmergencyTriggerResponse {
  success: boolean;
  emergency_group_id: string;
  emergency_group_name: string;
  members_added: number;
  push_notifications_sent: number;
  database_record_id?: number;
}

export async function triggerEmergencyAlert(
  authToken: string,
  data: EmergencyTriggerRequest
): Promise<EmergencyTriggerResponse> {
  try {
    console.log('[CometChatApi] Triggering emergency alert:', data);
    const response = await fetch(`${API_URL}/api/emergency/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to trigger emergency alert');
    }

    const result = await response.json();
    console.log('[CometChatApi] Emergency alert triggered:', result);
    return result;
  } catch (error) {
    console.warn('[CometChatApi] Trigger emergency failed:', error);
    throw error;
  }
}

export async function registerPushToken(
  authToken: string,
  pushToken: string
): Promise<{ success: boolean }> {
  try {
    console.log('[CometChatApi] Registering push token');
    const response = await fetch(`${API_URL}/api/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ push_token: pushToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register push token');
    }

    return await response.json();
  } catch (error) {
    console.warn('[CometChatApi] Register push token failed:', error);
    throw error;
  }
}

export async function getActiveEmergencies(
  authToken: string
): Promise<{ emergencies: any[] }> {
  try {
    const response = await fetch(`${API_URL}/api/emergency/active`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch emergencies');
    }

    return await response.json();
  } catch (error) {
    console.warn('[CometChatApi] Fetch emergencies failed:', error);
    throw error;
  }
}

export { API_URL };
