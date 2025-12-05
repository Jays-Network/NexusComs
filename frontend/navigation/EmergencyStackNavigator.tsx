import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import EmergencyListScreen from "@/screens/EmergencyListScreen";

export type EmergencyStackParamList = {
  EmergencyList: undefined;
};

const Stack = createNativeStackNavigator<EmergencyStackParamList>();

export default function EmergencyStackNavigator() {
  const { theme, isDark } = useTheme();
  
  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="EmergencyList"
        component={EmergencyListScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
