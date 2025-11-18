import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/utils/auth';
import { getSocket, decryptMessage } from '@/utils/socket';

const { width } = Dimensions.get('window');

interface EmergencyAlert {
  id: string;
  subgroupId: string;
  senderId: string;
  encryptedContent: string;
  createdAt: string;
}

export default function EmergencyModal() {
  const [visible, setVisible] = useState(false);
  const [alert, setAlert] = useState<EmergencyAlert | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const { colors } = useTheme();
  const { token, user } = useAuth();

  useEffect(() => {
    const socket = getSocket();

    socket.on('emergency_alert', handleEmergencyAlert);

    // Check for unacknowledged alerts on mount
    checkUnacknowledgedAlerts();

    return () => {
      socket.off('emergency_alert', handleEmergencyAlert);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      startPulseAnimation();
      triggerHaptics();
      playEmergencySound();
    }
  }, [visible]);

  async function checkUnacknowledgedAlerts() {
    try {
      // Check if there are any unacknowledged emergency messages
      // This would require an API endpoint to fetch unacknowledged alerts
      // For now, we'll skip this implementation
    } catch (error) {
      console.error('Check unacknowledged alerts error:', error);
    }
  }

  function handleEmergencyAlert(data: EmergencyAlert) {
    setAlert(data);
    setVisible(true);
  }

  function startPulseAnimation() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        })
      ])
    ).start();
  }

  async function triggerHaptics() {
    try {
      // Trigger heavy impact haptic feedback 3 times
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
    } catch (error) {
      console.error('Haptics error:', error);
    }
  }

  async function playEmergencySound() {
    try {
      // Note: In a real app, you would have an emergency.wav file in assets/sounds/
      // For now, we'll use the default notification sound
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/emergency.wav')
      );
      await sound.playAsync();
    } catch (error) {
      // If custom sound fails, use system notification sound
      console.error('Emergency sound error:', error);
    }
  }

  async function handleAcknowledge() {
    if (!alert) return;

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/emergency/${alert.id}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setVisible(false);
        setAlert(null);
      }
    } catch (error) {
      console.error('Acknowledge error:', error);
    }
  }

  if (!alert) return null;

  const decryptedContent = decryptMessage(alert.encryptedContent);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {}} // Prevent dismissing without acknowledgment
    >
      <View style={[styles.container, { backgroundColor: colors.emergency }]}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: pulseAnim }]
              }
            ]}
          >
            <Feather name="alert-octagon" size={80} color="#FFFFFF" />
          </Animated.View>

          <ThemedText style={styles.title}>EMERGENCY ALERT</ThemedText>

          <View style={styles.messageContainer}>
            <ThemedText style={styles.message}>{decryptedContent}</ThemedText>
          </View>

          <ThemedText style={styles.timestamp}>
            {new Date(alert.createdAt).toLocaleString()}
          </ThemedText>

          <Pressable
            onPress={handleAcknowledge}
            style={[styles.acknowledgeButton, { backgroundColor: '#FFFFFF' }]}
          >
            <ThemedText style={[styles.acknowledgeButtonText, { color: colors.emergency }]}>
              ACKNOWLEDGE
            </ThemedText>
          </Pressable>

          <ThemedText style={styles.warningText}>
            This alert must be acknowledged to continue
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl']
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: Spacing.xl
  },
  iconContainer: {
    marginBottom: Spacing.xl
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1
  },
  messageContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  message: {
    fontSize: 18,
    lineHeight: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500'
  },
  timestamp: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)'
  },
  acknowledgeButton: {
    width: '100%',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.xl
  },
  acknowledgeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1
  },
  warningText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: Spacing.md
  }
});
