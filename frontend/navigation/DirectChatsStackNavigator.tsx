import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import DirectChatsScreen from "@/screens/DirectChatsScreen";
import ChatRoomScreen from "@/screens/ChatRoomScreen";

export type DirectChatsStackParamList = {
  DirectChatsList: undefined;
  DirectChatRoom: { channelId: string; channelName: string; isDirectChat?: boolean };
};

const Stack = createNativeStackNavigator<DirectChatsStackParamList>();

export default function DirectChatsStackNavigator() {
  const { theme, isDark } = useTheme();
  
  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="DirectChatsList"
        component={DirectChatsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DirectChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ 
          title: route.params.channelName,
          headerTransparent: false
        })}
      />
    </Stack.Navigator>
  );
}
