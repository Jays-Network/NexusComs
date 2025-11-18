import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getCommonScreenOptions } from "./screenOptions";
import EmergencyListScreen from "@/screens/EmergencyListScreen";

export type EmergencyStackParamList = {
  EmergencyList: undefined;
};

const Stack = createNativeStackNavigator<EmergencyStackParamList>();

export default function EmergencyStackNavigator() {
  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions}>
      <Stack.Screen
        name="EmergencyList"
        component={EmergencyListScreen}
        options={{ 
          title: "EMERGENCY",
          headerTintColor: '#DC2626'
        }}
      />
    </Stack.Navigator>
  );
}
