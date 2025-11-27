import { useState } from 'react';
import { View, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { AppHeader } from '@/components/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

interface CallLogEntry {
  id: string;
  contactName: string;
  contactId: string;
  callType: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  duration: number;
  timestamp: Date;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

function CallLogItem({ call }: { call: CallLogEntry }) {
  const { theme } = useTheme();
  
  const getDirectionIcon = () => {
    switch (call.direction) {
      case 'incoming':
        return 'phone-incoming';
      case 'outgoing':
        return 'phone-outgoing';
      case 'missed':
        return 'phone-missed';
    }
  };
  
  const getDirectionColor = () => {
    if (call.direction === 'missed') return theme.emergency;
    return theme.textSecondary;
  };

  return (
    <Pressable 
      style={[styles.callItem, { backgroundColor: theme.surface }]}
      onPress={() => {}}
    >
      <View style={styles.callItemLeft}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.avatarText}>
            {call.contactName[0]?.toUpperCase() || '?'}
          </ThemedText>
        </View>
        <View style={styles.callInfo}>
          <ThemedText style={[
            styles.contactName,
            call.direction === 'missed' && { color: theme.emergency }
          ]}>
            {call.contactName}
          </ThemedText>
          <View style={styles.callDetails}>
            <Feather 
              name={getDirectionIcon()} 
              size={14} 
              color={getDirectionColor()} 
            />
            <ThemedText style={[styles.callMeta, { color: theme.textSecondary }]}>
              {call.callType === 'video' ? 'Video' : 'Voice'}
              {call.direction !== 'missed' && ` - ${formatDuration(call.duration)}`}
            </ThemedText>
          </View>
        </View>
      </View>
      <View style={styles.callItemRight}>
        <ThemedText style={[styles.timestamp, { color: theme.textSecondary }]}>
          {formatTimestamp(call.timestamp)}
        </ThemedText>
        <Feather 
          name={call.callType === 'video' ? 'video' : 'phone'} 
          size={20} 
          color={theme.primary} 
        />
      </View>
    </Pressable>
  );
}

export default function CallLogScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [calls] = useState<CallLogEntry[]>([]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
      <AppHeader />
      <ScreenScrollView 
        style={{ backgroundColor: theme.backgroundRoot }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {calls.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="phone" size={64} color={theme.textSecondary} />
            <ThemedText style={styles.emptyText}>No Call History</ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Your voice and video calls will appear here
            </ThemedText>
          </View>
        ) : (
          <View style={styles.callList}>
            {calls.map((call) => (
              <CallLogItem key={call.id} call={call} />
            ))}
          </View>
        )}
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing['5xl'],
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: Spacing.xl,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  callList: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  callItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  callInfo: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
  },
  callDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  callMeta: {
    fontSize: 13,
  },
  callItemRight: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  timestamp: {
    fontSize: 13,
  },
});
