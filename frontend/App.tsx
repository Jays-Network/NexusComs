import "react-native-gesture-handler";
import { useEffect, useCallback } from "react";
import { StyleSheet, View, Text, Alert, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Feather } from "@expo/vector-icons";

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
      
      // Request location permission on first login for tracking
      requestLocationPermission();
    } else {
      console.log('[App.tsx] Stopping Supabase sync (no user)');
      stopSync();
    }
    return () => {
      stopSync();
    };
  }, [user]);

  async function requestLocationPermission() {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const token = await AsyncStorage.getItem('@session_token');
      
      // Guard: Skip backend updates if no auth token available
      if (!token || !user?.id) {
        console.log('[App.tsx] No auth token or user - skipping location tracking update');
        return;
      }

      const updateTrackingStatus = async (enabled: boolean) => {
        try {
          const response = await fetch(`${API_URL}/api/users/${user.id}/location-tracking`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ enabled })
          });
          
          if (!response.ok) {
            console.warn(`[App.tsx] Failed to update tracking: ${response.status}`);
          } else {
            console.log(`[App.tsx] Location tracking ${enabled ? 'enabled' : 'disabled'} successfully`);
          }
        } catch (err) {
          console.warn('[App.tsx] Could not update location tracking:', err);
        }
      };
      
      if (existingStatus !== 'granted') {
        console.log('[App.tsx] Requesting location permission...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status === 'granted') {
          console.log('[App.tsx] Location permission granted');
          await updateTrackingStatus(true);
        } else {
          console.log('[App.tsx] Location permission denied');
          await updateTrackingStatus(false);
        }
      } else {
        console.log('[App.tsx] Location permission already granted');
        await updateTrackingStatus(true);
      }
    } catch (error) {
      console.error('[App.tsx] Error requesting location permission:', error);
    }
  }

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
  
  const [fontsLoaded, fontError] = useFonts({
    ...Feather.font,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      console.log('[App.tsx] Fonts loaded:', fontsLoaded, 'Error:', fontError);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    console.log('[App.tsx] Waiting for fonts to load...');
    return null;
  }
  
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SettingsProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={styles.root} onLayout={onLayoutRootView}>
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
