import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Spacing, BorderRadius } from '@/constants/theme';
import { 
  initiateCall, 
  acceptCall, 
  rejectCall, 
  endCall, 
  addCallListener, 
  removeCallListener,
  isCallsSdkAvailable,
  startCallSession,
  endCallSession,
  CometChatCalls
} from '@/utils/cometChatClient';
import * as Haptics from 'expo-haptics';

type CallStatus = 'initiating' | 'ringing' | 'connected' | 'ended' | 'rejected' | 'cancelled' | 'incoming';

interface CallScreenParams {
  contactId: string;
  contactName: string;
  callType: 'audio' | 'video';
  isIncoming?: boolean;
  sessionId?: string;
  isGroupCall?: boolean;
}

export default function CallScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = route.params as CallScreenParams;

  const [callStatus, setCallStatus] = useState<CallStatus>(params.isIncoming ? 'incoming' : 'initiating');
  const [callDuration, setCallDuration] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(params.sessionId || null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(params.callType === 'audio');
  const [callSettings, setCallSettings] = useState<any>(null);
  const [callsSdkReady, setCallsSdkReady] = useState(isCallsSdkAvailable());

  useEffect(() => {
    const listenerId = 'call_screen_listener';

    addCallListener(listenerId, {
      onOutgoingCallAccepted: async (call: any) => {
        console.log('[CallScreen] Call accepted');
        setCallStatus('connected');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Start call session with Calls SDK if available
        if (isCallsSdkAvailable()) {
          try {
            const settings = await startCallSession(call, params.callType === 'audio');
            setCallSettings(settings);
            console.log('[CallScreen] Call session started');
          } catch (error) {
            console.error('[CallScreen] Failed to start call session:', error);
          }
        }
      },
      onOutgoingCallRejected: async (call: any) => {
        console.log('[CallScreen] Call rejected');
        if (isCallsSdkAvailable()) {
          await endCallSession();
        }
        setCallStatus('rejected');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => navigation.goBack(), 2000);
      },
      onIncomingCallCancelled: async (call: any) => {
        console.log('[CallScreen] Call cancelled');
        if (isCallsSdkAvailable()) {
          await endCallSession();
        }
        setCallStatus('cancelled');
        setTimeout(() => navigation.goBack(), 1500);
      },
      onCallEnded: async (call: any) => {
        console.log('[CallScreen] Call ended');
        if (isCallsSdkAvailable()) {
          await endCallSession();
        }
        setCallStatus('ended');
        setTimeout(() => navigation.goBack(), 1500);
      },
    });

    return () => {
      removeCallListener(listenerId);
      // Cleanup call session on unmount
      if (isCallsSdkAvailable()) {
        endCallSession().catch(console.error);
      }
    };
  }, [navigation]);

  useEffect(() => {
    if (!params.isIncoming && callStatus === 'initiating') {
      startCall();
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus]);

  const startCall = async () => {
    try {
      setCallStatus('ringing');
      const receiverType = params.isGroupCall ? 'group' : 'user';
      const call = await initiateCall(params.contactId, params.callType, receiverType);
      setSessionId(call.getSessionId());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error: any) {
      console.error('[CallScreen] Failed to initiate call:', error);
      Alert.alert('Call Failed', error.message || 'Could not connect the call. Please try again.');
      navigation.goBack();
    }
  };

  const handleAcceptCall = async () => {
    if (!sessionId) return;
    
    try {
      const acceptedCall = await acceptCall(sessionId);
      setCallStatus('connected');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Start call session with Calls SDK if available
      if (isCallsSdkAvailable() && acceptedCall) {
        try {
          const settings = await startCallSession(acceptedCall, params.callType === 'audio');
          setCallSettings(settings);
          console.log('[CallScreen] Call session started after accepting');
        } catch (sessionError) {
          console.error('[CallScreen] Failed to start call session:', sessionError);
        }
      }
    } catch (error: any) {
      console.error('[CallScreen] Failed to accept call:', error);
      Alert.alert('Error', 'Could not accept the call');
      navigation.goBack();
    }
  };

  const handleRejectCall = async () => {
    if (!sessionId) {
      navigation.goBack();
      return;
    }
    
    try {
      await rejectCall(sessionId, 'rejected');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error: any) {
      console.error('[CallScreen] Failed to reject call:', error);
    }
    navigation.goBack();
  };

  const handleEndCall = async () => {
    if (!sessionId) {
      navigation.goBack();
      return;
    }

    try {
      // End call session if active
      if (callSettings && isCallsSdkAvailable()) {
        await endCallSession();
      }
      
      if (callStatus === 'ringing' || callStatus === 'initiating') {
        await rejectCall(sessionId, 'cancelled');
      } else {
        await endCall(sessionId);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error: any) {
      console.error('[CallScreen] Failed to end call:', error);
    }
    navigation.goBack();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = (): string => {
    switch (callStatus) {
      case 'initiating':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'incoming':
        return `Incoming ${params.callType} call`;
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call ended';
      case 'rejected':
        return 'Call declined';
      case 'cancelled':
        return 'Call cancelled';
      default:
        return '';
    }
  };

  const renderIncomingCallButtons = () => (
    <View style={styles.incomingButtonsRow}>
      <Pressable
        style={[styles.callButton, styles.rejectButton]}
        onPress={handleRejectCall}
      >
        <Feather name="phone-off" size={32} color="#FFFFFF" />
      </Pressable>
      <Pressable
        style={[styles.callButton, styles.acceptButton]}
        onPress={handleAcceptCall}
      >
        <Feather name="phone" size={32} color="#FFFFFF" />
      </Pressable>
    </View>
  );

  const renderActiveCallControls = () => (
    <>
      <View style={styles.controlsRow}>
        <Pressable
          style={[
            styles.controlButton,
            { backgroundColor: isMuted ? theme.primary : theme.surface },
          ]}
          onPress={() => {
            setIsMuted(!isMuted);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Feather 
            name={isMuted ? "mic-off" : "mic"} 
            size={24} 
            color={isMuted ? "#FFFFFF" : theme.text} 
          />
          <Text style={[styles.controlLabel, { color: isMuted ? "#FFFFFF" : theme.textSecondary }]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.controlButton,
            { backgroundColor: isSpeakerOn ? theme.primary : theme.surface },
          ]}
          onPress={() => {
            setIsSpeakerOn(!isSpeakerOn);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Feather 
            name={isSpeakerOn ? "volume-2" : "volume-1"} 
            size={24} 
            color={isSpeakerOn ? "#FFFFFF" : theme.text} 
          />
          <Text style={[styles.controlLabel, { color: isSpeakerOn ? "#FFFFFF" : theme.textSecondary }]}>
            Speaker
          </Text>
        </Pressable>

        {params.callType === 'video' && (
          <Pressable
            style={[
              styles.controlButton,
              { backgroundColor: isVideoOff ? theme.primary : theme.surface },
            ]}
            onPress={() => {
              setIsVideoOff(!isVideoOff);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Feather 
              name={isVideoOff ? "video-off" : "video"} 
              size={24} 
              color={isVideoOff ? "#FFFFFF" : theme.text} 
            />
            <Text style={[styles.controlLabel, { color: isVideoOff ? "#FFFFFF" : theme.textSecondary }]}>
              {isVideoOff ? 'Camera Off' : 'Camera'}
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable
        style={[styles.callButton, styles.endButton]}
        onPress={handleEndCall}
      >
        <Feather name="phone-off" size={32} color="#FFFFFF" />
      </Pressable>
    </>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.callInfo}>
        <View style={[styles.avatarLarge, { backgroundColor: theme.primary }]}>
          <Text style={styles.avatarTextLarge}>
            {params.contactName.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <Text style={[styles.contactName, { color: theme.text }]}>
          {params.contactName}
        </Text>
        
        <View style={styles.statusRow}>
          {params.callType === 'video' && (
            <Feather name="video" size={18} color={theme.textSecondary} style={styles.callTypeIcon} />
          )}
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            {getStatusText()}
          </Text>
        </View>

        {params.callType === 'video' && callStatus === 'connected' && (
          <View style={[styles.videoPlaceholder, { backgroundColor: theme.surface }]}>
            {callsSdkReady && callSettings ? (
              <>
                <Feather name="video" size={48} color={theme.primary} />
                <Text style={[styles.videoPlaceholderText, { color: theme.text }]}>
                  Video call connected
                </Text>
                <Text style={[styles.videoPlaceholderSubtext, { color: theme.textSecondary }]}>
                  Audio streaming active
                </Text>
              </>
            ) : (
              <>
                <Feather name="video" size={48} color={theme.textSecondary} />
                <Text style={[styles.videoPlaceholderText, { color: theme.textSecondary }]}>
                  {callsSdkReady ? 'Initializing...' : 'Calls SDK loading...'}
                </Text>
                <Text style={[styles.videoPlaceholderSubtext, { color: theme.textSecondary }]}>
                  Requires EAS preview build
                </Text>
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.controlsContainer}>
        {callStatus === 'incoming' ? renderIncomingCallButtons() : renderActiveCallControls()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  callInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarTextLarge: {
    fontSize: 48,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactName: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  callTypeIcon: {
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: 16,
  },
  videoPlaceholder: {
    marginTop: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    width: 250,
  },
  videoPlaceholderText: {
    fontSize: 14,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  videoPlaceholderSubtext: {
    fontSize: 12,
    marginTop: Spacing.xs,
    textAlign: 'center',
    opacity: 0.7,
  },
  controlsContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 11,
    marginTop: Spacing.xs,
  },
  incomingButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing['3xl'],
  },
  callButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  endButton: {
    backgroundColor: '#FF3B30',
  },
});
