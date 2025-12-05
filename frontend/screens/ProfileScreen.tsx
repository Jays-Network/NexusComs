import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useCometChatAuth } from '@/utils/cometChatAuth';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user } = useCometChatAuth();

  return (
    <ScreenScrollView style={{ backgroundColor: theme.backgroundRoot }}>
      <View style={styles.container}>
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() || user?.id?.[0]?.toUpperCase() || 'U'}
            </ThemedText>
          </View>
          <ThemedText style={styles.displayName}>{user?.name || 'User'}</ThemedText>
          <ThemedText style={[styles.username, { color: theme.textSecondary }]}>@{user?.id}</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account Information</ThemedText>
          
          <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Feather name="user" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.labelText, { color: theme.textSecondary }]}>Display Name</ThemedText>
              </View>
              <ThemedText style={styles.infoValue}>{user?.name || 'Not set'}</ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Feather name="at-sign" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.labelText, { color: theme.textSecondary }]}>Username</ThemedText>
              </View>
              <ThemedText style={styles.infoValue}>{user?.id || 'Not set'}</ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Feather name="shield" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.labelText, { color: theme.textSecondary }]}>Account Status</ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.statusText}>Active</ThemedText>
              </View>
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  username: {
    fontSize: 16,
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
  infoCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    minHeight: 56,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  labelText: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
