import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Channel, MessageList, MessageInput } from 'stream-chat-expo';
import { Channel as StreamChannel } from 'stream-chat';
import { useTheme } from '@/hooks/useTheme';
import { useStreamAuth } from '@/utils/streamAuth';
import { ChatsStackParamList } from '@/navigation/ChatsStackNavigator';

type RouteProps = RouteProp<ChatsStackParamList, 'ChatRoom'>;

export default function ChatRoomScreen() {
  const route = useRoute<RouteProps>();
  const { channelId } = route.params;
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useTheme();
  const { chatClient } = useStreamAuth();

  useEffect(() => {
    if (!chatClient || !channelId) {
      return;
    }

    const initChannel = async () => {
      try {
        // Get or create the channel
        const channelInstance = chatClient.channel('messaging', channelId);
        await channelInstance.watch();
        setChannel(channelInstance);
      } catch (error: any) {
        console.error('Failed to load channel:', error);
        Alert.alert('Error', 'Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };

    initChannel();
  }, [chatClient, channelId]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!channel) {
    return null;
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
});
