import { useState, useCallback } from 'react';
import { View, Switch, StyleSheet, Platform, Pressable, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Contacts from 'expo-contacts';
import { Audio } from 'expo-av';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { useAppSettings } from '@/contexts/SettingsContext';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface SettingsToggleProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}

function SettingsToggle({ icon, label, description, value, onToggle }: SettingsToggleProps) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.toggleItem}>
      <View style={styles.toggleLeft}>
        <Feather name={icon} size={20} color={theme.textSecondary} />
        <View style={styles.toggleTextContainer}>
          <ThemedText style={styles.toggleLabel}>{label}</ThemedText>
          <ThemedText style={[styles.toggleDescription, { color: theme.textSecondary }]}>
            {description}
          </ThemedText>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

interface PermissionStatus {
  camera: 'granted' | 'denied' | 'undetermined';
  location: 'granted' | 'denied' | 'undetermined';
  notifications: 'granted' | 'denied' | 'undetermined';
  contacts: 'granted' | 'denied' | 'undetermined';
  microphone: 'granted' | 'denied' | 'undetermined';
}

interface PermissionItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description: string;
  status: 'granted' | 'denied' | 'undetermined';
  onRequest: () => void;
}

function PermissionItem({ icon, label, description, status, onRequest }: PermissionItemProps) {
  const { theme } = useTheme();
  
  const getStatusColor = () => {
    switch (status) {
      case 'granted': return Colors.light.success;
      case 'denied': return Colors.light.emergency;
      default: return theme.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'granted': return 'Enabled';
      case 'denied': return 'Denied';
      default: return 'Not Set';
    }
  };

  const getStatusIcon = (): keyof typeof Feather.glyphMap => {
    switch (status) {
      case 'granted': return 'check-circle';
      case 'denied': return 'x-circle';
      default: return 'alert-circle';
    }
  };
  
  return (
    <Pressable
      onPress={status !== 'granted' ? onRequest : undefined}
      style={({ pressed }) => [
        styles.permissionItem,
        pressed && status !== 'granted' && { opacity: 0.7 }
      ]}
    >
      <View style={styles.toggleLeft}>
        <Feather name={icon} size={20} color={theme.textSecondary} />
        <View style={styles.toggleTextContainer}>
          <ThemedText style={styles.toggleLabel}>{label}</ThemedText>
          <ThemedText style={[styles.toggleDescription, { color: theme.textSecondary }]}>
            {description}
          </ThemedText>
        </View>
      </View>
      <View style={styles.permissionStatus}>
        <ThemedText style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </ThemedText>
        <Feather name={getStatusIcon()} size={18} color={getStatusColor()} />
      </View>
    </Pressable>
  );
}

