import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ContactListScreen from '@/screens/ContactListScreen';
import { useTheme } from '@/hooks/useTheme';

export type ContactsStackParamList = {
  ContactList: undefined;
};

const Stack = createNativeStackNavigator<ContactsStackParamList>();

export default function ContactsStackNavigator() {
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
        name="ContactList"
        component={ContactListScreen}
        options={{
          title: 'Contacts',
        }}
      />
    </Stack.Navigator>
  );
}
