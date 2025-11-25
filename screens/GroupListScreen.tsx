import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChannelList } from 'stream-chat-expo';
import { Channel } from 'stream-chat';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useStreamAuth } from '@/utils/streamAuth';
import { ChatsStackParamList } from '@/navigation/ChatsStackNavigator';

type NavigationProp = NativeStackNavigationProp<ChatsStackParamList>;

const EmptyChannelList = () => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyContainer}>
      <Feather name="message-circle" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No conversations yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Your group chats will appear here
      </Text>
    </View>
  );
};

const LoadingErrorIndicator = () => {
  const { theme } = useTheme();
  const { logout } = useStreamAuth();
  
  const handleRetry = async () => {
    try {
      await logout();
    } catch (error) {
      console.warn('Logout error:', error);
    }
  };
  
  return (
    <View style={styles.emptyContainer}>
      <Feather name="alert-circle" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No channels available
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        You are not a member of any channels yet. Contact your administrator to be added to a group.
      </Text>
      <Pressable 
        style={[styles.retryButton, { backgroundColor: theme.primary }]}
        onPress={handleRetry}
      >
        <Text style={[styles.retryButtonText, { color: theme.buttonText }]}>
          Log Out and Try Again
        </Text>
      </Pressable>
    </View>
  );
};

export default function GroupListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useStreamAuth();

  const handleChannelSelect = (channel: Channel) => {
    const channelId = channel.id ?? channel.cid ?? '';
    const channelName = (channel.data as { name?: string })?.name || 'Chat';
    
    navigation.navigate('ChatRoom', {
      channelId,
      channelName,
    });
  };

  if (!user) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ChannelList
        filters={{
          members: { $in: [user.id] },
        }}
        sort={{ last_message_at: -1 }}
        onSelect={handleChannelSelect}
        EmptyStateIndicator={EmptyChannelList}
        LoadingErrorIndicator={LoadingErrorIndicator}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
