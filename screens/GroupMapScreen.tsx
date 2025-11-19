import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Pressable, Text, Platform } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/utils/auth';
import { ChatsStackParamList } from '@/navigation/ChatsStackNavigator';

type RouteProps = RouteProp<ChatsStackParamList, 'GroupMap'>;

interface UserLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  created_at: string;
  users: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

// Conditionally import MapView components
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
let mapsAvailable = false;

try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  mapsAvailable = true;
} catch (error) {
  // Maps not available (e.g., in Expo Go)
  console.log('react-native-maps not available - showing fallback UI');
}

export default function GroupMapScreen() {
  const route = useRoute<RouteProps>();
  const { subgroupId } = route.params;
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const { theme: colors } = useTheme();
  const { token } = useAuth();

  useEffect(() => {
    loadLocations();
    getCurrentLocation();
  }, []);

  async function getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to show your position');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
    } catch (error) {
      console.error('Get current location error:', error);
    }
  }

  async function loadLocations() {
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/location/group/${subgroupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Load locations error:', error);
      Alert.alert('Error', 'Failed to load member locations');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Show fallback UI if maps are not available
  if (!mapsAvailable) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundRoot }]}>
        <Feather name="map" size={64} color={colors.textDisabled} />
        <Text style={[styles.fallbackTitle, { color: colors.text }]}>
          Maps Not Available
        </Text>
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
          The map feature requires a custom development build.
        </Text>
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
          It's not available in Expo Go.
        </Text>
        
        {locations.length > 0 ? (
          <View style={styles.locationList}>
            <Text style={[styles.locationListTitle, { color: colors.text }]}>
              Member Locations:
            </Text>
            {locations.map((location) => (
              <View key={location.id} style={[styles.locationItem, { backgroundColor: colors.backgroundSecondary }]}>
                <Feather name="map-pin" size={16} color={colors.primary} />
                <View style={styles.locationDetails}>
                  <Text style={[styles.locationName, { color: colors.text }]}>
                    {location.users.display_name}
                  </Text>
                  <Text style={[styles.locationCoords, { color: colors.textSecondary }]}>
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </Text>
                  <Text style={[styles.locationTime, { color: colors.textDisabled }]}>
                    {new Date(location.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.fallbackText, { color: colors.textDisabled, marginTop: Spacing.xl }]}>
            No member locations available
          </Text>
        )}
        
        <Pressable
          onPress={loadLocations}
          style={[styles.refreshButtonFallback, { backgroundColor: colors.primary }]}
        >
          <Feather name="refresh-cw" size={20} color="#FFFFFF" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  const initialRegion = currentLocation
    ? {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      }
    : locations.length > 0
    ? {
        latitude: parseFloat(locations[0].latitude.toString()),
        longitude: parseFloat(locations[0].longitude.toString()),
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      }
    : {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {locations.map((location) => (
          <Marker
            key={location.id}
            coordinate={{
              latitude: parseFloat(location.latitude.toString()),
              longitude: parseFloat(location.longitude.toString())
            }}
            title={location.users.display_name}
            description={`Updated: ${new Date(location.created_at).toLocaleTimeString()}`}
            pinColor={Colors.light.primary}
          />
        ))}
      </MapView>

      <Pressable
        onPress={loadLocations}
        style={[styles.refreshButton, { backgroundColor: colors.primary }]}
      >
        <Feather name="refresh-cw" size={24} color="#FFFFFF" />
      </Pressable>

      {locations.length === 0 ? (
        <View style={[styles.emptyOverlay, { backgroundColor: colors.backgroundRoot }]}>
          <Feather name="map-pin" size={48} color={Colors.light.textDisabled} />
          <Text style={styles.emptyText}>
            No member locations available
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl
  },
  map: {
    flex: 1
  },
  refreshButton: {
    position: 'absolute',
    bottom: Spacing['3xl'],
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  emptyOverlay: {
    position: 'absolute',
    top: Spacing['5xl'],
    left: Spacing.lg,
    right: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.6,
    marginTop: Spacing.md
  },
  fallbackTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: Spacing.lg,
    textAlign: 'center'
  },
  fallbackText: {
    fontSize: 16,
    marginTop: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl
  },
  locationList: {
    marginTop: Spacing['2xl'],
    width: '100%',
    paddingHorizontal: Spacing.lg
  },
  locationListTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.md
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm
  },
  locationDetails: {
    flex: 1
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  locationCoords: {
    fontSize: 14,
    marginBottom: 2
  },
  locationTime: {
    fontSize: 12
  },
  refreshButtonFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.lg,
    marginTop: Spacing['2xl'],
    gap: Spacing.sm
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
