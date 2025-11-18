import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useStreamAuth } from '@/utils/streamAuth';
import type { MessageResponse } from 'stream-chat';

function EmergencyCard({ message }: { message: MessageResponse }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.messageCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.emergency,
          borderWidth: 2
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
          {message.user?.name || message.user?.id || 'Unknown'}
        </ThemedText>
      </View>

      <ThemedText style={styles.messageContent}>
        {message.text || 'Emergency alert'}
      </ThemedText>

      <ThemedText style={styles.timestamp}>
        {message.created_at ? new Date(message.created_at).toLocaleString() : ''}
      </ThemedText>
    </View>
  );
}

export default function EmergencyListScreen() {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const { chatClient } = useStreamAuth();

  useEffect(() => {
    loadEmergencyMessages();
  }, [chatClient]);

  async function loadEmergencyMessages() {
    if (!chatClient) {
      setIsLoading(false);
      return;
    }

    try {
      // Query all channels the user is a member of
      const channels = await chatClient.queryChannels({
        members: { $in: [chatClient.userID!] }
      });

      // Collect all emergency messages from all channels
      const emergencyMessages: MessageResponse[] = [];
      
      for (const channel of channels) {
        try {
          // Search for messages with emergency = true in this channel
          const response = await channel.query({
            messages: { limit: 100 }
          });

          const channelEmergencies = response.messages.filter(
            (msg: any) => msg.emergency === true
          );

          emergencyMessages.push(...channelEmergencies);
        } catch (error) {
          console.warn('Failed to query channel:', error);
        }
      }

      // Sort by most recent first
      emergencyMessages.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setMessages(emergencyMessages);
    } catch (error) {
      console.error('Load emergency messages error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadEmergencyMessages();
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.emergency} />
      </View>
    );
  }

  return (
    <ScreenScrollView 
      style={{ backgroundColor: theme.backgroundRoot }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="alert-octagon" size={64} color={theme.emergency} />
          <ThemedText style={styles.emptyText}>No Emergency Alerts</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Emergency alerts from your channels will appear here
          </ThemedText>
        </View>
      ) : (
        <View style={styles.messagesContainer}>
          {messages.map((message) => (
            <EmergencyCard key={message.id} message={message} />
          ))}
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing['5xl']
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: Spacing.xl,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 15,
    opacity: 0.6,
    marginTop: Spacing.sm,
    textAlign: 'center'
  },
  messagesContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg
  },
  messageCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  senderName: {
    fontSize: 16,
    fontWeight: '700'
  },
  messageContent: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500'
  },
  timestamp: {
    fontSize: 13,
    opacity: 0.6
  },
});
