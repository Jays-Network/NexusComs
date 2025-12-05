import { View, Switch, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { useAppSettings } from '@/contexts/SettingsContext';
import { Spacing, BorderRadius } from '@/constants/theme';
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

export default function SystemSettingsScreen() {
  const { theme } = useTheme();
  const { settings, updateSetting } = useAppSettings();

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

  return (
    <ScreenScrollView style={{ backgroundColor: theme.backgroundRoot }}>
      <View style={styles.container}>
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
              Some features like haptic feedback are only available on mobile devices.
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
