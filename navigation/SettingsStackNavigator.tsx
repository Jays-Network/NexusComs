import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getCommonScreenOptions } from "./screenOptions";
import SettingsScreen from "@/screens/SettingsScreen";

export type SettingsStackParamList = {
  Settings: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions}>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </Stack.Navigator>
  );
}
