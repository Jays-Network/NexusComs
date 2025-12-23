import { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { AppHeader } from '@/components/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useCometChatAuth } from '@/utils/cometChatAuth';
import { getActiveEmergencies } from '@/utils/cometChatApi';

interface EmergencyAlert {
  id: number;
  name: string;
  description: string;
  cometchat_guid: string;
  source_group_id?: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
  users?: {
    username: string;
    email: string;
  };
}

interface EmergencyCardProps {
  alert: EmergencyAlert;
  onPress: () => void;
}

function EmergencyCard({ alert, onPress }: EmergencyCardProps) {
  const { theme } = useTheme();
  const senderName = alert.users?.username || alert.users?.email || 'Unknown';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.messageCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.emergency,
          borderWidth: 2,
          opacity: pressed ? 0.8 : 1,
        }
      ]}
    >
      <View style={styles.messageHeader}>
        <Feather
          name="alert-octagon"
          size={24}
          color={theme.emergency}
        />
        <ThemedText style={[styles.senderName, { color: theme.emergency }]}>
          {senderName}
        </ThemedText>
        <View style={{ flex: 1 }} />
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </View>

      <ThemedText style={styles.messageContent}>
        {alert.description || 'Emergency alert'}
      </ThemedText>

      <ThemedText style={[styles.groupName, { color: theme.textSecondary }]}>
        Group: {alert.name}
      </ThemedText>

      <View style={styles.cardFooter}>
        <ThemedText style={styles.timestamp}>
          {alert.created_at ? new Date(alert.created_at).toLocaleString() : ''}
        </ThemedText>
        <ThemedText style={[styles.tapHint, { color: theme.primary }]}>
          Tap to open chat
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function EmergencyListScreen() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const { cometChatUser, isInitialized } = useCometChatAuth();
  const navigation = useNavigation<any>();

  const handleEmergencyCardPress = useCallback((alert: EmergencyAlert) => {
    console.log('[EmergencyList] Card pressed:', alert);
    
    if (alert.cometchat_guid) {
      navigation.dispatch(
        CommonActions.navigate({
          name: 'ChatsTab',
          params: {
            screen: 'ChatRoom',
            params: {
              channelId: alert.cometchat_guid,
              channelName: alert.name,
              isDirectChat: false,
            },
          },
        })
      );
    }
  }, [navigation]);

  const loadEmergencyAlerts = useCallback(async () => {
    if (!isInitialized || !cometChatUser) {
      console.log('[EmergencyList] Not initialized or no user');
      setIsLoading(false);
      return;
    }

    console.log('[EmergencyList] Loading emergency alerts from backend...');
    
    try {
      const authToken = await AsyncStorage.getItem('@session_token');
      
      if (!authToken) {
        console.log('[EmergencyList] No auth token');
        setIsLoading(false);
        return;
      }

      const response = await getActiveEmergencies(authToken);
      console.log('[EmergencyList] Fetched', response.emergencies?.length || 0, 'emergency alerts');
      
      setAlerts(response.emergencies || []);
    } catch (error) {
      console.error('[EmergencyList] Load emergency alerts error:', error);
      setAlerts([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isInitialized, cometChatUser]);

  useFocusEffect(
    useCallback(() => {
      loadEmergencyAlerts();
    }, [loadEmergencyAlerts])
  );

  function handleRefresh() {
    setRefreshing(true);
    loadEmergencyAlerts();
  }

  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
        <AppHeader />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading alerts...
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <ScreenScrollView
      style={{ backgroundColor: theme.backgroundRoot }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      <AppHeader />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Feather name="alert-octagon" size={24} color={theme.emergency} />
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Emergency Alerts
          </ThemedText>
        </View>

        {alerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="check-circle" size={48} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No active emergency alerts
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Emergency alerts will appear here when triggered
            </ThemedText>
          </View>
        ) : (
          <View style={styles.alertsList}>
            {alerts.map((alert) => (
              <EmergencyCard
                key={alert.id}
                alert={alert}
                onPress={() => handleEmergencyCardPress(alert)}
              />
            ))}
          </View>
        )}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 16,
    marginTop: Spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  alertsList: {
    gap: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  messageCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  groupName: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.7,
  },
  tapHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
