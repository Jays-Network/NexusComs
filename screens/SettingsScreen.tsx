import { useState } from 'react';
import { View, Pressable, Switch, StyleSheet, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/utils/auth';
import { disconnectSocket } from '@/utils/socket';
import { clearCache } from '@/utils/storage';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  async function handleLogout() {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              disconnectSocket();
              await clearCache();
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  }

  return (
    <ScreenScrollView style={{ backgroundColor: colors.backgroundRoot }}>
      <View style={styles.container}>
        {/* Profile Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Profile</ThemedText>
          
          <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.avatarText}>
                {user?.displayName?.[0]?.toUpperCase() || 'U'}
              </ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText style={styles.displayName}>{user?.displayName}</ThemedText>
              <ThemedText style={styles.username}>@{user?.username}</ThemedText>
              {user?.isAdmin ? (
                <View style={[styles.adminBadge, { backgroundColor: colors.primary }]}>
                  <ThemedText style={styles.adminBadgeText}>Admin</ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>
          
          <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="bell" size={20} color={colors.text} />
                <ThemedText style={styles.settingLabel}>Push Notifications</ThemedText>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.light.textDisabled, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="volume-2" size={20} color={colors.text} />
                <ThemedText style={styles.settingLabel}>Notification Sounds</ThemedText>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: Colors.light.textDisabled, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Location Section */}
        {user?.locationTrackingEnabled ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Location</ThemedText>
            
            <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Feather name="map-pin" size={20} color={colors.warning} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.settingLabel}>Location Sharing</ThemedText>
                    <ThemedText style={styles.settingDescription}>
                      Enabled by administrator
                    </ThemedText>
                  </View>
                </View>
                <Feather name="shield" size={20} color={colors.warning} />
              </View>
            </View>
          </View>
        ) : null}

        {/* About Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>About</ThemedText>
          
          <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
            <View style={styles.settingRow}>
              <ThemedText style={styles.settingLabel}>Version</ThemedText>
              <ThemedText style={styles.settingValue}>
                {Constants.expoConfig?.version || '1.0.0'}
              </ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.settingRow}>
              <ThemedText style={styles.settingLabel}>Platform</ThemedText>
              <ThemedText style={styles.settingValue}>
                {Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          style={[styles.logoutButton, { backgroundColor: colors.emergency }]}
        >
          <Feather name="log-out" size={20} color="#FFFFFF" />
          <ThemedText style={styles.logoutButtonText}>Log Out</ThemedText>
        </Pressable>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    gap: Spacing['2xl']
  },
  section: {
    gap: Spacing.md
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.6,
    letterSpacing: 0.5
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.lg
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  profileInfo: {
    flex: 1,
    gap: Spacing.xs
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600'
  },
  username: {
    fontSize: 15,
    opacity: 0.6
  },
  adminBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.xs
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  settingCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden'
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    minHeight: 60
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500'
  },
  settingDescription: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2
  },
  settingValue: {
    fontSize: 15,
    opacity: 0.6
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.xl
  },
  logoutButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});
