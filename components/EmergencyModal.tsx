import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useStreamAuth } from '@/utils/streamAuth';
import type { Event, MessageResponse } from 'stream-chat';

const { width } = Dimensions.get('window');

// Import emergency sound at module level for Metro bundling
const emergencySound = require('../assets/sounds/emergency.wav');

export default function EmergencyModal() {
  const [visible, setVisible] = useState(false);
  const [alert, setAlert] = useState<MessageResponse | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const soundRef = useRef<Audio.Sound | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { theme } = useTheme();
  const { chatClient, user } = useStreamAuth();

  // Configure audio mode to play even in silent mode on iOS
  useEffect(() => {
    const configureAudio = async () => {
      if (Platform.OS !== 'web') {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
          });
        } catch (error) {
          console.warn('Failed to configure audio mode:', error);
        }
      }
    };
    configureAudio();
  }, []);

  // Cleanup sound, animation, and timeout on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (animationRef.current) {
        animationRef.current.stop();
      }
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!chatClient) return;

    // Listen for emergency messages across all channels
    const handleNewMessage = (event: Event) => {
      const message = event.message;
      
      // Check if this is an emergency message (using custom field) and not from current user
      if (message && (message as any)?.emergency === true && message.user?.id !== user?.id) {
        handleEmergencyAlert(message);
      }
    };

    chatClient.on('message.new', handleNewMessage);

    return () => {
      chatClient.off('message.new', handleNewMessage);
    };
  }, [chatClient, user]);

  useEffect(() => {
    if (visible) {
      startPulseAnimation();
    }
  }, [visible]);

  function handleEmergencyAlert(message: MessageResponse) {
    // Clear any pending dismissal timeout to prevent it from clearing this new alert
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }

    setAlert(message);
    setVisible(true);
    
    // Always trigger haptics and sound, even if modal is already visible
    // This ensures every emergency message produces feedback
    triggerHaptics();
    playEmergencySound();
  }

  function startPulseAnimation() {
    // Stop existing animation if any
    if (animationRef.current) {
      animationRef.current.stop();
    }

    // Create and start new animation
    animationRef.current = Animated.loop(
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
    );
    animationRef.current.start();
  }

  async function triggerHaptics() {
    if (Platform.OS === 'web') return;
    
    try {
      // Trigger heavy impact haptic feedback 3 times
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
    } catch (error) {
      console.warn('Haptics not available:', error);
    }
  }

  async function playEmergencySound() {
    if (Platform.OS === 'web') return;
    
    try {
      // Stop and unload any existing sound
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Play emergency sound file using expo-av
      // Note: emergency.wav file should be placed in assets/sounds/
      const { sound } = await Audio.Sound.createAsync(
        emergencySound,
        { shouldPlay: true, volume: 1.0 }
      );
      
      soundRef.current = sound;
      
      // Clean up sound after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().then(() => {
            if (soundRef.current === sound) {
              soundRef.current = null;
            }
          });
        }
      });
    } catch (error) {
      // If emergency.wav is missing, log warning but don't crash
      console.warn('Emergency sound file not found. Please add emergency.wav to assets/sounds/', error);
    }
  }

  async function handleAcknowledge() {
    // Stop animation
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    // Stop any playing sound
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (error) {
        console.warn('Failed to stop sound:', error);
      }
    }
    
    // Hide modal first
    setVisible(false);
    
    // Clear any existing dismissal timeout
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
    
    // Clear alert after modal dismissal animation completes (300ms for fade)
    dismissTimeoutRef.current = setTimeout(() => {
      setAlert(null);
      dismissTimeoutRef.current = null;
    }, 300);
  }

  if (!alert) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {}} // Prevent dismissing without acknowledgment
    >
      <View style={[styles.container, { backgroundColor: theme.emergency }]}>
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
            <ThemedText style={styles.message}>{alert.text || 'Emergency!'}</ThemedText>
          </View>

          {alert.user && (
            <ThemedText style={styles.sender}>
              From: {alert.user.name || alert.user.id}
            </ThemedText>
          )}

          <ThemedText style={styles.timestamp}>
            {alert.created_at ? new Date(alert.created_at).toLocaleString() : ''}
          </ThemedText>

          <Pressable
            onPress={handleAcknowledge}
            style={[styles.acknowledgeButton, { backgroundColor: '#FFFFFF' }]}
          >
            <ThemedText style={[styles.acknowledgeButtonText, { color: theme.emergency }]}>
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
  sender: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
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
