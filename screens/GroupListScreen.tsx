import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChannelList } from 'stream-chat-expo';
import { Channel } from 'stream-chat';
import { useTheme } from '@/hooks/useTheme';
import { useStreamAuth } from '@/utils/streamAuth';
import { ChatsStackParamList } from '@/navigation/ChatsStackNavigator';

type NavigationProp = NativeStackNavigationProp<ChatsStackParamList>;

export default function GroupListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { user } = useStreamAuth();

  const handleChannelSelect = (channel: Channel) => {
    navigation.navigate('ChatRoom', {
      channelId: channel.id,
      channelName: channel.data?.name || 'Chat',
    });
  };

  if (!user) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundRoot }]}>
      <ChannelList
        filters={{
          members: { $in: [user.id] },
        }}
        sort={{ last_message_at: -1 }}
        onSelect={handleChannelSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
