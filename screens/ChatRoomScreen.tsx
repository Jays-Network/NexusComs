import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Pressable, Text, Platform } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Channel, MessageList, MessageInput } from 'stream-chat-expo';
import { Channel as StreamChannel } from 'stream-chat';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useStreamAuth } from '@/utils/streamAuth';
import { ChatsStackParamList } from '@/navigation/ChatsStackNavigator';
import { Spacing } from '@/constants/theme';

type RouteProps = RouteProp<ChatsStackParamList, 'ChatRoom'>;

export default function ChatRoomScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { channelId, channelName } = route.params;
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const { chatClient, user } = useStreamAuth();

  useEffect(() => {
    if (!chatClient || !channelId) {
      console.log('[ChatRoom] Missing chatClient or channelId', { chatClient: !!chatClient, channelId });
      setError('Chat client not initialized');
      setIsLoading(false);
      return;
    }

    if (!user?.id) {
      console.log('[ChatRoom] Missing user id');
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    const initChannel = async () => {
      try {
        // Determine channel type based on channelId prefix
        // Group channels (group-{id}) use 'team' type
        // Direct messages use 'messaging' type
        const isGroupChannel = channelId.startsWith('group-');
        const channelType = isGroupChannel ? 'team' : 'messaging';
        
        console.log(`[ChatRoom] Loading ${channelType} channel: ${channelId}`);
        console.log(`[ChatRoom] User ID (Stream ID): ${user.id}`);
        
        // Create channel with current user as creator/member
        // Note: user.id is the sanitized Stream user ID (e.g., "replit_replit_com")
        const channelData: Record<string, any> = {
          name: channelName || 'Chat',
          members: [user.id],
          created_by_id: user.id,
        };
        
        console.log('[ChatRoom] Creating/getting channel with data:', channelData);
        
        // Get or create the channel with appropriate type
        const channelInstance = chatClient.channel(channelType, channelId, channelData);
        
        console.log('[ChatRoom] Channel instance created, watching...');
        await channelInstance.watch();
        console.log('[ChatRoom] Channel watch successful');
        
        setChannel(channelInstance);
        setError(null);
      } catch (err: any) {
        console.error('[ChatRoom] Failed to load channel:', err);
        console.error('[ChatRoom] Error details:', JSON.stringify(err, null, 2));
        setError(err?.message || 'Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };

    initChannel();
  }, [chatClient, channelId, user?.id]);

  useEffect(() => {
    // Add emergency button to header
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={sendEmergencyAlert}
          style={{ marginRight: Spacing.md }}
        >
          <Feather name="alert-triangle" size={24} color={theme.emergency} />
        </Pressable>
      ),
    });
  }, [navigation, channel, theme]);

  async function sendEmergencyAlert() {
    if (!channel) return;

    Alert.alert(
      'Send Emergency Alert',
      'This will send an emergency notification to all members of this channel.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Alert',
          style: 'destructive',
          onPress: async () => {
            try {
              await channel.sendMessage({
                text: 'EMERGENCY ALERT - Immediate assistance needed!',
                emergency: true,
              } as any);
            } catch (error: any) {
              Alert.alert('Error', 'Failed to send emergency alert');
              console.error('Emergency alert error:', error);
            }
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error || !channel) {
    const isWebPlatform = Platform.OS === 'web';
    const isUrlDecodingError = error?.includes('decode') || error?.includes('URLStateMachine');
    
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.backgroundRoot }]}>
        <Feather 
          name={isWebPlatform && isUrlDecodingError ? "smartphone" : "alert-circle"} 
          size={48} 
          color={theme.textSecondary} 
        />
        <Text style={[styles.errorTitle, { color: theme.text }]}>
          {isWebPlatform && isUrlDecodingError ? 'Use Mobile App for Chat' : 'Unable to load chats'}
        </Text>
        <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>
          {isWebPlatform && isUrlDecodingError 
            ? 'Chat features work best on the mobile app. Scan the QR code in Expo Go to access full functionality.'
            : (error || 'Please check your connection and try again')
          }
        </Text>
        {!isWebPlatform || !isUrlDecodingError ? (
          <Pressable 
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              setError(null);
              setIsLoading(true);
              setChannel(null);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        ) : null}
        <Pressable 
          style={[styles.backButton, { borderColor: theme.border }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: theme.text }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Channel channel={channel}>
        <MessageList />
        <MessageInput />
      </Channel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  backButtonText: {
    fontWeight: '600',
  },
});
