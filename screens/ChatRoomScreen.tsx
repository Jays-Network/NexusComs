import { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Pressable, Text, Platform, TextInput, FlatList, KeyboardAvoidingView } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useCometChatAuth } from '@/utils/cometChatAuth';
import { ChatsStackParamList } from '@/navigation/ChatsStackNavigator';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { AttachmentSheet } from '@/components/AttachmentSheet';
import { 
  joinGroup, 
  sendTextMessage, 
  sendCustomMessage,
  sendMediaMessage,
  fetchMessages, 
  addMessageListener, 
  removeMessageListener,
  markAsRead,
  CometChat
} from '@/utils/cometChatClient';

type RouteProps = RouteProp<ChatsStackParamList, 'ChatRoom'>;

interface Attachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact' | 'poll' | 'event';
  url?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  latitude?: number;
  longitude?: number;
  phoneNumbers?: string[];
  emails?: string[];
  question?: string;
  options?: string[];
  title?: string;
  date?: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  sentAt: Date;
  isEmergency?: boolean;
  messageType?: string;
  attachment?: Attachment;
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
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const { theme } = useTheme();
  const { user, cometChatUser, isInitialized } = useCometChatAuth();
  const flatListRef = useRef<FlatList>(null);
  const listenerIdRef = useRef<string>(`chat_${channelId}_${Date.now()}`);
  const { paddingBottom } = useScreenInsets();

  const transformMessage = useCallback((msg: any): Message => {
    const msgType = msg.getType?.() || msg.type || 'text';
    let attachment: Attachment | undefined;
    let text = msg.getText?.() || msg.text || '';

    if (msgType === 'image' || msgType === 'video' || msgType === 'audio' || msgType === 'file') {
      const url = msg.getURL?.() || msg.data?.url || msg.attachment?.fileUrl;
      const metadata = msg.getMetadata?.() || msg.metadata || {};
      attachment = {
        type: msgType as Attachment['type'],
        url: url,
        name: msg.getAttachment?.()?.getName?.() || metadata.name || msgType,
        size: msg.getAttachment?.()?.getSize?.() || metadata.size,
        mimeType: msg.getAttachment?.()?.getMimeType?.() || metadata.mimeType,
      };
      text = text || `[${msgType.charAt(0).toUpperCase() + msgType.slice(1)}]`;
    } else if (msgType === 'custom') {
      const customData = msg.getCustomData?.() || msg.data || {};
      const customType = customData.type || msg.getSubType?.();
      
      if (customType === 'location') {
        attachment = {
          type: 'location',
          latitude: customData.latitude,
          longitude: customData.longitude,
          name: customData.address,
        };
        text = `Location: ${customData.address || `${customData.latitude?.toFixed(4)}, ${customData.longitude?.toFixed(4)}`}`;
      } else if (customType === 'contact') {
        attachment = {
          type: 'contact',
          name: customData.name,
          phoneNumbers: customData.phoneNumbers,
          emails: customData.emails,
        };
        text = `Contact: ${customData.name || 'Shared Contact'}`;
      } else if (customType === 'poll') {
        attachment = {
          type: 'poll',
          question: customData.question,
          options: customData.options,
        };
        text = `Poll: ${customData.question || 'New Poll'}`;
      } else if (customType === 'event') {
        attachment = {
          type: 'event',
          title: customData.title,
          date: customData.date,
          name: customData.location,
        };
        text = `Event: ${customData.title || 'New Event'}`;
      }
    }

    return {
      id: msg.getId?.() || msg.id || String(Date.now()),
      text: text,
      senderId: msg.getSender?.()?.getUid?.() || msg.sender?.uid || '',
      senderName: msg.getSender?.()?.getName?.() || msg.sender?.name || 'Unknown',
      sentAt: new Date((msg.getSentAt?.() || msg.sentAt || Date.now()) * 1000),
      isEmergency: msg.getMetadata?.()?.emergency || msg.metadata?.emergency || false,
      messageType: msgType,
      attachment: attachment,
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

  const handleAttachment = useCallback(async (type: string, data: any) => {
    console.log('[ChatRoom] Attachment received:', type, data);
    const groupId = channelId;

    try {
      let sentMessage: any;

      switch (type) {
        case 'gallery':
        case 'camera': {
          const isVideo = data.type === 'video' || data.mimeType?.startsWith('video/');
          const messageType = isVideo ? 'video' : 'image';
          
          const fileData = {
            uri: data.uri,
            name: data.uri?.split('/').pop() || (isVideo ? 'video.mp4' : 'photo.jpg'),
            type: data.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
          };
          
          console.log('[ChatRoom] Sending media message:', messageType, fileData);
          sentMessage = await sendMediaMessage(groupId, fileData, messageType, 'group', {
            width: data.width,
            height: data.height,
          });
          break;
        }
        case 'document': {
          const fileData = {
            uri: data.uri,
            name: data.name || 'document',
            type: data.mimeType || 'application/octet-stream',
          };
          
          console.log('[ChatRoom] Sending document:', fileData);
          sentMessage = await sendMediaMessage(groupId, fileData, 'file', 'group', {
            name: data.name,
            size: data.size,
          });
          break;
        }
        case 'audio': {
          const fileData = {
            uri: data.uri,
            name: data.name || 'audio.mp3',
            type: data.mimeType || 'audio/mpeg',
          };
          
          console.log('[ChatRoom] Sending audio:', fileData);
          sentMessage = await sendMediaMessage(groupId, fileData, 'audio', 'group', {
            name: data.name,
            size: data.size,
          });
          break;
        }
        case 'location': {
          const customData = { 
            type: 'location', 
            latitude: data.latitude, 
            longitude: data.longitude,
            address: `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`,
          };
          sentMessage = await sendCustomMessage(groupId, 'location', customData, 'group');
          break;
        }
        case 'contact': {
          const customData = { 
            type: 'contact', 
            name: data.name || data.firstName || 'Contact',
            phoneNumbers: data.phoneNumbers?.map((p: any) => p.number) || [],
            emails: data.emails?.map((e: any) => e.email) || [],
          };
          sentMessage = await sendCustomMessage(groupId, 'contact', customData, 'group');
          break;
        }
        case 'poll': {
          const customData = { 
            type: 'poll', 
            question: 'New Poll',
            options: ['Option 1', 'Option 2'],
            votes: {},
          };
          sentMessage = await sendCustomMessage(groupId, 'poll', customData, 'group');
          break;
        }
        case 'event': {
          const customData = { 
            type: 'event', 
            title: 'New Event',
            date: new Date().toISOString(),
            location: '',
          };
          sentMessage = await sendCustomMessage(groupId, 'event', customData, 'group');
          break;
        }
        default:
          console.log('[ChatRoom] Unknown attachment type:', type);
          return;
      }

      if (sentMessage) {
        const transformed = transformMessage(sentMessage);
        setMessages(prev => [...prev, transformed]);

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        console.log('[ChatRoom] Attachment message sent:', type);
      }
    } catch (error: any) {
      console.error('[ChatRoom] Failed to send attachment:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to send attachment. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to send attachment. Please try again.');
      }
    }
  }, [channelId, transformMessage]);

  const renderAttachmentContent = useCallback((attachment: Attachment, isOwnMessage: boolean) => {
    const iconColor = isOwnMessage ? '#000' : theme.primary;
    const textColor = isOwnMessage ? '#000' : theme.text;

    switch (attachment.type) {
      case 'image':
      case 'video':
        return (
          <View style={styles.attachmentContainer}>
            <View style={[styles.mediaPlaceholder, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.1)' : theme.backgroundSecondary }]}>
              <Feather name={attachment.type === 'image' ? 'image' : 'video'} size={32} color={iconColor} />
              <Text style={[styles.attachmentLabel, { color: textColor }]}>
                {attachment.name || attachment.type}
              </Text>
            </View>
          </View>
        );
      case 'audio':
        return (
          <View style={styles.attachmentContainer}>
            <View style={[styles.audioContainer, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.1)' : theme.backgroundSecondary }]}>
              <Feather name="headphones" size={24} color={iconColor} />
              <Text style={[styles.attachmentLabel, { color: textColor }]} numberOfLines={1}>
                {attachment.name || 'Audio'}
              </Text>
            </View>
          </View>
        );
      case 'file':
        return (
          <View style={styles.attachmentContainer}>
            <View style={[styles.fileContainer, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.1)' : theme.backgroundSecondary }]}>
              <Feather name="file-text" size={24} color={iconColor} />
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>
                  {attachment.name || 'Document'}
                </Text>
                {attachment.size && (
                  <Text style={[styles.fileSize, { color: isOwnMessage ? 'rgba(0,0,0,0.6)' : theme.textSecondary }]}>
                    {(attachment.size / 1024).toFixed(1)} KB
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      case 'location':
        return (
          <View style={styles.attachmentContainer}>
            <View style={[styles.locationContainer, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.1)' : theme.backgroundSecondary }]}>
              <Feather name="map-pin" size={24} color="#16A34A" />
              <View style={styles.locationInfo}>
                <Text style={[styles.locationLabel, { color: textColor }]}>Shared Location</Text>
                <Text style={[styles.locationCoords, { color: isOwnMessage ? 'rgba(0,0,0,0.6)' : theme.textSecondary }]} numberOfLines={1}>
                  {attachment.latitude?.toFixed(4)}, {attachment.longitude?.toFixed(4)}
                </Text>
              </View>
            </View>
          </View>
        );
      case 'contact':
        return (
          <View style={styles.attachmentContainer}>
            <View style={[styles.contactContainer, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.1)' : theme.backgroundSecondary }]}>
              <View style={[styles.contactAvatar, { backgroundColor: theme.primary }]}>
                <Feather name="user" size={20} color="#FFF" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: textColor }]}>{attachment.name || 'Contact'}</Text>
                {attachment.phoneNumbers && attachment.phoneNumbers.length > 0 && (
                  <Text style={[styles.contactPhone, { color: isOwnMessage ? 'rgba(0,0,0,0.6)' : theme.textSecondary }]} numberOfLines={1}>
                    {attachment.phoneNumbers[0]}
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      case 'poll':
        return (
          <View style={styles.attachmentContainer}>
            <View style={[styles.pollContainer, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.1)' : theme.backgroundSecondary }]}>
              <Feather name="bar-chart-2" size={24} color="#9333EA" />
              <Text style={[styles.pollQuestion, { color: textColor }]}>{attachment.question || 'Poll'}</Text>
            </View>
          </View>
        );
      case 'event':
        return (
          <View style={styles.attachmentContainer}>
            <View style={[styles.eventContainer, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.1)' : theme.backgroundSecondary }]}>
              <Feather name="calendar" size={24} color="#E11D48" />
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: textColor }]}>{attachment.title || 'Event'}</Text>
                {attachment.date && (
                  <Text style={[styles.eventDate, { color: isOwnMessage ? 'rgba(0,0,0,0.6)' : theme.textSecondary }]}>
                    {new Date(attachment.date).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  }, [theme]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.id;
    const isEmergency = item.isEmergency;
    const hasAttachment = item.attachment != null;
    
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
        {hasAttachment && item.attachment && renderAttachmentContent(item.attachment, isOwnMessage)}
        {(!hasAttachment || item.messageType === 'text') && (
          <Text style={[
            styles.messageText,
            { color: isOwnMessage ? '#000' : theme.text },
            isEmergency && styles.emergencyText,
          ]}>
            {item.text}
          </Text>
        )}
        <Text style={[
          styles.timestamp,
          { color: isOwnMessage ? 'rgba(0,0,0,0.5)' : theme.textSecondary }
        ]}>
          {item.sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }, [user?.id, theme, renderAttachmentContent]);

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
        <Pressable
          style={({ pressed }) => [
            styles.attachmentButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => setShowAttachmentSheet(true)}
        >
          <Feather name="paperclip" size={22} color={theme.textSecondary} />
        </Pressable>
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
      <AttachmentSheet
        visible={showAttachmentSheet}
        onClose={() => setShowAttachmentSheet(false)}
        onAttachment={handleAttachment}
      />
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
  attachmentButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
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
  attachmentContainer: {
    marginBottom: Spacing.sm,
  },
  mediaPlaceholder: {
    width: 180,
    height: 120,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentLabel: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 11,
    marginTop: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationCoords: {
    fontSize: 11,
    marginTop: 2,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactPhone: {
    fontSize: 11,
    marginTop: 2,
  },
  pollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  pollQuestion: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  eventContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventDate: {
    fontSize: 11,
    marginTop: 2,
  },
});
