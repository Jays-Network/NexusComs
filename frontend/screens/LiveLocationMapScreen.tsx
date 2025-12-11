import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Pressable, Text, Platform } from 'react-native';
import { useRoute, RouteProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useCometChatAuth } from '@/utils/cometChatAuth';
import { ThemedText } from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { authToken } = useCometChatAuth();
  const mapRef = useRef<MapView>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();

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
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/location/group/${groupId}/live`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
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

  function fitToAllMarkers() {
    if (mapRef.current && liveLocations.length > 0) {
      const coordinates = liveLocations.map(loc => ({
        latitude: loc.latitude,
        longitude: loc.longitude
      }));
      
      if (currentLocation) {
        coordinates.push({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude
        });
      }
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true
      });
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

      {Platform.OS === 'web' ? (
        <View style={[styles.webFallback, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="map" size={64} color={theme.textDisabled} />
          <ThemedText style={[styles.webFallbackText, { color: theme.textSecondary }]}>
            Maps are not available on web.
          </ThemedText>
          <ThemedText style={[styles.webFallbackText, { color: theme.textSecondary }]}>
            Open the app on your mobile device to view live locations.
          </ThemedText>
          
          {liveLocations.length > 0 && (
            <View style={styles.locationsList}>
              <ThemedText style={[styles.locationsListTitle, { color: theme.text }]}>
                Active Live Locations:
              </ThemedText>
              {liveLocations.map((loc, index) => (
                <View key={loc.id} style={[styles.locationItem, { backgroundColor: theme.backgroundRoot }]}>
                  <View style={[styles.locationDot, { backgroundColor: getMarkerColor(index) }]} />
                  <View style={styles.locationItemInfo}>
                    <ThemedText style={[styles.locationItemName, { color: theme.text }]}>
                      {loc.senderName}
                    </ThemedText>
                    <ThemedText style={[styles.locationItemCoords, { color: theme.textSecondary }]}>
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
            onMapReady={fitToAllMarkers}
          >
            {liveLocations.map((location, index) => (
              <Marker
                key={location.id}
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude
                }}
                pinColor={getMarkerColor(index)}
              >
                <View style={styles.customMarker}>
                  <View style={[styles.markerPin, { backgroundColor: getMarkerColor(index) }]}>
                    <Feather name="navigation" size={16} color="#FFFFFF" />
                  </View>
                  <View style={[styles.markerLabel, { backgroundColor: theme.backgroundSecondary }]}>
                    <Text style={[styles.markerLabelText, { color: theme.text }]} numberOfLines={1}>
                      {location.senderName}
                    </Text>
                  </View>
                </View>
                <Callout>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{location.senderName}</Text>
                    <Text style={styles.calloutDescription}>
                      Sharing live location
                    </Text>
                    <Text style={styles.calloutTime}>
                      Updated: {new Date(location.lastUpdated).toLocaleTimeString()}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>

          <View style={[styles.buttonContainer, { bottom: insets.bottom + Spacing.lg }]}>
            <Pressable
              onPress={loadLiveLocations}
              style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="refresh-cw" size={20} color={theme.primary} />
            </Pressable>
            
            {liveLocations.length > 1 && (
              <Pressable
                onPress={fitToAllMarkers}
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
              >
                <Feather name="maximize-2" size={20} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

          {liveLocations.length > 0 && (
            <View style={[styles.legend, { backgroundColor: theme.backgroundSecondary, top: insets.top + 80 }]}>
              {liveLocations.map((loc, index) => (
                <Pressable 
                  key={loc.id}
                  style={styles.legendItem}
                  onPress={() => {
                    mapRef.current?.animateToRegion({
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005
                    }, 500);
                  }}
                >
                  <View style={[styles.legendDot, { backgroundColor: getMarkerColor(index) }]} />
                  <Text style={[styles.legendText, { color: theme.text }]} numberOfLines={1}>
                    {loc.senderName}
                  </Text>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}

      {liveLocations.length === 0 && !isLoading && (
        <View style={[styles.emptyOverlay, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="map-pin" size={48} color={theme.textDisabled} />
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            No active live locations
          </ThemedText>
          <ThemedText style={[styles.emptySubtext, { color: theme.textDisabled }]}>
            Members sharing their location will appear here
          </ThemedText>
        </View>
      )}
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
    borderRadius: BorderRadius.full
  },
  memberCountText: {
    fontSize: 14,
    fontWeight: '600'
  },
  map: {
    flex: 1
  },
  customMarker: {
    alignItems: 'center'
  },
  markerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4
  },
  markerLabel: {
    marginTop: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    maxWidth: 100
  },
  markerLabelText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center'
  },
  callout: {
    padding: Spacing.sm,
    minWidth: 150
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000'
  },
  calloutDescription: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2
  },
  calloutTime: {
    fontSize: 10,
    color: '#999999',
    marginTop: 4
  },
  buttonContainer: {
    position: 'absolute',
    right: Spacing.lg,
    flexDirection: 'column',
    gap: Spacing.sm
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  legend: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 150
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  legendText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500'
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444'
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444'
  },
  emptyOverlay: {
    position: 'absolute',
    top: '40%',
    left: Spacing.xl,
    right: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
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
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl
  },
  webFallbackText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.sm
  },
  locationsList: {
    marginTop: Spacing.xl,
    width: '100%',
    maxWidth: 400
  },
  locationsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.md
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  locationItemInfo: {
    flex: 1
  },
  locationItemName: {
    fontSize: 14,
    fontWeight: '500'
  },
  locationItemCoords: {
    fontSize: 12,
    marginTop: 2
  }
});
