import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import GroupListScreen from "@/screens/GroupListScreen";
import ChatRoomScreen from "@/screens/ChatRoomScreen";
import CreateGroupScreen from "@/screens/CreateGroupScreen";
import LiveLocationMapScreen from "@/screens/LiveLocationMapScreen";

export type ChatsStackParamList = {
  GroupList: undefined;
  ChatRoom: { channelId: string; channelName: string };
  CreateGroup: undefined;
  LiveLocationMap: { 
    groupId: string; 
    groupName?: string;
    initialLocation?: {
      latitude: number;
      longitude: number;
      senderName: string;
      senderId: string;
    };
  };
};

const Stack = createNativeStackNavigator<ChatsStackParamList>();

export default function ChatsStackNavigator() {
  const { theme, isDark } = useTheme();
  
  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="GroupList"
        component={GroupListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ 
          title: route.params.channelName,
          headerTransparent: false
        })}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ 
          title: 'New Group',
          headerTransparent: false
        }}
      />
      <Stack.Screen
        name="LiveLocationMap"
        component={LiveLocationMapScreen}
        options={{ 
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
}
