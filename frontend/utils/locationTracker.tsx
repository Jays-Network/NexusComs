import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
let locationInterval: NodeJS.Timeout | null = null;
let isTracking = false;

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

async function sendLocationToServer(userId: string, location: LocationUpdate): Promise<boolean> {
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    const token = await AsyncStorage.getItem('@session_token');
    
    if (!token) {
      console.log('[LocationTracker] No auth token - skipping location update');
      return false;
    }

    const response = await fetch(`${API_URL}/api/location/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: userId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp
      })
    });

    if (response.ok) {
      console.log('[LocationTracker] Location updated successfully');
      return true;
    } else {
      console.warn(`[LocationTracker] Failed to update location: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('[LocationTracker] Error sending location:', error);
    return false;
  }
}

async function getCurrentLocationAndSend(userId: string): Promise<void> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[LocationTracker] Location permission not granted');
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });

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

  console.log('[LocationTracker] Starting location tracking (5 min interval)');
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
