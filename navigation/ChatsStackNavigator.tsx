import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getCommonScreenOptions } from "./screenOptions";
import GroupListScreen from "@/screens/GroupListScreen";
import ChatRoomScreen from "@/screens/ChatRoomScreen";
import GroupMapScreen from "@/screens/GroupMapScreen";

export type ChatsStackParamList = {
  GroupList: undefined;
  ChatRoom: { subgroupId: string; subgroupName: string };
  GroupMap: { subgroupId: string; subgroupName: string };
};

const Stack = createNativeStackNavigator<ChatsStackParamList>();

export default function ChatsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions}>
      <Stack.Screen
        name="GroupList"
        component={GroupListScreen}
        options={{ title: "Chats" }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ 
          title: route.params.subgroupName,
          headerTransparent: false
        })}
      />
      <Stack.Screen
        name="GroupMap"
        component={GroupMapScreen}
        options={({ route }) => ({ 
          title: route.params.subgroupName,
          headerTransparent: false
        })}
      />
    </Stack.Navigator>
  );
}
