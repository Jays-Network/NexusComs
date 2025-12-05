import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { useThemeMode, ThemeMode } from '@/contexts/ThemeContext';
import { Spacing, BorderRadius } from '@/constants/theme';

interface ThemeOptionProps {
  mode: ThemeMode;
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  isSelected: boolean;
  onSelect: () => void;
}

function ThemeOption({ mode, label, description, icon, isSelected, onSelect }: ThemeOptionProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.optionItem,
        { backgroundColor: theme.surface },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name={icon} size={20} color={theme.primary} />
        </View>
        <View style={styles.optionTextContainer}>
          <ThemedText style={styles.optionLabel}>{label}</ThemedText>
          <ThemedText style={[styles.optionDescription, { color: theme.textSecondary }]}>
            {description}
          </ThemedText>
        </View>
      </View>
      <View style={[
        styles.radioOuter,
        { borderColor: isSelected ? theme.primary : theme.border }
      ]}>
        {isSelected ? (
          <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function AppearanceScreen() {
  const { theme, isDark } = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();

  const themeOptions: { mode: ThemeMode; label: string; description: string; icon: keyof typeof Feather.glyphMap }[] = [
    {
      mode: 'system',
      label: 'System',
      description: 'Match device settings',
      icon: 'smartphone',
    },
    {
      mode: 'light',
      label: 'Light',
      description: 'Always use light theme',
      icon: 'sun',
    },
    {
      mode: 'dark',
      label: 'Dark',
      description: 'Always use dark theme',
      icon: 'moon',
    },
  ];

  return (
    <ScreenScrollView style={{ backgroundColor: theme.backgroundRoot }}>
      <View style={styles.container}>
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Theme
          </ThemedText>
          <View style={[styles.optionsCard, { backgroundColor: theme.surface }]}>
            {themeOptions.map((option, index) => (
              <View key={option.mode}>
                <ThemeOption
                  mode={option.mode}
                  label={option.label}
                  description={option.description}
                  icon={option.icon}
                  isSelected={themeMode === option.mode}
                  onSelect={() => setThemeMode(option.mode)}
                />
                {index < themeOptions.length - 1 ? (
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Preview
          </ThemedText>
          <View style={[styles.previewCard, { backgroundColor: theme.surface }]}>
            <View style={styles.previewHeader}>
              <ThemedText style={styles.previewTitle}>
                Current Theme: {isDark ? 'Dark' : 'Light'}
              </ThemedText>
            </View>
            <View style={[styles.previewContent, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={[styles.previewBubble, { backgroundColor: theme.primary }]}>
                <ThemedText style={{ color: '#000' }}>Sample message</ThemedText>
              </View>
              <View style={[styles.previewBubbleReply, { backgroundColor: theme.surface }]}>
                <ThemedText>Reply message</ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Feather name="info" size={16} color={theme.textSecondary} />
          <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
            When set to System, the app will automatically switch between light and dark themes based on your device settings.
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
  optionsCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    minHeight: 72,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 13,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg + 40 + Spacing.md,
  },
  previewCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  previewHeader: {
    padding: Spacing.lg,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  previewBubble: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    maxWidth: '70%',
  },
  previewBubbleReply: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    maxWidth: '70%',
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
