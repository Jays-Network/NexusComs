import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Pressable, Text, Platform, TextInput, FlatList, KeyboardAvoidingView, Linking } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { triggerEmergencyAlert as triggerEmergencyApi } from '@/utils/cometChatApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RouteProps = RouteProp<ChatsStackParamList, 'ChatRoom'> & {
  params: {
    channelId: string;
    channelName: string;
    isDirectChat?: boolean;
  };
};

interface Attachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'location' | 'liveLocation' | 'contact' | 'poll' | 'event';
  url?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  latitude?: number;
  longitude?: number;
  isLive?: boolean;
  durationMinutes?: number;
  expiresAt?: string;
  startedAt?: string;
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

interface DateSeparator {
  id: string;
  type: 'date-separator';
  label: string;
  date: Date;
}

type ListItem = Message | DateSeparator;

function isDateSeparator(item: ListItem): item is DateSeparator {
  return 'type' in item && item.type === 'date-separator';
}

function getDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  
  return date.toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}

function getDateKey(date: Date): string {
  return date.toDateString();
}

export default function ChatRoomScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NativeStackNavigationProp<ChatsStackParamList>>();
  const { channelId, channelName, isDirectChat } = route.params;
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
  
  const receiverType = isDirectChat ? 'user' : 'group';

  const listItems: ListItem[] = useMemo(() => {
    if (messages.length === 0) return [];
    
    const items: ListItem[] = [];
    let lastDateKey = '';
    
    for (const message of messages) {
      const currentDateKey = getDateKey(message.sentAt);
      
      if (currentDateKey !== lastDateKey) {
        items.push({
          id: `date-${currentDateKey}`,
          type: 'date-separator',
          label: getDateLabel(message.sentAt),
          date: message.sentAt,
        });
        lastDateKey = currentDateKey;
      }
      
      items.push(message);
    }
    
    return items;
  }, [messages]);

  const transformMessage = useCallback((msg: any): Message => {
    const msgType = msg.getType?.() || msg.type || 'text';
    const subType = msg.getSubType?.() || msg.subType;
    let attachment: Attachment | undefined;
    let text = msg.getText?.() || msg.text || '';
    
    console.log('[ChatRoom] Transforming message:', {
      msgType,
      subType,
      hasGetCustomData: !!msg.getCustomData,
      customData: msg.getCustomData?.() || msg.data || msg.customData,
    });

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
    } else if (msgType === 'custom' || msgType === 'location' || msgType === 'liveLocation' || msgType === 'contact' || msgType === 'poll' || msgType === 'event' || subType === 'location' || subType === 'liveLocation' || subType === 'contact' || subType === 'poll' || subType === 'event') {
      // Handle custom messages - CometChat may return the custom type as msgType directly
      const customData = msg.getCustomData?.() || msg.data || msg.customData || {};
      const customType = msgType !== 'custom' && msgType !== 'text' ? msgType : (subType || customData.type || msg.getSubType?.());
      
      console.log('[ChatRoom] Processing custom message:', { customType, customData });
      
      if (customType === 'location') {
        attachment = {
          type: 'location',
          latitude: customData.latitude,
          longitude: customData.longitude,
          name: customData.address,
          isLive: false,
        };
        text = `Location: ${customData.address || `${customData.latitude?.toFixed(4)}, ${customData.longitude?.toFixed(4)}`}`;
        console.log('[ChatRoom] Created location attachment:', attachment);
      } else if (customType === 'liveLocation') {
        attachment = {
          type: 'liveLocation',
          latitude: customData.latitude,
          longitude: customData.longitude,
          isLive: true,
          durationMinutes: customData.durationMinutes,
          expiresAt: customData.expiresAt,
          startedAt: customData.startedAt,
        };
        text = `Live Location (${customData.durationMinutes} min)`;
        console.log('[ChatRoom] Created live location attachment:', attachment);
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

    const rawTimestamp = msg.getSentAt?.() || msg.sentAt;
    const sentAt = rawTimestamp != null 
      ? new Date(rawTimestamp >= 1e12 ? rawTimestamp : rawTimestamp * 1000)
      : new Date();

    return {
      id: msg.getId?.() || msg.id || String(Date.now()),
      text: text,
      senderId: msg.getSender?.()?.getUid?.() || msg.sender?.uid || '',
      senderName: msg.getSender?.()?.getName?.() || msg.sender?.name || 'Unknown',
      sentAt: sentAt,
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
        const currentUserId = cometChatUser.getUid?.() || cometChatUser.uid;
        
        if (isDirectChat) {
          console.log(`[ChatRoom] Loading direct chat with user: ${channelId}`);
        } else {
          console.log(`[ChatRoom] Loading group: ${channelId}`);
          
          // Join the group (only for group chats)
          try {
            await joinGroup(channelId, 'public', channelName);
            console.log('[ChatRoom] Joined/verified group membership');
          } catch (joinError: any) {
            console.warn('[ChatRoom] Join group warning:', joinError);
          }
        }
        
        // Fetch existing messages
        try {
          const existingMessages = await fetchMessages(channelId, receiverType, 50);
          const transformed = existingMessages.map(transformMessage);
          // Sort messages by sentAt time in ascending order (oldest first, newest last)
          transformed.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
          setMessages(transformed);
          console.log(`[ChatRoom] Loaded ${transformed.length} messages (sorted chronologically)`);
        } catch (fetchError) {
          console.warn('[ChatRoom] Could not fetch messages:', fetchError);
        }
        
        // Set up real-time message listener
        addMessageListener(
          listenerIdRef.current,
          (newMessage: any) => {
            const msgReceiverType = newMessage.getReceiverType?.() || newMessage.receiverType;
            const receiverId = newMessage.getReceiverId?.() || newMessage.receiverId;
            const senderId = newMessage.getSender?.()?.getUid?.() || newMessage.sender?.uid;
            
            if (isDirectChat) {
              // For direct chats, check if this message is part of this conversation
              const isRelevant = 
                (senderId === channelId && receiverId === currentUserId) ||
                (senderId === currentUserId && receiverId === channelId);
              
              if (isRelevant && msgReceiverType === 'user') {
                console.log('[ChatRoom] New direct message received');
                const transformed = transformMessage(newMessage);
                setMessages(prev => [...prev, transformed]);
                markAsRead(newMessage);
              }
            } else {
              // For group chats
              if (receiverId === channelId && msgReceiverType === 'group') {
                console.log('[ChatRoom] New group message received');
                const transformed = transformMessage(newMessage);
                setMessages(prev => [...prev, transformed]);
                markAsRead(newMessage);
              }
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
  }, [isInitialized, cometChatUser, channelId, channelName, isDirectChat, receiverType, transformMessage]);

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
      'This will send an emergency notification to all team members with emergency access and create a dedicated emergency response group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Alert',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`[ChatRoom] Triggering emergency alert from ${receiverType}: ${channelId}`);
              
              // Get auth token for API call (uses @session_token key)
              const authToken = await AsyncStorage.getItem('@session_token');
              
              if (authToken) {
                // Call new emergency API - creates group, sends push notifications
                const emergencyResult = await triggerEmergencyApi(authToken, {
                  message: 'EMERGENCY ALERT - Immediate assistance needed!',
                  source_group_id: channelId,
                  source_group_name: channelName,
                });
                
                console.log('[ChatRoom] Emergency API result:', emergencyResult);
                
                // Show success with navigation option
                Alert.alert(
                  'Emergency Alert Sent',
                  `Alert sent to ${emergencyResult.members_added} team members.\n\nEmergency group "${emergencyResult.emergency_group_name}" has been created.`,
                  [
                    { text: 'OK', style: 'default' },
                  ]
                );
              }
              
              // Also send emergency message to current channel for visibility
              const sentMessage = await sendTextMessage(
                channelId,
                'EMERGENCY ALERT - Immediate assistance needed!',
                receiverType,
                { emergency: true }
              );
              
              const transformed = transformMessage(sentMessage);
              setMessages(prev => [...prev, transformed]);
              
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            } catch (error: any) {
              Alert.alert('Error', 'Failed to send emergency alert');
              console.error('Emergency alert error:', error);
            }
          },
        },
      ]
    );
  }, [channelId, channelName, receiverType, transformMessage]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    try {
      console.log(`[ChatRoom] Sending message to ${isDirectChat ? 'user' : 'group'}: ${channelId}`);
      const sentMessage = await sendTextMessage(channelId, messageText.trim(), receiverType);
      
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
          sentMessage = await sendMediaMessage(channelId, fileData, messageType, receiverType, {
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
          sentMessage = await sendMediaMessage(channelId, fileData, 'file', receiverType, {
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
          sentMessage = await sendMediaMessage(channelId, fileData, 'audio', receiverType, {
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
            isLive: false,
          };
          sentMessage = await sendCustomMessage(channelId, 'location', customData, receiverType);
          break;
        }
        case 'liveLocation': {
          const customData = { 
            type: 'liveLocation', 
            latitude: data.latitude, 
            longitude: data.longitude,
            isLive: true,
            durationMinutes: data.durationMinutes,
            expiresAt: data.expiresAt,
            startedAt: data.startedAt,
          };
          sentMessage = await sendCustomMessage(channelId, 'liveLocation', customData, receiverType);
          console.log('[ChatRoom] Live location message sent, will update for', data.durationMinutes, 'minutes');
          break;
        }
        case 'contact': {
          const customData = { 
            type: 'contact', 
            name: data.name || data.firstName || 'Contact',
            phoneNumbers: data.phoneNumbers?.map((p: any) => p.number) || [],
            emails: data.emails?.map((e: any) => e.email) || [],
          };
          sentMessage = await sendCustomMessage(channelId, 'contact', customData, receiverType);
          break;
        }
        case 'poll': {
          const customData = { 
            type: 'poll', 
            question: 'New Poll',
            options: ['Option 1', 'Option 2'],
            votes: {},
          };
          sentMessage = await sendCustomMessage(channelId, 'poll', customData, receiverType);
          break;
        }
        case 'event': {
          const customData = { 
            type: 'event', 
            title: 'New Event',
            date: new Date().toISOString(),
            location: '',
          };
          sentMessage = await sendCustomMessage(channelId, 'event', customData, receiverType);
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
  }, [channelId, receiverType, transformMessage]);

  const navigateToLiveLocationMap = useCallback((attachment: Attachment, senderName: string, senderId: string) => {
    console.log('[ChatRoom] Navigating to LiveLocationMap with:', {
      groupId: channelId,
      groupName: channelName,
      latitude: attachment.latitude,
      longitude: attachment.longitude,
      senderName,
      senderId
    });
    navigation.navigate('LiveLocationMap', {
      groupId: channelId,
      groupName: channelName,
      initialLocation: {
        latitude: attachment.latitude || 0,
        longitude: attachment.longitude || 0,
        senderName: senderName,
        senderId: senderId
      }
    });
  }, [navigation, channelId, channelName]);

  const renderAttachmentContent = useCallback((attachment: Attachment, isOwnMessage: boolean, senderName?: string, senderId?: string) => {
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
          <Pressable 
            style={styles.attachmentContainer}
            onPress={() => {
              if (attachment.url) {
                Linking.openURL(attachment.url).catch(err => {
                  console.error('[ChatRoom] Failed to open file:', err);
                  Alert.alert('Error', 'Could not open file');
                });
              }
            }}
          >
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
              <Feather name="download" size={18} color={iconColor} style={{ marginLeft: 4 }} />
            </View>
          </Pressable>
        );
      case 'location':
        return (
          <Pressable 
            style={styles.attachmentContainer}
            onPress={() => {
              if (attachment.latitude && attachment.longitude && senderName && senderId) {
                navigateToLiveLocationMap(attachment, senderName, senderId);
              }
            }}
            onLongPress={() => {
              if (attachment.latitude && attachment.longitude) {
                const url = Platform.select({
                  ios: `maps://app?daddr=${attachment.latitude},${attachment.longitude}`,
                  android: `geo:${attachment.latitude},${attachment.longitude}?q=${attachment.latitude},${attachment.longitude}`,
                  default: `https://www.google.com/maps?q=${attachment.latitude},${attachment.longitude}`
                });
                Linking.openURL(url).catch(err => {
                  console.error('[ChatRoom] Failed to open map:', err);
                  Linking.openURL(`https://www.google.com/maps?q=${attachment.latitude},${attachment.longitude}`);
                });
              }
            }}
          >
            <View style={[styles.locationContainer, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.1)' : theme.backgroundSecondary }]}>
              <Feather name="map-pin" size={24} color="#16A34A" />
              <View style={styles.locationInfo}>
                <Text style={[styles.locationLabel, { color: textColor }]}>Shared Location</Text>
                <Text style={[styles.locationCoords, { color: isOwnMessage ? 'rgba(0,0,0,0.6)' : theme.textSecondary }]} numberOfLines={1}>
                  {attachment.latitude?.toFixed(4)}, {attachment.longitude?.toFixed(4)}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={iconColor} style={{ marginLeft: 4 }} />
            </View>
          </Pressable>
        );
      case 'liveLocation':
        const isExpired = attachment.expiresAt ? new Date(attachment.expiresAt) < new Date() : false;
        return (
          <Pressable 
            style={styles.attachmentContainer}
            onPress={() => {
              console.log('[ChatRoom] Live location tapped:', { 
                hasLatitude: !!attachment.latitude, 
                hasLongitude: !!attachment.longitude, 
                senderName, 
                senderId 
              });
              if (attachment.latitude && attachment.longitude) {
                navigateToLiveLocationMap(attachment, senderName || 'Unknown', senderId || 'unknown');
              } else {
                console.warn('[ChatRoom] Missing coordinates for live location');
              }
            }}
            onLongPress={() => {
              if (attachment.latitude && attachment.longitude) {
                const url = Platform.select({
                  ios: `maps://app?daddr=${attachment.latitude},${attachment.longitude}`,
                  android: `geo:${attachment.latitude},${attachment.longitude}?q=${attachment.latitude},${attachment.longitude}`,
                  default: `https://www.google.com/maps?q=${attachment.latitude},${attachment.longitude}`
                });
                Linking.openURL(url).catch(err => {
                  console.error('[ChatRoom] Failed to open map:', err);
                  Linking.openURL(`https://www.google.com/maps?q=${attachment.latitude},${attachment.longitude}`);
                });
              }
            }}
          >
            <View style={[styles.locationContainer, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.1)' : theme.backgroundSecondary }]}>
              <View style={styles.liveLocationIcon}>
                <Feather name="navigation" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.locationInfo}>
                <View style={styles.liveLocationHeader}>
                  <Text style={[styles.locationLabel, { color: textColor }]}>
                    {isExpired ? 'Live Location Ended' : 'Live Location'}
                  </Text>
                  {!isExpired && (
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.locationCoords, { color: isOwnMessage ? 'rgba(0,0,0,0.6)' : theme.textSecondary }]} numberOfLines={1}>
                  {attachment.latitude?.toFixed(4)}, {attachment.longitude?.toFixed(4)}
                </Text>
                {attachment.durationMinutes && (
                  <Text style={[styles.liveLocationDuration, { color: isOwnMessage ? 'rgba(0,0,0,0.5)' : theme.textSecondary }]}>
                    {isExpired ? 'Expired' : `${attachment.durationMinutes} min sharing`}
                  </Text>
                )}
              </View>
              <Feather name="chevron-right" size={16} color={iconColor} style={{ marginLeft: 4 }} />
            </View>
          </Pressable>
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
  }, [theme, navigateToLiveLocationMap]);

  const renderDateSeparator = useCallback((item: DateSeparator) => {
    return (
      <View style={styles.dateSeparatorContainer}>
        <View style={[styles.dateSeparatorPill, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.dateSeparatorText, { color: theme.textSecondary }]}>
            {item.label}
          </Text>
        </View>
      </View>
    );
  }, [theme]);

  const renderMessageBubble = useCallback((item: Message) => {
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
        {hasAttachment && item.attachment && renderAttachmentContent(item.attachment, isOwnMessage, item.senderName, item.senderId)}
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

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (isDateSeparator(item)) {
      return renderDateSeparator(item);
    }
    return renderMessageBubble(item);
  }, [renderDateSeparator, renderMessageBubble]);

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
        data={listItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
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
  dateSeparatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginVertical: Spacing.sm,
  },
  dateSeparatorPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '500',
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
    minWidth: 200,
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
    minWidth: 180,
  },
  fileInfo: {
    flex: 1,
    minWidth: 120,
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
    minWidth: 180,
  },
  locationInfo: {
    flex: 1,
    minWidth: 120,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationCoords: {
    fontSize: 11,
    marginTop: 2,
  },
  liveLocationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  liveBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  liveLocationDuration: {
    fontSize: 10,
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
