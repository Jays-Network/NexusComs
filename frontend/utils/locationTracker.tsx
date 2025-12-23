import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const LOCATION_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
let locationInterval: NodeJS.Timeout | null = null;
let isTracking = false;

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

function getApiUrl(): string {
  const configUrl = Constants.expoConfig?.extra?.apiUrl;
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  const fallbackUrl = 'https://NexusComs.replit.app';
  
  const url = configUrl || envUrl || fallbackUrl;
  console.log('[LocationTracker] Using API URL:', url);
  return url;
}

async function sendLocationToServer(userId: string, location: LocationUpdate): Promise<boolean> {
  try {
    const API_URL = getApiUrl();
    const token = await AsyncStorage.getItem('@session_token');
    
    if (!token) {
      console.log('[LocationTracker] No auth token - skipping location update');
      return false;
    }

    const deviceInfo = `${Platform.OS} ${Platform.Version}`;

    const endpoint = `${API_URL}/api/users/${userId}/location`;
    
    console.log('[LocationTracker] Sending location update for user:', userId);
    console.log('[LocationTracker] Endpoint:', endpoint);
    console.log('[LocationTracker] Coordinates:', location.latitude, location.longitude);
    console.log('[LocationTracker] Device:', deviceInfo);

    const requestBody = {
      user_id: userId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp,
      device_info: deviceInfo
    };

    console.log('[LocationTracker] Request body:', JSON.stringify(requestBody));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      console.log('[LocationTracker] Location updated successfully');
      return true;
    } else {
      const errorText = await response.text();
      console.error('[LocationTracker] Location update FAILED');
      console.error('[LocationTracker] User ID:', userId);
      console.error('[LocationTracker] API URL:', API_URL);
      console.error('[LocationTracker] Full endpoint:', endpoint);
      console.error('[LocationTracker] Status:', response.status);
      console.error('[LocationTracker] Error:', errorText);
      return false;
    }
  } catch (error) {
    console.error('[LocationTracker] Error sending location:', error);
    return false;
  }
}

async function getCurrentLocationAndSend(userId: string): Promise<void> {
  try {
    console.log('[LocationTracker] Getting current location...');
    
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[LocationTracker] Location permission not granted - status:', status);
      return;
    }

    console.log('[LocationTracker] Location permission granted, fetching position...');
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });

    console.log('[LocationTracker] Got location:', location.coords.latitude, location.coords.longitude);

    const locationUpdate: LocationUpdate = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp
    };

    await sendLocationToServer(userId, locationUpdate);
  } catch (error) {
    console.error('[LocationTracker] Error getting location:', error);
  }
}

export function startLocationTracking(userId: string): void {
  if (isTracking) {
    console.log('[LocationTracker] Already tracking');
    return;
  }

  console.log('[LocationTracker] Starting location tracking (5 min interval) for user:', userId);
  isTracking = true;

  // Send initial location immediately
  getCurrentLocationAndSend(userId);

  // Set up interval for every 5 minutes
  locationInterval = setInterval(() => {
    getCurrentLocationAndSend(userId);
  }, LOCATION_UPDATE_INTERVAL);
}

export function stopLocationTracking(): void {
  if (locationInterval) {
    clearInterval(locationInterval);
    locationInterval = null;
  }
  isTracking = false;
  console.log('[LocationTracker] Location tracking stopped');
}

export function isLocationTrackingActive(): boolean {
  return isTracking;
}

export async function sendLocationOnce(userId: string): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[LocationTracker] Location permission not granted for single update');
      return false;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });

    const locationUpdate: LocationUpdate = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp
    };

    return await sendLocationToServer(userId, locationUpdate);
  } catch (error) {
    console.error('[LocationTracker] Error in sendLocationOnce:', error);
    return false;
  }
}
