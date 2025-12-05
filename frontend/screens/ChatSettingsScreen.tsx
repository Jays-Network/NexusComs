import { View, Switch, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { useAppSettings } from '@/contexts/SettingsContext';
import { Spacing, BorderRadius } from '@/constants/theme';

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

export default function ChatSettingsScreen() {
  const { theme } = useTheme();
  const { settings, updateSetting } = useAppSettings();

  return (
    <ScreenScrollView style={{ backgroundColor: theme.backgroundRoot }}>
      <View style={styles.container}>
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Messages
          </ThemedText>
          <View style={[styles.settingsCard, { backgroundColor: theme.surface }]}>
            <SettingsToggle
              icon="eye"
              label="Message Preview"
              description="Show message content in notifications"
              value={settings.messagePreview}
              onToggle={(value) => updateSetting('messagePreview', value)}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsToggle
              icon="check-circle"
              label="Read Receipts"
              description="Let others know when you read messages"
              value={settings.readReceipts}
              onToggle={(value) => updateSetting('readReceipts', value)}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsToggle
              icon="edit-3"
              label="Typing Indicators"
              description="Show when you are typing"
              value={settings.typingIndicators}
              onToggle={(value) => updateSetting('typingIndicators', value)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Media
          </ThemedText>
          <View style={[styles.settingsCard, { backgroundColor: theme.surface }]}>
            <SettingsToggle
              icon="download"
              label="Auto-Download Media"
              description="Automatically download photos and files"
              value={settings.autoDownloadMedia}
              onToggle={(value) => updateSetting('autoDownloadMedia', value)}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsToggle
              icon="image"
              label="Save to Gallery"
              description="Save received media to device gallery"
              value={settings.saveToGallery}
              onToggle={(value) => updateSetting('saveToGallery', value)}
            />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Feather name="lock" size={16} color={theme.textSecondary} />
          <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
            Your messages are encrypted and stored securely. Changing these settings only affects how messages are displayed on your device.
          </ThemedText>
        </View>
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
  divider: {
    height: 1,
    marginLeft: Spacing.lg + 20 + Spacing.md,
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
