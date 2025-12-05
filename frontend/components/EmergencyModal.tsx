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
import { useCometChatAuth } from '@/utils/cometChatAuth';
import { addMessageListener, removeMessageListener } from '@/utils/cometChatClient';

const { width } = Dimensions.get('window');

const emergencySound = require('../assets/sounds/emergency.wav');

interface EmergencyMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: string;
}

export default function EmergencyModal() {
  const [visible, setVisible] = useState(false);
  const [alert, setAlert] = useState<EmergencyMessage | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const soundRef = useRef<Audio.Sound | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { theme } = useTheme();
  const { user, cometChatUser, isInitialized } = useCometChatAuth();
  const listenerIdRef = useRef<string>(`emergency_modal_${Date.now()}`);

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
    if (!isInitialized || !cometChatUser) return;

    const handleNewMessage = (message: any) => {
      const metadata = message.getMetadata?.() || message.metadata || {};
      const senderId = message.getSender?.()?.getUid?.() || message.sender?.uid;
      
      if (metadata.emergency === true && senderId !== user?.id) {
        handleEmergencyAlert({
          id: message.getId?.() || message.id || String(Date.now()),
          text: message.getText?.() || message.text || 'Emergency!',
          senderId: senderId,
          senderName: message.getSender?.()?.getName?.() || message.sender?.name || 'Unknown',
          createdAt: new Date((message.getSentAt?.() || message.sentAt || Date.now()) * 1000).toISOString(),
        });
      }
    };

    addMessageListener(listenerIdRef.current, handleNewMessage);

    return () => {
      removeMessageListener(listenerIdRef.current);
    };
  }, [isInitialized, cometChatUser, user]);

  useEffect(() => {
    if (visible) {
      startPulseAnimation();
    }
  }, [visible]);

  function handleEmergencyAlert(message: EmergencyMessage) {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }

    setAlert(message);
    setVisible(true);
    
    triggerHaptics();
    playEmergencySound();
  }

  function startPulseAnimation() {
    if (animationRef.current) {
      animationRef.current.stop();
    }

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
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        emergencySound,
        { shouldPlay: true, volume: 1.0 }
      );
      
      soundRef.current = sound;
      
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
      console.warn('Emergency sound file not found. Please add emergency.wav to assets/sounds/', error);
    }
  }

  async function handleAcknowledge() {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (error) {
        console.warn('Failed to stop sound:', error);
      }
    }
    
    setVisible(false);
    
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
    
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
      onRequestClose={() => {}}
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
            <ThemedText style={styles.message}>{alert.text}</ThemedText>
          </View>

          <ThemedText style={styles.sender}>
            From: {alert.senderName}
          </ThemedText>

          <ThemedText style={styles.timestamp}>
            {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}
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
