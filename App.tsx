import "react-native-gesture-handler";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import LoginScreen from "@/screens/LoginScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CometChatAuthProvider, useCometChatAuth } from "@/utils/cometChatAuth";
import { SupabaseSyncProvider, useSupabaseSync } from "@/utils/supabaseSync";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import EmergencyModal from "@/components/EmergencyModal";
import { useTheme } from "@/hooks/useTheme";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const Stack = createNativeStackNavigator();

function AppContent() {
  const { user, cometChatUser, isLoading, isInitialized } = useCometChatAuth();
  const { startSync, stopSync } = useSupabaseSync();
  const { theme } = useTheme();

  useEffect(() => {
    console.log('[App.tsx] AppContent state change:');
    console.log('  - isLoading:', isLoading);
    console.log('  - user:', user ? `${user.name} (${user.id})` : null);
    console.log('  - cometChatUser:', !!cometChatUser);
    console.log('  - isInitialized:', isInitialized);
    console.log('  - theme:', !!theme);

    if (!isLoading) {
      console.log('Hiding splash screen...');
      SplashScreen.hideAsync();
    }
  }, [isLoading, user, cometChatUser, isInitialized, theme]);

  useEffect(() => {
    if (user && user.id) {
      console.log('[App.tsx] Starting Supabase sync for user:', user.id);
      startSync(user.id);
    } else {
      console.log('[App.tsx] Stopping Supabase sync (no user)');
      stopSync();
    }
    return () => {
      stopSync();
    };
  }, [user]);

  if (isLoading || !theme) {
    console.log('Loading... isLoading:', isLoading, 'theme:', !!theme);
    return null;
  }

  if (!user) {
    console.log('No user - showing login screen');
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    );
  }

  console.log('Rendering main app for user:', user.name);
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabNavigator} />
      </Stack.Navigator>
      <StatusBar style="auto" />
      <EmergencyModal />
    </NavigationContainer>
  );
}

export default function App() {
  console.log('[App.tsx] Application starting...');
  
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SettingsProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={styles.root}>
              <KeyboardProvider>
                <SupabaseSyncProvider>
                  <CometChatAuthProvider>
                    <AppContent />
                  </CometChatAuthProvider>
                </SupabaseSyncProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </SettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
