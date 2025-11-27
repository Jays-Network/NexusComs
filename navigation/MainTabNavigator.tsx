import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import ChatsStackNavigator from "@/navigation/ChatsStackNavigator";
import EmergencyStackNavigator from "@/navigation/EmergencyStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import ContactsStackNavigator from "@/navigation/ContactsStackNavigator";
import CallLogStackNavigator from "@/navigation/CallLogStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";

export type MainTabParamList = {
  ChatsTab: undefined;
  AlertsTab: undefined;
  ContactsTab: undefined;
  CallLogTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="ChatsTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="ChatsTab"
        component={ChatsStackNavigator}
        options={{
          title: "Chats",
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AlertsTab"
        component={EmergencyStackNavigator}
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => (
            <Feather name="alert-octagon" size={size} color={color} />
          ),
          tabBarActiveTintColor: Colors.light.emergency,
        }}
      />
      <Tab.Screen
        name="ContactsTab"
        component={ContactsStackNavigator}
        options={{
          title: "Contacts",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CallLogTab"
        component={CallLogStackNavigator}
        options={{
          title: "Calls",
          tabBarIcon: ({ color, size }) => (
            <Feather name="phone" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}
