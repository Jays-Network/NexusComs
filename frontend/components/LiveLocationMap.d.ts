import { ForwardRefExoticComponent, RefAttributes } from 'react';

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

declare const LiveLocationMap: ForwardRefExoticComponent<LiveLocationMapProps & RefAttributes<LiveLocationMapRef>>;

export default LiveLocationMap;