export default function SystemSettingsScreen() {
  const { theme } = useTheme();
  const { settings, updateSetting } = useAppSettings();
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: 'undetermined',
    location: 'undetermined',
    notifications: 'undetermined',
    contacts: 'undetermined',
    microphone: 'undetermined',
  });

  const checkPermissions = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermissions({
        camera: 'undetermined',
        location: 'undetermined',
        notifications: 'undetermined',
        contacts: 'undetermined',
        microphone: 'undetermined',
      });
      return;
    }

    try {
      const [locationStatus, notificationStatus, contactsStatus, audioStatus] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Notifications.getPermissionsAsync(),
        Contacts.getPermissionsAsync(),
        Audio.getPermissionsAsync(),
      ]);

      const cameraStatus = cameraPermission?.granted 
        ? 'granted' 
        : (cameraPermission?.canAskAgain ?? true) ? 'undetermined' : 'denied';

      setPermissions({
        camera: cameraStatus as 'granted' | 'denied' | 'undetermined',
        location: locationStatus.granted ? 'granted' : locationStatus.canAskAgain ? 'undetermined' : 'denied',
        notifications: notificationStatus.granted ? 'granted' : notificationStatus.canAskAgain ? 'undetermined' : 'denied',
        contacts: contactsStatus.granted ? 'granted' : contactsStatus.canAskAgain ? 'undetermined' : 'denied',
        microphone: audioStatus.granted ? 'granted' : audioStatus.canAskAgain ? 'undetermined' : 'denied',
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  }, [cameraPermission]);

  useFocusEffect(
    useCallback(() => {
      checkPermissions();
    }, [checkPermissions])
  );

  const requestPermission = async (type: keyof PermissionStatus) => {
    if (Platform.OS === 'web') return;

    try {
      let result;
      switch (type) {
        case 'camera':
          result = await requestCameraPermission();
          break;
        case 'location':
          result = await Location.requestForegroundPermissionsAsync();
          break;
        case 'notifications':
          result = await Notifications.requestPermissionsAsync();
          break;
        case 'contacts':
          result = await Contacts.requestPermissionsAsync();
          break;
        case 'microphone':
          result = await Audio.requestPermissionsAsync();
          break;
      }

      if (result && !result.granted && !result.canAskAgain) {
        try {
          await Linking.openSettings();
        } catch (e) {
          console.log('Could not open settings');
        }
      }

      checkPermissions();
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error);
    }
  };

  const handleHapticToggle = async (value: boolean) => {
    if (value && Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        console.log('Haptics not available');
      }
    }
    updateSetting('hapticFeedback', value);
  };

  const allPermissionsGranted = Object.values(permissions).every(status => status === 'granted');
  const hasAnyDenied = Object.values(permissions).some(status => status === 'denied');

  return (
    <ScreenScrollView style={{ backgroundColor: theme.backgroundRoot }}>
      <View style={styles.container}>
        {Platform.OS !== 'web' && !allPermissionsGranted ? (
          <View style={[styles.warningBanner, { backgroundColor: hasAnyDenied ? Colors.light.emergencyLight : '#FEF3C7' }]}>
            <Feather 
              name={hasAnyDenied ? "alert-triangle" : "info"} 
              size={20} 
              color={hasAnyDenied ? Colors.light.emergency : '#B45309'} 
            />
            <ThemedText style={[styles.warningText, { color: hasAnyDenied ? Colors.light.emergency : '#92400E' }]}>
              {hasAnyDenied 
                ? 'Some permissions are denied. The app may not function correctly without all required permissions.'
                : 'Some permissions have not been set. Please enable all permissions for the best experience.'
              }
            </ThemedText>
          </View>
        ) : null}

        {Platform.OS !== 'web' ? (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Permissions
            </ThemedText>
            <View style={[styles.settingsCard, { backgroundColor: theme.surface }]}>
              <PermissionItem
                icon="camera"
                label="Camera"
                description="Take photos and videos for sharing"
                status={permissions.camera}
                onRequest={() => requestPermission('camera')}
              />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <PermissionItem
                icon="map-pin"
                label="Location"
                description="Share your location with team members"
                status={permissions.location}
                onRequest={() => requestPermission('location')}
              />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <PermissionItem
                icon="bell"
                label="Notifications"
                description="Receive alerts and message notifications"
                status={permissions.notifications}
                onRequest={() => requestPermission('notifications')}
              />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <PermissionItem
                icon="book"
                label="Contacts"
                description="Access contacts to share with team"
                status={permissions.contacts}
                onRequest={() => requestPermission('contacts')}
              />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <PermissionItem
                icon="mic"
                label="Microphone"
                description="Record voice messages and calls"
                status={permissions.microphone}
                onRequest={() => requestPermission('microphone')}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Feedback
          </ThemedText>
          <View style={[styles.settingsCard, { backgroundColor: theme.surface }]}>
            <SettingsToggle
              icon="smartphone"
              label="Haptic Feedback"
              description="Vibrate when interacting with buttons"
              value={settings.hapticFeedback}
              onToggle={handleHapticToggle}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsToggle
              icon="volume-2"
              label="Sound Effects"
              description="Play sounds for actions and alerts"
              value={settings.soundEffects}
              onToggle={(value) => updateSetting('soundEffects', value)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Device Info
          </ThemedText>
          <View style={[styles.settingsCard, { backgroundColor: theme.surface }]}>
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Platform</ThemedText>
              <ThemedText style={[styles.infoValue, { color: theme.textSecondary }]}>
                {Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}
              </ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>App Version</ThemedText>
              <ThemedText style={[styles.infoValue, { color: theme.textSecondary }]}>
                1.0.0
              </ThemedText>
            </View>
          </View>
        </View>

        {Platform.OS === 'web' ? (
          <View style={styles.infoSection}>
            <Feather name="info" size={16} color={theme.textSecondary} />
            <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
              Permission management is only available on mobile devices. Please use the mobile app to configure permissions.
            </ThemedText>
          </View>
        ) : null}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    minHeight: 72,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleTextContainer: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleDescription: {
    fontSize: 13,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    minHeight: 72,
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    minHeight: 56,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
