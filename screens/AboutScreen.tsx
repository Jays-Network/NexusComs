import { View, StyleSheet, Platform, Image, Linking, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

export default function AboutScreen() {
  const { theme } = useTheme();

  return (
    <ScreenScrollView style={{ backgroundColor: theme.backgroundRoot }}>
      <View style={styles.container}>
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/world-risk-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText style={styles.appName}>World Risk</ThemedText>
          <ThemedText style={[styles.tagline, { color: theme.textSecondary }]}>
            Secure Communications Platform
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>App Information</ThemedText>
          
          <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Feather name="tag" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.labelText, { color: theme.textSecondary }]}>Version</ThemedText>
              </View>
              <ThemedText style={styles.infoValue}>
                {Constants.expoConfig?.version || '1.0.0'}
              </ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Feather name="smartphone" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.labelText, { color: theme.textSecondary }]}>Platform</ThemedText>
              </View>
              <ThemedText style={styles.infoValue}>
                {Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}
              </ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Feather name="code" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.labelText, { color: theme.textSecondary }]}>Build</ThemedText>
              </View>
              <ThemedText style={styles.infoValue}>
                {Constants.expoConfig?.extra?.buildNumber || 'Development'}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Technology</ThemedText>
          
          <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Feather name="message-circle" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.labelText, { color: theme.textSecondary }]}>Chat</ThemedText>
              </View>
              <ThemedText style={styles.infoValue}>CometChat</ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Feather name="video" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.labelText, { color: theme.textSecondary }]}>Video</ThemedText>
              </View>
              <ThemedText style={styles.infoValue}>CometChat Calling SDK</ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Feather name="database" size={18} color={theme.textSecondary} />
                <ThemedText style={[styles.labelText, { color: theme.textSecondary }]}>Database</ThemedText>
              </View>
              <ThemedText style={styles.infoValue}>Supabase</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>Legal</ThemedText>
          
          <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
            <Pressable style={styles.linkRow}>
              <View style={styles.infoLabel}>
                <Feather name="file-text" size={18} color={theme.textSecondary} />
                <ThemedText style={styles.linkText}>Terms of Service</ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Pressable style={styles.linkRow}>
              <View style={styles.infoLabel}>
                <Feather name="shield" size={18} color={theme.textSecondary} />
                <ThemedText style={styles.linkText}>Privacy Policy</ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>

        <ThemedText style={[styles.copyright, { color: theme.textSecondary }]}>
          World Risk Global. All rights reserved.
        </ThemedText>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    gap: Spacing['2xl'],
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  logo: {
    width: 120,
    height: 80,
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 14,
    marginTop: Spacing.xs,
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
  linkRow: {
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
  linkText: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  copyright: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
