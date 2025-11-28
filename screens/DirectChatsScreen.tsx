import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useCometChatAuth } from '@/utils/cometChatAuth';
import { DirectChatsStackParamList } from '@/navigation/DirectChatsStackNavigator';
import { AppHeader } from '@/components/AppHeader';
import { fetchConversations } from '@/utils/cometChatClient';
import { Spacing, BorderRadius } from '@/constants/theme';

type NavigationProp = NativeStackNavigationProp<DirectChatsStackParamList>;

interface Conversation {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

const EmptyChannelList = () => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyContainer}>
      <Feather name="message-circle" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No conversations yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Start a new chat to begin messaging
      </Text>
    </View>
  );
};

const LoadingErrorIndicator = ({ onRetry }: { onRetry: () => void }) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyContainer}>
      <Feather name="alert-circle" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Unable to load chats
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Please check your connection and try again
      </Text>
      <Pressable 
        style={[styles.retryButton, { backgroundColor: theme.primary }]}
        onPress={onRetry}
      >
        <Text style={[styles.retryButtonText, { color: theme.buttonText }]}>
          Try Again
        </Text>
      </Pressable>
    </View>
  );
};

export default function DirectChatsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user, cometChatUser, isInitialized } = useCometChatAuth();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!isInitialized || !cometChatUser) {
      setIsLoading(false);
      return;
    }

    try {
      const fetchedConversations = await fetchConversations(30);
      const mappedConversations: Conversation[] = fetchedConversations
        .filter((conv: any) => conv.getConversationType?.() === 'user')
        .map((conv: any) => {
          const conversationWith = conv.getConversationWith?.();
          const lastMessage = conv.getLastMessage?.();
          return {
            id: conversationWith?.getUid?.() || conv.conversationId,
            name: conversationWith?.getName?.() || 'Unknown',
            lastMessage: lastMessage?.getText?.() || '',
            lastMessageTime: lastMessage ? new Date((lastMessage.getSentAt?.() || 0) * 1000) : undefined,
            unreadCount: conv.getUnreadMessageCount?.() || 0,
          };
        });
      setConversations(mappedConversations);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
      setError(err.message || 'Failed to load chats');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isInitialized, cometChatUser]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadConversations();
  };

  const handleConversationPress = (conversation: Conversation) => {
    navigation.navigate('DirectChatRoom', {
      channelId: conversation.id,
      channelName: conversation.name,
    });
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <Pressable
      style={[styles.conversationItem, { backgroundColor: theme.surface }]}
      onPress={() => handleConversationPress(item)}
    >
      <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.conversationName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.lastMessageTime ? (
            <Text style={[styles.conversationTime, { color: theme.textSecondary }]}>
              {item.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          ) : null}
        </View>
        {item.lastMessage ? (
          <Text style={[styles.lastMessage, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        ) : null}
      </View>
      {item.unreadCount > 0 ? (
        <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.unreadCount}>{item.unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
        <AppHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading chats...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
        <AppHeader />
        <LoadingErrorIndicator onRetry={loadConversations} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
      <AppHeader />
      {conversations.length === 0 ? (
        <EmptyChannelList />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.md,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: Spacing.sm,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
