import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ContactListScreen from '@/screens/ContactListScreen';
import CallScreen from '@/screens/CallScreen';
import { useTheme } from '@/hooks/useTheme';
import { getCommonScreenOptions } from './screenOptions';

export type ContactsStackParamList = {
  ContactList: undefined;
  CallScreen: {
    contactId: string;
    contactName: string;
    callType: 'audio' | 'video';
    isIncoming?: boolean;
    sessionId?: string;
    isGroupCall?: boolean;
  };
};

const Stack = createNativeStackNavigator<ContactsStackParamList>();

export default function ContactsStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="ContactList"
        component={ContactListScreen}
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
