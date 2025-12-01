import { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Pressable, Text, Platform, TextInput, FlatList, KeyboardAvoidingView } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useCometChatAuth } from '@/utils/cometChatAuth';
import { ChatsStackParamList } from '@/navigation/ChatsStackNavigator';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { 
  joinGroup, 
  sendTextMessage, 
  fetchMessages, 
  addMessageListener, 
  removeMessageListener,
  markAsRead,
  CometChat
} from '@/utils/cometChatClient';

type RouteProps = RouteProp<ChatsStackParamList, 'ChatRoom'>;

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  sentAt: Date;
  isEmergency?: boolean;
}

export default function ChatRoomScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { channelId, channelName } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { theme } = useTheme();
  const { user, cometChatUser, isInitialized } = useCometChatAuth();
  const flatListRef = useRef<FlatList>(null);
  const listenerIdRef = useRef<string>(`chat_${channelId}_${Date.now()}`);
  const { paddingBottom } = useScreenInsets();

  const transformMessage = useCallback((msg: any): Message => {
    return {
      id: msg.getId?.() || msg.id || String(Date.now()),
      text: msg.getText?.() || msg.text || '',
      senderId: msg.getSender?.()?.getUid?.() || msg.sender?.uid || '',
      senderName: msg.getSender?.()?.getName?.() || msg.sender?.name || 'Unknown',
      sentAt: new Date((msg.getSentAt?.() || msg.sentAt || Date.now()) * 1000),
      isEmergency: msg.getMetadata?.()?.emergency || msg.metadata?.emergency || false,
    };
  }, []);

  useEffect(() => {
    if (!isInitialized || !cometChatUser) {
      console.log('[ChatRoom] Waiting for CometChat initialization', { isInitialized, cometChatUser: !!cometChatUser });
      if (!isInitialized) {
        setError('Chat not initialized');
        setIsLoading(false);
      }
      return;
    }

    const initChat = async () => {
      try {
        console.log(`[ChatRoom] Loading group: ${channelId}`);
        
        // Use the channelId directly - don't transform it since it comes from the database
        const groupId = channelId;
        console.log(`[ChatRoom] CometChat group ID: ${groupId}`);
        
        // Join the group (or create and join if it doesn't exist)
        try {
          await joinGroup(groupId, 'public', channelName);
          console.log('[ChatRoom] Joined/verified group membership');
        } catch (joinError: any) {
          console.warn('[ChatRoom] Join group warning:', joinError);
        }
        
        // Fetch existing messages
        try {
          const existingMessages = await fetchMessages(groupId, 'group', 50);
          const transformed = existingMessages.map(transformMessage).reverse();
          setMessages(transformed);
          console.log(`[ChatRoom] Loaded ${transformed.length} messages`);
        } catch (fetchError) {
          console.warn('[ChatRoom] Could not fetch messages:', fetchError);
        }
        
        // Set up real-time message listener
        addMessageListener(
          listenerIdRef.current,
          (newMessage: any) => {
            const receiverId = newMessage.getReceiverId?.() || newMessage.receiverId;
            if (receiverId === groupId) {
              const transformed = transformMessage(newMessage);
              setMessages(prev => [...prev, transformed]);
              markAsRead(newMessage);
            }
          }
        );
        
        setError(null);
      } catch (err: any) {
        console.error('[ChatRoom] Failed to load chat:', err);
        setError(err?.message || 'Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };

    initChat();

    return () => {
      removeMessageListener(listenerIdRef.current);
    };
  }, [isInitialized, cometChatUser, channelId, transformMessage]);

  useEffect(() => {
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
  }, [navigation, channelId, theme]);

  const sendEmergencyAlert = useCallback(() => {
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
              const groupId = channelId.replace('group-', 'group_');
              await sendTextMessage(
                groupId,
                'EMERGENCY ALERT - Immediate assistance needed!',
                'group',
                { emergency: true }
              );
            } catch (error: any) {
              Alert.alert('Error', 'Failed to send emergency alert');
              console.error('Emergency alert error:', error);
            }
          },
        },
      ]
    );
  }, [channelId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    try {
      // Use channelId directly - it comes from the database as the CometChat group ID
      const groupId = channelId;
      const sentMessage = await sendTextMessage(groupId, messageText.trim(), 'group');
      
      const transformed = transformMessage(sentMessage);
      setMessages(prev => [...prev, transformed]);
      setMessageText('');
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send message');
      console.error('Send message error:', error);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.id;
    const isEmergency = item.isEmergency;
    
    return (
      <View style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
        isOwnMessage 
          ? { backgroundColor: theme.primary }
          : { backgroundColor: theme.surface },
        isEmergency && styles.emergencyMessage,
      ]}>
        {!isOwnMessage && (
          <Text style={[styles.senderName, { color: theme.textSecondary }]}>
            {item.senderName}
          </Text>
        )}
        <Text style={[
          styles.messageText,
          { color: isOwnMessage ? '#000' : theme.text },
          isEmergency && styles.emergencyText,
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.timestamp,
          { color: isOwnMessage ? 'rgba(0,0,0,0.5)' : theme.textSecondary }
        ]}>
          {item.sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }, [user?.id, theme]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading chat...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="alert-circle" size={48} color={theme.textSecondary} />
        <Text style={[styles.errorTitle, { color: theme.text }]}>
          Unable to load chat
        </Text>
        <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>
          {error}
        </Text>
        <Pressable 
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            setError(null);
            setIsLoading(true);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        style={{ backgroundColor: theme.backgroundRoot }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="message-circle" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        }
      />
      <View style={[
        styles.inputContainer, 
        { 
          backgroundColor: theme.surface, 
          borderTopColor: theme.border,
          paddingBottom: paddingBottom,
        }
      ]}>
        <TextInput
          style={[styles.textInput, { backgroundColor: theme.backgroundRoot, color: theme.text }]}
          placeholder="Type a message..."
          placeholderTextColor={theme.textSecondary}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={2000}
          onSubmitEditing={handleSendMessage}
        />
        <Pressable
          style={[
            styles.sendButton,
            { backgroundColor: messageText.trim() ? theme.primary : theme.border }
          ]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Feather name="send" size={20} color={messageText.trim() ? '#000' : theme.textSecondary} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
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
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  backButtonText: {
    fontWeight: '600',
  },
  messagesList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: BorderRadius.xs,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: BorderRadius.xs,
  },
  emergencyMessage: {
    borderWidth: 2,
    borderColor: '#FF4444',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  emergencyText: {
    fontWeight: '600',
    color: '#FF4444',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
