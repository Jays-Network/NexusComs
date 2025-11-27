import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import GroupListScreen from "@/screens/GroupListScreen";
import ChatRoomScreen from "@/screens/ChatRoomScreen";
import CreateGroupScreen from "@/screens/CreateGroupScreen";

export type GroupsStackParamList = {
  GroupList: undefined;
  GroupChatRoom: { channelId: string; channelName: string };
  CreateGroup: undefined;
};

const Stack = createNativeStackNavigator<GroupsStackParamList>();

export default function GroupsStackNavigator() {
  const { theme, isDark } = useTheme();
  
  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="GroupList"
        component={GroupListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GroupChatRoom"
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
    </Stack.Navigator>
  );
}
