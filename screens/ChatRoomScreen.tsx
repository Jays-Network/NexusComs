import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Pressable } from 'react-native';
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
  const { channelId } = route.params;
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
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
