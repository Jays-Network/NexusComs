import { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Text, Pressable, Platform } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

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

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface LiveLocationMapProps {
  liveLocations: LiveLocation[];
  initialRegion: MapRegion;
  currentLocation?: { coords: { latitude: number; longitude: number } } | null;
  onRefresh: () => void;
  getMarkerColor: (index: number) => string;
  bottomInset: number;
  topInset: number;
}

export interface LiveLocationMapRef {
  fitToAllMarkers: () => void;
  animateToRegion: (region: MapRegion, duration?: number) => void;
  animateToUser: () => void;
}

const LiveLocationMapComponent = forwardRef<LiveLocationMapRef, LiveLocationMapProps>(
  ({ liveLocations, initialRegion, currentLocation, onRefresh, getMarkerColor, bottomInset, topInset }, ref) => {
    const mapRef = useRef<MapView>(null);
    const { theme } = useTheme();

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

    function animateToUser() {
      if (currentLocation && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005
        }, 500);
      } else if (liveLocations.length > 0 && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: liveLocations[0].latitude,
          longitude: liveLocations[0].longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005
        }, 500);
      }
    }

    useImperativeHandle(ref, () => ({
      fitToAllMarkers,
      animateToRegion: (region: MapRegion, duration = 500) => {
        mapRef.current?.animateToRegion(region, duration);
      },
      animateToUser
    }));

    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFillObject}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          onMapReady={() => {
            setTimeout(() => {
              fitToAllMarkers();
            }, 500);
          }}
          mapType="standard"
        >
          {liveLocations.map((location, index) => (
            <Marker
              key={location.id}
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude
              }}
              pinColor={getMarkerColor(index)}
              tracksViewChanges={false}
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

        <View style={[styles.buttonContainer, { bottom: bottomInset + Spacing.lg }]}>
          <Pressable
            onPress={animateToUser}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            accessibilityLabel="Re-center map on my location"
          >
            <Feather name="crosshair" size={20} color={theme.primary} />
          </Pressable>
          
          <Pressable
            onPress={onRefresh}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            accessibilityLabel="Refresh locations"
          >
            <Feather name="refresh-cw" size={20} color={theme.primary} />
          </Pressable>
          
          {liveLocations.length > 1 ? (
            <Pressable
              onPress={fitToAllMarkers}
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              accessibilityLabel="Fit all markers in view"
            >
              <Feather name="maximize-2" size={20} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>

        {liveLocations.length > 0 ? (
          <View style={[styles.legend, { backgroundColor: theme.backgroundSecondary, top: topInset + 80 }]}>
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
        ) : null}
      </View>
    );
  }
);

LiveLocationMapComponent.displayName = 'LiveLocationMap';

export default LiveLocationMapComponent;

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    position: 'relative'
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
  }
});
