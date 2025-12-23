import { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
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
}

const LiveLocationMapComponent = forwardRef<LiveLocationMapRef, LiveLocationMapProps>(
  ({ liveLocations, onRefresh, getMarkerColor }, ref) => {
    const { theme } = useTheme();

    useImperativeHandle(ref, () => ({
      fitToAllMarkers: () => {},
      animateToRegion: () => {}
    }));

    return (
      <View style={[styles.webFallback, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="map" size={64} color={theme.textDisabled} />
        <ThemedText style={[styles.webFallbackText, { color: theme.textSecondary }]}>
          Maps are not available on web.
        </ThemedText>
        <ThemedText style={[styles.webFallbackText, { color: theme.textSecondary }]}>
          Open the app on your mobile device to view live locations.
        </ThemedText>
        
        <Pressable
          onPress={onRefresh}
          style={[styles.refreshButton, { backgroundColor: theme.primary }]}
        >
          <Feather name="refresh-cw" size={16} color="#FFFFFF" />
          <ThemedText style={styles.refreshButtonText}>Refresh</ThemedText>
        </Pressable>
        
        {liveLocations.length > 0 ? (
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
                  <ThemedText style={[styles.locationItemTime, { color: theme.textDisabled }]}>
                    Updated: {new Date(loc.lastUpdated).toLocaleTimeString()}
                  </ThemedText>
                </View>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <ThemedText style={styles.liveText}>LIVE</ThemedText>
                </View>
              </View>
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
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
  },
  locationItemTime: {
    fontSize: 10,
    marginTop: 2
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
