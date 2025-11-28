import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { AppHeader } from '@/components/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useCometChatAuth } from '@/utils/cometChatAuth';
import { fetchGroups as fetchCometChatGroups, fetchMessages } from '@/utils/cometChatClient';

interface EmergencyMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  groupName?: string;
}

function EmergencyCard({ message }: { message: EmergencyMessage }) {
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
          {message.senderName}
        </ThemedText>
      </View>

      <ThemedText style={styles.messageContent}>
        {message.text || 'Emergency alert'}
      </ThemedText>

      {message.groupName ? (
        <ThemedText style={[styles.groupName, { color: theme.textSecondary }]}>
          From: {message.groupName}
        </ThemedText>
      ) : null}

      <ThemedText style={styles.timestamp}>
        {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
      </ThemedText>
    </View>
  );
}

export default function EmergencyListScreen() {
  const [messages, setMessages] = useState<EmergencyMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const { cometChatUser, isInitialized } = useCometChatAuth();

  const loadEmergencyMessages = useCallback(async () => {
    if (!isInitialized || !cometChatUser) {
      setIsLoading(false);
      return;
    }

    try {
      const groups = await fetchCometChatGroups(50);
      const emergencyMessages: EmergencyMessage[] = [];
      
      for (const group of groups) {
        try {
          const guid = group.getGuid?.() || group.guid;
          const groupName = group.getName?.() || group.name || 'Unknown Group';
          const groupMessages = await fetchMessages(guid, 'group', 100);
          
          for (const msg of groupMessages) {
            const metadata = msg.getMetadata?.() || msg.metadata || {};
            if (metadata.emergency === true) {
              emergencyMessages.push({
                id: msg.getId?.() || msg.id || String(Date.now()),
                text: msg.getText?.() || msg.text || 'Emergency!',
                senderId: msg.getSender?.()?.getUid?.() || msg.sender?.uid || '',
                senderName: msg.getSender?.()?.getName?.() || msg.sender?.name || 'Unknown',
                createdAt: new Date((msg.getSentAt?.() || msg.sentAt || Date.now()) * 1000).toISOString(),
                groupName: groupName,
              });
            }
          }
        } catch (error) {
          console.warn('Failed to query group:', error);
        }
      }

      emergencyMessages.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      setMessages(emergencyMessages);
    } catch (error) {
      console.error('Load emergency messages error:', error);
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
                <EmergencyCard key={message.id} message={message} />
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
});
