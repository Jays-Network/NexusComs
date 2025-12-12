import "react-native-gesture-handler";
import React, { useEffect, useCallback, useState, createRef } from "react";
import { StyleSheet, View, Text, Alert, Platform } from "react-native";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Feather } from "@expo/vector-icons";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import LoginScreen from "@/screens/LoginScreen";
import CallScreen from "@/screens/CallScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CometChatAuthProvider, useCometChatAuth } from "@/utils/cometChatAuth";
import { SupabaseSyncProvider, useSupabaseSync } from "@/utils/supabaseSync";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import EmergencyModal from "@/components/EmergencyModal";
import { useTheme } from "@/hooks/useTheme";
import { startLocationTracking, stopLocationTracking } from "@/utils/locationTracker";
import { addCallListener, removeCallListener, rejectCall } from "@/utils/cometChatClient";
import { registerPushToken } from "@/utils/cometChatApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const navigationRef = createRef<NavigationContainerRef<any>>();

function AppContent() {
  const { user, cometChatUser, isLoading, isInitialized } = useCometChatAuth();
  const { startSync, stopSync } = useSupabaseSync();
  const { theme } = useTheme();
  const [incomingCall, setIncomingCall] = useState<any>(null);

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
    if (!isInitialized || !cometChatUser) return;

    const listenerId = 'app_global_call_listener';
    console.log('[App.tsx] Setting up global call listener');

    addCallListener(listenerId, {
      onIncomingCallReceived: (call: any) => {
        console.log('[App.tsx] Incoming call received!');
        const callerName = call.getSender?.()?.getName?.() || call.callInitiator?.name || 'Unknown';
        const callType = call.getType?.() === 'video' ? 'video' : 'audio';
        const sessionId = call.getSessionId?.();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        if (Platform.OS === 'web') {
          const accept = window.confirm(`Incoming ${callType} call from ${callerName}. Accept?`);
          if (accept && navigationRef.current) {
            navigationRef.current.navigate('CallScreen', {
              contactId: call.getSender?.()?.getUid?.() || call.callInitiator?.uid || '',
              contactName: callerName,
              callType: callType,
              isIncoming: true,
              sessionId: sessionId,
            });
          } else if (sessionId) {
            rejectCall(sessionId, 'rejected');
          }
        } else {
          Alert.alert(
            `Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call`,
            `${callerName} is calling you`,
            [
              {
                text: 'Decline',
                style: 'destructive',
                onPress: () => {
                  if (sessionId) rejectCall(sessionId, 'rejected');
                },
              },
              {
                text: 'Accept',
                onPress: () => {
                  if (navigationRef.current) {
                    navigationRef.current.navigate('CallScreen', {
                      contactId: call.getSender?.()?.getUid?.() || call.callInitiator?.uid || '',
                      contactName: callerName,
                      callType: callType,
                      isIncoming: true,
                      sessionId: sessionId,
                    });
                  }
                },
              },
            ],
            { cancelable: false }
          );
        }
      },
      onIncomingCallCancelled: (call: any) => {
        console.log('[App.tsx] Incoming call cancelled');
        setIncomingCall(null);
      },
    });

    return () => {
      removeCallListener(listenerId);
    };
  }, [isInitialized, cometChatUser]);

  useEffect(() => {
    if (user && user.id) {
      console.log('[App.tsx] Starting Supabase sync for user:', user.id);
      startSync(user.id);
      
      // Request location permission on first login for tracking
      requestLocationPermission();
      
      // Register push notification token for emergency alerts
      registerPushNotificationToken();
    } else {
      console.log('[App.tsx] Stopping Supabase sync and location tracking (no user)');
      stopSync();
      stopLocationTracking();
    }
    return () => {
      stopSync();
      stopLocationTracking();
    };
  }, [user]);

  useEffect(() => {
    const notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[App.tsx] Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      
      if (data?.type === 'emergency' && data?.emergency_group_id) {
        console.log('[App.tsx] Opening emergency group chat:', data.emergency_group_id);
        
        if (navigationRef.current) {
          navigationRef.current.navigate('Main', {
            screen: 'ChatsTab',
            params: {
              screen: 'ChatRoom',
              params: {
                channelId: data.emergency_group_id,
                channelName: data.sender_name ? `Emergency: ${data.sender_name}` : 'Emergency Alert',
                isDirectChat: false,
              },
            },
          });
        }
      }
    });

    return () => {
      notificationResponseSubscription.remove();
    };
  }, []);

  async function registerPushNotificationToken() {
    try {
      // Skip on web - push tokens are mobile only
      if (Platform.OS === 'web') {
        console.log('[App.tsx] Skipping push token registration on web');
        return;
      }

      console.log('[App.tsx] Registering push notification token...');
      
      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('[App.tsx] Push notification permission denied');
        return;
      }
      
      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      });
      const pushToken = tokenData.data;
      
      console.log('[App.tsx] Got push token:', pushToken);
      
      // Get auth token and register with backend (uses @session_token key)
      const authToken = await AsyncStorage.getItem('@session_token');
      if (authToken && pushToken) {
        try {
          await registerPushToken(authToken, pushToken);
          console.log('[App.tsx] Push token registered with backend');
        } catch (err) {
          console.warn('[App.tsx] Failed to register push token with backend:', err);
        }
      } else {
        console.log('[App.tsx] No auth token available for push token registration');
      }
    } catch (error) {
      console.error('[App.tsx] Error registering push token:', error);
    }
  }

  async function requestLocationPermission() {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
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
            
            // Start or stop the 5-minute interval location tracker
            if (enabled) {
              startLocationTracking(user.id);
            } else {
              stopLocationTracking();
            }
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
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen 
          name="CallScreen" 
          component={CallScreen}
          options={{ 
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />
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
