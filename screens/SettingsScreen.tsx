import { View, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useCometChatAuth } from '@/utils/cometChatAuth';
import type { SettingsStackParamList } from '@/navigation/SettingsStackNavigator';

type NavigationProp = NativeStackNavigationProp<SettingsStackParamList>;

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
  isDestructive?: boolean;
  showChevron?: boolean;
}

function SettingsItem({ icon, label, description, onPress, isDestructive = false, showChevron = true }: SettingsItemProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingItem,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.settingItemLeft}>
        <Feather 
          name={icon} 
          size={20} 
          color={isDestructive ? theme.emergency : theme.textSecondary} 
        />
        <View style={styles.settingTextContainer}>
          <ThemedText 
            style={[
              styles.settingItemLabel, 
              isDestructive && { color: theme.emergency }
            ]}
          >
            {label}
          </ThemedText>
          {description ? (
            <ThemedText style={[styles.settingDescription, { color: theme.textSecondary }]}>
              {description}
            </ThemedText>
          ) : null}
        </View>
      </View>
      {showChevron ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { user, logout } = useCometChatAuth();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  async function performLogout() {
    console.log('[Settings] Performing logout...');
    try {
      await logout();
      console.log('[Settings] Logout successful');
    } catch (error) {
      console.error('[Settings] Logout error:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to log out. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to log out. Please try again.');
      }
    }
  }

  function handleLogout() {
    console.log('[Settings] Logout button pressed, platform:', Platform.OS);
    
    if (Platform.OS === 'web') {
      // Use native browser confirm on web
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (confirmed) {
        performLogout();
      }
    } else {
      // Use React Native Alert on mobile
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Out',
            style: 'destructive',
            onPress: performLogout
          }
        ]
      );
    }
  }

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
      {/* Custom Header with Back Button */}
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
        <Pressable 
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScreenScrollView style={{ backgroundColor: theme.backgroundRoot }}>
        <View style={styles.container}>
          {/* Profile Section at Top */}
          <Pressable 
            onPress={() => navigation.navigate('Profile')}
            style={({ pressed }) => [
              styles.profileSection,
              { backgroundColor: theme.surface },
              pressed && { opacity: 0.8 }
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.avatarText}>
                {user?.name?.[0]?.toUpperCase() || user?.id?.[0]?.toUpperCase() || 'U'}
              </ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText style={styles.profileName}>{user?.name || 'User'}</ThemedText>
              <ThemedText style={[styles.profileStatus, { color: theme.textSecondary }]}>
                Available
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>

          {/* Account Section */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account</ThemedText>
            
            <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
              <SettingsItem
                icon="bell"
                label="Notifications"
                description="Message notifications"
                onPress={() => navigation.navigate('Notifications')}
              />
            </View>
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Support</ThemedText>
            
            <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
              <SettingsItem
                icon="info"
                label="About"
                description="App info and legal"
                onPress={() => navigation.navigate('About')}
              />
            </View>
          </View>

          {/* Logout Section */}
          <View style={styles.section}>
            <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
              <SettingsItem
                icon="log-out"
                label="Log Out"
                onPress={handleLogout}
                isDestructive
                showChevron={false}
              />
            </View>
          </View>
        </View>
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileStatus: {
    fontSize: 14,
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
  settingCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    minHeight: 64,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
    gap: 2,
  },
  settingItemLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
});
