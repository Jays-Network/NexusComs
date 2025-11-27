import { View, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { AppHeader } from '@/components/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useStreamAuth } from '@/utils/streamAuth';
import type { SettingsStackParamList } from '@/navigation/SettingsStackNavigator';

type NavigationProp = NativeStackNavigationProp<SettingsStackParamList>;

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
  showChevron?: boolean;
}

function SettingsItem({ icon, label, onPress, isDestructive = false, showChevron = true }: SettingsItemProps) {
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
          color={isDestructive ? theme.emergency : theme.text} 
        />
        <ThemedText 
          style={[
            styles.settingItemLabel, 
            isDestructive && { color: theme.emergency }
          ]}
        >
          {label}
        </ThemedText>
      </View>
      {showChevron ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { logout } = useStreamAuth();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  function handleLogout() {
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
    <View style={[styles.screenContainer, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
      <AppHeader />
      <ScreenScrollView style={{ backgroundColor: theme.backgroundRoot }}>
        <View style={styles.container}>
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account</ThemedText>
            
            <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
              <SettingsItem
                icon="user"
                label="Profile"
                onPress={() => navigation.navigate('Profile')}
              />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <SettingsItem
                icon="bell"
                label="Notifications"
                onPress={() => navigation.navigate('Notifications')}
              />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Support</ThemedText>
            
            <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
              <SettingsItem
                icon="info"
                label="About"
                onPress={() => navigation.navigate('About')}
              />
            </View>
          </View>

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
  container: {
    padding: Spacing.lg,
    gap: Spacing['2xl'],
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
    minHeight: 56,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingItemLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
});
