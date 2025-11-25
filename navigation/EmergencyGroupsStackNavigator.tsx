import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EmergencyGroupsScreen from '@/screens/EmergencyGroupsScreen';
import ChatRoomScreen from '@/screens/ChatRoomScreen';
import { useTheme } from '@/hooks/useTheme';

export type EmergencyGroupsStackParamList = {
  EmergencyGroups: undefined;
  ChatRoom: {
    channelId: string;
    channelName: string;
  };
};

const Stack = createNativeStackNavigator<EmergencyGroupsStackParamList>();

export default function EmergencyGroupsStackNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.backgroundRoot,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
          color: theme.text,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="EmergencyGroups"
        component={EmergencyGroupsScreen}
        options={{
          title: 'Emergency Groups',
        }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
