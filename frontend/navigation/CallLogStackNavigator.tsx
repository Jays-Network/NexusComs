import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import CallLogScreen from "@/screens/CallLogScreen";
import CallScreen from "@/screens/CallScreen";

export type CallLogStackParamList = {
  CallLog: undefined;
  CallScreen: {
    contactId: string;
    contactName: string;
    callType: 'audio' | 'video';
    isIncoming?: boolean;
    sessionId?: string;
    isGroupCall?: boolean;
  };
};

const Stack = createNativeStackNavigator<CallLogStackParamList>();

export default function CallLogStackNavigator() {
  const { theme, isDark } = useTheme();
  
  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="CallLog"
        component={CallLogScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CallScreen"
        component={CallScreen}
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}
