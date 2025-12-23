import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { OTAUpdateStatus } from '@/hooks/useOTAUpdate';
import { Spacing, BorderRadius } from '@/constants/theme';

interface OTAUpdateModalProps {
  visible: boolean;
  status: OTAUpdateStatus;
  message: string;
  onRefresh: () => void;
  onDismiss: () => void;
}

export function OTAUpdateModal({
  visible,
  status,
  message,
  onRefresh,
  onDismiss,
}: OTAUpdateModalProps) {
  const { theme, isDark } = useTheme();

  const isDownloading = status === 'downloading';
  const isReady = status === 'ready';

  const getIcon = () => {
    if (isDownloading) {
      return <ActivityIndicator size="large" color={theme.primary} />;
    }
    if (isReady) {
      return (
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
          <Feather name="download" size={32} color={theme.primary} />
        </View>
      );
    }
    return null;
  };

  const getTitle = () => {
    if (isDownloading) return 'Downloading Update';
    if (isReady) return 'Update Ready';
    return 'Update Available';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={isReady ? onDismiss : undefined}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.blurBackground} />
        ) : (
          <View style={[styles.androidBackground, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
        )}
        
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          {getIcon()}
          
          <Text style={[styles.title, { color: theme.text }]}>
            {getTitle()}
          </Text>
          
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {message}
          </Text>

          {isReady && (
            <View style={styles.buttonContainer}>
              <Pressable
                style={[styles.button, styles.secondaryButton, { borderColor: theme.border }]}
                onPress={onDismiss}
              >
                <Text style={[styles.buttonText, { color: theme.textSecondary }]}>
                  Later
                </Text>
              </Pressable>
              
              <Pressable
                style={[styles.button, styles.primaryButton, { backgroundColor: theme.primary }]}
                onPress={onRefresh}
              >
                <Feather name="refresh-cw" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                  Refresh Now
                </Text>
              </Pressable>
            </View>
          )}

          {isDownloading && (
            <Text style={[styles.subMessage, { color: theme.textSecondary }]}>
              Please wait...
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  androidBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  subMessage: {
    fontSize: 13,
    marginTop: Spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  primaryButton: {
    flex: 1.5,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonIcon: {
    marginRight: Spacing.xs,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
