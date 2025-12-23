import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Pressable, Text, Platform } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing } from '@/constants/theme';
import { useCometChatAuth } from '@/utils/cometChatAuth';

type GroupMapParams = {
  groupId: string;
};

type RouteProps = RouteProp<{ GroupMap: GroupMapParams }, 'GroupMap'>;

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

export default function GroupMapScreen() {
  const route = useRoute<RouteProps>();
  const { groupId } = route.params || {};
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const { theme: colors } = useTheme();
  const { authToken } = useCometChatAuth();

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
      const response = await fetch(`${API_URL}/api/location/group/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
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
  }
});
