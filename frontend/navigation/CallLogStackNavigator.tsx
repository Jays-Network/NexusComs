import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import CallLogScreen from "@/screens/CallLogScreen";

export type CallLogStackParamList = {
  CallLog: undefined;
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
    </Stack.Navigator>
  );
}
