import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ContactListScreen from '@/screens/ContactListScreen';
import { useTheme } from '@/hooks/useTheme';
import { getCommonScreenOptions } from './screenOptions';

export type ContactsStackParamList = {
  ContactList: undefined;
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
    </Stack.Navigator>
  );
}
