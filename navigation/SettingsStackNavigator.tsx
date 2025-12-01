import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import SettingsScreen from "@/screens/SettingsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import AboutScreen from "@/screens/AboutScreen";
import AppearanceScreen from "@/screens/AppearanceScreen";
import ChatSettingsScreen from "@/screens/ChatSettingsScreen";
import SystemSettingsScreen from "@/screens/SystemSettingsScreen";

export type SettingsStackParamList = {
  Settings: undefined;
  Profile: undefined;
  Notifications: undefined;
  About: undefined;
  Appearance: undefined;
  ChatSettings: undefined;
  SystemSettings: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  const { theme, isDark } = useTheme();
  
  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ 
          title: 'Notifications',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ 
          title: 'About',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="Appearance"
        component={AppearanceScreen}
        options={{ 
          title: 'Appearance',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="ChatSettings"
        component={ChatSettingsScreen}
        options={{ 
          title: 'Chats',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="SystemSettings"
        component={SystemSettingsScreen}
        options={{ 
          title: 'System',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}
