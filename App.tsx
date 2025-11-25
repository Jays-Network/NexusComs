import "react-native-gesture-handler";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Chat, OverlayProvider } from "stream-chat-expo";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import LoginScreen from "@/screens/LoginScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StreamAuthProvider, useStreamAuth } from "@/utils/streamAuth";
import { SupabaseSyncProvider, useSupabaseSync } from "@/utils/supabaseSync";
import EmergencyModal from "@/components/EmergencyModal";
import { useTheme } from "@/hooks/useTheme";

SplashScreen.preventAutoHideAsync();

// Configure notifications
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
  const { user, chatClient, isLoading } = useStreamAuth();
  const { startSync, stopSync } = useSupabaseSync();
  const { theme } = useTheme();

  useEffect(() => {
    console.log('📱 [App.tsx] AppContent state change:');
    console.log('  - isLoading:', isLoading);
    console.log('  - user:', user ? `${user.name} (${user.id})` : null);
    console.log('  - chatClient:', !!chatClient);
    console.log('  - theme:', !!theme);

    if (!isLoading) {
      console.log('🎬 Hiding splash screen...');
      SplashScreen.hideAsync();
    }
  }, [isLoading, user, chatClient, theme]);

  useEffect(() => {
    if (user && user.id) {
      console.log('🔄 [App.tsx] Starting Supabase sync for user:', user.id);
      startSync(user.id);
    } else {
      console.log('🔄 [App.tsx] Stopping Supabase sync (no user)');
      stopSync();
    }
    return () => {
      stopSync();
    };
  }, [user]);

  if (isLoading || !theme) {
    console.log('⏳ Loading... isLoading:', isLoading, 'theme:', !!theme);
    return null;
  }

  // Show login screen if no user
  if (!user) {
    console.log('📝 No user - showing login screen');
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    );
  }

  // If no chat client, show error (this should not happen if user is logged in)
  if (!chatClient) {
    console.log('⚠️ User logged in but no chat client - showing login screen');
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    );
  }

  // Show main app with Stream Chat provider
  console.log('✅ Rendering main app for user:', user.name);
  return (
    <OverlayProvider
      value={{
        style: {
          colors: {
            background: theme.backgroundRoot,
          },
        },
      }}
    >
      <Chat client={chatClient}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={MainTabNavigator} />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
        <EmergencyModal />
      </Chat>
    </OverlayProvider>
  );
}

export default function App() {
  console.log('🚀 App.tsx: Application starting...');
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <SupabaseSyncProvider>
              <StreamAuthProvider>
                <AppContent />
              </StreamAuthProvider>
            </SupabaseSyncProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
