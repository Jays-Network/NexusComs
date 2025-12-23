import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRoute, RouteProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import LiveLocationMap, { LiveLocationMapRef } from '@/components/LiveLocationMap';

type LiveLocationMapParams = {
  groupId: string;
  groupName?: string;
  initialLocation?: {
    latitude: number;
    longitude: number;
    senderName: string;
    senderId: string;
  };
};

type RouteProps = RouteProp<{ LiveLocationMap: LiveLocationMapParams }, 'LiveLocationMap'>;

interface LiveLocation {
  id: string;
  senderId: string;
  senderName: string;
  latitude: number;
  longitude: number;
  startedAt: string;
  durationMinutes: number;
  lastUpdated: string;
  isActive: boolean;
}

export default function LiveLocationMapScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { groupId, groupName, initialLocation } = route.params || {};
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const { theme } = useTheme();
  const mapRef = useRef<LiveLocationMapRef>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    loadLiveLocations();
    getCurrentLocation();

    refreshIntervalRef.current = setInterval(() => {
      loadLiveLocations();
    }, 10000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadLiveLocations();
    }, [groupId])
  );

  async function getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
    } catch (error) {
      console.error('[LiveLocationMap] Get current location error:', error);
    }
  }

  async function loadLiveLocations() {
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://NexusComs.replit.app';
      const token = await AsyncStorage.getItem('@session_token');
      
      if (!token) {
        console.log('[LiveLocationMap] No auth token available');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(`${API_URL}/api/location/group/${groupId}/live`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const now = Date.now();
        
        const activeLocs = data.filter((loc: LiveLocation) => {
          const startTime = new Date(loc.startedAt).getTime();
          const endTime = startTime + (loc.durationMinutes * 60 * 1000);
          return now < endTime;
        }).map((loc: LiveLocation) => ({
          ...loc,
          isActive: true
        }));
        
        setLiveLocations(activeLocs);
        console.log('[LiveLocationMap] Loaded live locations:', activeLocs.length);
      } else if (response.status === 404) {
        if (initialLocation) {
          setLiveLocations([{
            id: 'initial',
            senderId: initialLocation.senderId,
            senderName: initialLocation.senderName,
            latitude: initialLocation.latitude,
            longitude: initialLocation.longitude,
            startedAt: new Date().toISOString(),
            durationMinutes: 15,
            lastUpdated: new Date().toISOString(),
            isActive: true
          }]);
        }
      }
    } catch (error) {
      console.error('[LiveLocationMap] Load locations error:', error);
      if (initialLocation) {
        setLiveLocations([{
          id: 'initial',
          senderId: initialLocation.senderId,
          senderName: initialLocation.senderName,
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          startedAt: new Date().toISOString(),
          durationMinutes: 15,
          lastUpdated: new Date().toISOString(),
          isActive: true
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function getMarkerColor(index: number): string {
    const colors = ['#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1'];
    return colors[index % colors.length];
  }

  const initialRegion = initialLocation
    ? {
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }
    : currentLocation
    ? {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      }
    : liveLocations.length > 0
    ? {
        latitude: liveLocations[0].latitude,
        longitude: liveLocations[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      }
    : {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={styles.loadingText}>Loading locations...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary, paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            Live Locations
          </ThemedText>
          {groupName ? (
            <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {groupName}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.memberCount}>
          <Feather name="users" size={16} color={theme.primary} />
          <ThemedText style={[styles.memberCountText, { color: theme.primary }]}>
            {liveLocations.length}
          </ThemedText>
        </View>
      </View>

      <LiveLocationMap
        ref={mapRef}
        liveLocations={liveLocations}
        initialRegion={initialRegion}
        currentLocation={currentLocation}
        onRefresh={loadLiveLocations}
        getMarkerColor={getMarkerColor}
        bottomInset={tabBarHeight > 0 ? tabBarHeight : insets.bottom}
        topInset={insets.top}
      />

      {liveLocations.length === 0 && !isLoading ? (
        <View style={[styles.emptyOverlay, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="map-pin" size={48} color={theme.textDisabled} />
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            No active live locations
          </ThemedText>
          <ThemedText style={[styles.emptySubtext, { color: theme.textDisabled }]}>
            Members sharing their location will appear here
          </ThemedText>
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
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md
  },
  backButton: {
    padding: Spacing.sm
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.sm
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 20
  },
  memberCountText: {
    fontSize: 14,
    fontWeight: '600'
  },
  emptyOverlay: {
    position: 'absolute',
    top: '40%',
    left: Spacing.xl,
    right: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: Spacing.md
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.xs
  }
});
