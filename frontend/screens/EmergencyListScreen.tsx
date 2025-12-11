import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { AppHeader } from '@/components/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useCometChatAuth } from '@/utils/cometChatAuth';
import { fetchGroups as fetchCometChatGroups, fetchMessages, fetchConversations } from '@/utils/cometChatClient';

interface EmergencyMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  groupName?: string;
  groupId?: string;
  conversationType?: 'group' | 'user';
  conversationId?: string;
}

interface EmergencyCardProps {
  message: EmergencyMessage;
  onPress: () => void;
}

function EmergencyCard({ message, onPress }: EmergencyCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.messageCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.emergency,
          borderWidth: 2,
          opacity: pressed ? 0.8 : 1,
        }
      ]}
    >
      <View style={styles.messageHeader}>
        <Feather
          name="alert-octagon"
          size={24}
          color={theme.emergency}
        />
        <ThemedText style={[styles.senderName, { color: theme.emergency }]}>
          {message.senderName}
        </ThemedText>
        <View style={{ flex: 1 }} />
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </View>

      <ThemedText style={styles.messageContent}>
        {message.text || 'Emergency alert'}
      </ThemedText>

      {message.groupName ? (
        <ThemedText style={[styles.groupName, { color: theme.textSecondary }]}>
          From: {message.groupName}
        </ThemedText>
      ) : null}

      <View style={styles.cardFooter}>
        <ThemedText style={styles.timestamp}>
          {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
        </ThemedText>
        <ThemedText style={[styles.tapHint, { color: theme.primary }]}>
          Tap to open chat
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function EmergencyListScreen() {
  const [messages, setMessages] = useState<EmergencyMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const { cometChatUser, isInitialized } = useCometChatAuth();
  const navigation = useNavigation<any>();

  const handleEmergencyCardPress = useCallback((message: EmergencyMessage) => {
    console.log('[EmergencyList] Card pressed:', message);
    
    // Navigate to the chat where the emergency was sent
    if (message.conversationType === 'group' && message.groupId) {
      // Navigate to group chat
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Chats',
          params: {
            screen: 'ChatRoom',
            params: {
              channelId: message.groupId,
              channelName: message.groupName || 'Emergency Group',
              isDirectChat: false,
            },
          },
        })
      );
    } else if (message.conversationType === 'user' && message.conversationId) {
      // Navigate to direct message
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Chats',
          params: {
            screen: 'ChatRoom',
            params: {
              channelId: message.conversationId,
              channelName: message.senderName,
              isDirectChat: true,
            },
          },
        })
      );
    } else if (message.groupId) {
      // Fallback: navigate to group
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Chats',
          params: {
            screen: 'ChatRoom',
            params: {
              channelId: message.groupId,
              channelName: message.groupName || 'Emergency',
              isDirectChat: false,
            },
          },
        })
      );
    }
  }, [navigation]);

  const loadEmergencyMessages = useCallback(async () => {
    if (!isInitialized || !cometChatUser) {
      console.log('[EmergencyList] Not initialized or no user');
      setIsLoading(false);
      return;
    }

    console.log('[EmergencyList] Loading emergency messages...');
    
    try {
      const emergencyMessages: EmergencyMessage[] = [];
      
      // Fetch from groups
      try {
        const groups = await fetchCometChatGroups(50);
        console.log('[EmergencyList] Fetched', groups.length, 'groups');
        
        for (const group of groups) {
          try {
            const guid = group.getGuid?.() || group.guid;
            const groupName = group.getName?.() || group.name || 'Unknown Group';
            const groupMessages = await fetchMessages(guid, 'group', 100);
            
            for (const msg of groupMessages) {
              const metadata = msg.getMetadata?.() || msg.metadata || {};
              if (metadata.emergency === true) {
                console.log('[EmergencyList] Found emergency in group:', groupName);
                emergencyMessages.push({
                  id: msg.getId?.() || msg.id || String(Date.now()),
                  text: msg.getText?.() || msg.text || 'Emergency!',
                  senderId: msg.getSender?.()?.getUid?.() || msg.sender?.uid || '',
                  senderName: msg.getSender?.()?.getName?.() || msg.sender?.name || 'Unknown',
                  createdAt: new Date((msg.getSentAt?.() || msg.sentAt || Date.now()) * 1000).toISOString(),
                  groupName: groupName,
                  groupId: guid,
                  conversationType: 'group',
                  conversationId: guid,
                });
              }
            }
          } catch (error) {
            console.warn('[EmergencyList] Failed to query group:', error);
          }
        }
      } catch (error) {
        console.warn('[EmergencyList] Failed to fetch groups:', error);
      }
      
      // Also fetch from direct message conversations
      try {
        const conversations = await fetchConversations(50);
        console.log('[EmergencyList] Fetched', conversations.length, 'conversations');
        
        for (const conv of conversations) {
          try {
            const conversationType = conv.getConversationType?.() || conv.conversationType;
            
            // Only check user conversations (direct messages)
            if (conversationType === 'user') {
              const conversationWith = conv.getConversationWith?.() || conv.conversationWith;
              const userId = conversationWith?.getUid?.() || conversationWith?.uid;
              const userName = conversationWith?.getName?.() || conversationWith?.name || 'Unknown';
              
              if (userId) {
                const userMessages = await fetchMessages(userId, 'user', 100);
                
                for (const msg of userMessages) {
                  const metadata = msg.getMetadata?.() || msg.metadata || {};
                  if (metadata.emergency === true) {
                    console.log('[EmergencyList] Found emergency in DM with:', userName);
                    emergencyMessages.push({
                      id: msg.getId?.() || msg.id || String(Date.now()),
                      text: msg.getText?.() || msg.text || 'Emergency!',
                      senderId: msg.getSender?.()?.getUid?.() || msg.sender?.uid || '',
                      senderName: msg.getSender?.()?.getName?.() || msg.sender?.name || 'Unknown',
                      createdAt: new Date((msg.getSentAt?.() || msg.sentAt || Date.now()) * 1000).toISOString(),
                      groupName: `Chat with ${userName}`,
                      conversationType: 'user',
                      conversationId: userId,
                    });
                  }
                }
              }
            }
          } catch (error) {
            console.warn('[EmergencyList] Failed to query conversation:', error);
          }
        }
      } catch (error) {
        console.warn('[EmergencyList] Failed to fetch conversations:', error);
      }

      // Sort by date (newest first)
      emergencyMessages.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      // Remove duplicates by ID
      const uniqueMessages = emergencyMessages.filter((msg, index, self) => 
        index === self.findIndex(m => m.id === msg.id)
      );

      console.log('[EmergencyList] Found', uniqueMessages.length, 'emergency messages');
      setMessages(uniqueMessages);
    } catch (error) {
      console.error('[EmergencyList] Load emergency messages error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isInitialized, cometChatUser]);

  useFocusEffect(
    useCallback(() => {
      loadEmergencyMessages();
    }, [loadEmergencyMessages])
  );

  function handleRefresh() {
    setRefreshing(true);
    loadEmergencyMessages();
  }

  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
        <AppHeader />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading emergency alerts...
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
      <AppHeader />
      <ScreenScrollView
        style={{ backgroundColor: theme.backgroundRoot }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Feather name="alert-octagon" size={24} color={theme.emergency} />
            <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
              Emergency Alerts
            </ThemedText>
          </View>

          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="check-circle" size={64} color={theme.success} />
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
                No Emergency Alerts
              </ThemedText>
              <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                There are no emergency alerts at this time
              </ThemedText>
            </View>
          ) : (
            <View style={styles.messagesList}>
              {messages.map((message) => (
                <EmergencyCard 
                  key={message.id} 
                  message={message} 
                  onPress={() => handleEmergencyCardPress(message)}
                />
              ))}
            </View>
          )}
        </View>
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  messagesList: {
    gap: Spacing.md,
  },
  messageCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  groupName: {
    fontSize: 13,
  },
  timestamp: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  tapHint: {
    fontSize: 12,
    fontWeight: '500',
  },
});
