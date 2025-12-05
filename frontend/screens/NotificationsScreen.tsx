import { useState } from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [emergencyAlertsEnabled, setEmergencyAlertsEnabled] = useState(true);

  return (
    <ScreenScrollView style={{ backgroundColor: theme.backgroundRoot }}>
      <View style={styles.container}>
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>General</ThemedText>
          
          <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="bell" size={20} color={theme.text} />
                <View style={styles.settingTextContainer}>
                  <ThemedText style={styles.settingLabel}>Push Notifications</ThemedText>
                  <ThemedText style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Receive notifications for new messages
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.light.textDisabled, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="volume-2" size={20} color={theme.text} />
                <View style={styles.settingTextContainer}>
                  <ThemedText style={styles.settingLabel}>Notification Sounds</ThemedText>
                  <ThemedText style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Play sound when receiving notifications
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: Colors.light.textDisabled, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="smartphone" size={20} color={theme.text} />
                <View style={styles.settingTextContainer}>
                  <ThemedText style={styles.settingLabel}>Vibration</ThemedText>
                  <ThemedText style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Vibrate when receiving notifications
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={setVibrationEnabled}
                trackColor={{ false: Colors.light.textDisabled, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Emergency Alerts</ThemedText>
          
          <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="alert-triangle" size={20} color={theme.emergency} />
                <View style={styles.settingTextContainer}>
                  <ThemedText style={styles.settingLabel}>Emergency Alerts</ThemedText>
                  <ThemedText style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Always receive emergency alerts with full audio
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={emergencyAlertsEnabled}
                onValueChange={setEmergencyAlertsEnabled}
                trackColor={{ false: Colors.light.textDisabled, true: theme.emergency }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    minHeight: 72,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginRight: Spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
});
