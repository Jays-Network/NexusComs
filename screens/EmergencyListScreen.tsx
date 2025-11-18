import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/utils/auth';
import { decryptMessage } from '@/utils/socket';

interface EmergencyMessage {
  id: string;
  subgroupId: string;
  senderId: string;
  encryptedContent: string;
  createdAt: string;
  users: {
    displayName: string;
  };
  emergency_acknowledgments: Array<{
    userId: string;
    acknowledgedAt: string;
  }>;
}

export default function EmergencyListScreen() {
  const [messages, setMessages] = useState<EmergencyMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useTheme();
  const { token, user } = useAuth();

  useEffect(() => {
    loadEmergencyMessages();
  }, []);

  async function loadEmergencyMessages() {
    try {
      // For demo, we'll show a sample structure
      // In production, this would fetch from all subgroups the user is part of
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      
      // This is a simplified version - in production, fetch from multiple subgroups
      setMessages([]);
    } catch (error) {
      console.error('Load emergency messages error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function acknowledgeMessage(messageId: string) {
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/emergency/${messageId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Update local state
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              emergency_acknowledgments: [
                ...msg.emergency_acknowledgments,
                { userId: user?.id || '', acknowledgedAt: new Date().toISOString() }
              ]
            };
          }
          return msg;
        }));
      }
    } catch (error) {
      console.error('Acknowledge error:', error);
      Alert.alert('Error', 'Failed to acknowledge message');
    }
  }

  function isAcknowledged(message: EmergencyMessage): boolean {
    return message.emergency_acknowledgments.some(ack => ack.userId === user?.id);
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.emergency} />
      </View>
    );
  }

  return (
    <ScreenScrollView style={{ backgroundColor: colors.backgroundRoot }}>
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="alert-octagon" size={64} color={colors.emergency} />
          <ThemedText style={styles.emptyText}>No Emergency Alerts</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Emergency alerts from your groups will appear here
          </ThemedText>
        </View>
      ) : (
        <View style={styles.messagesContainer}>
          {messages.map((message) => {
            const acknowledged = isAcknowledged(message);
            const decryptedContent = decryptMessage(message.encryptedContent);

            return (
              <View
                key={message.id}
                style={[
                  styles.messageCard,
                  {
                    backgroundColor: acknowledged ? colors.surface : Colors.light.emergencyLight,
                    borderColor: colors.emergency,
                    borderWidth: acknowledged ? 0 : 2
                  }
                ]}
              >
                <View style={styles.messageHeader}>
                  <Feather
                    name="alert-octagon"
                    size={24}
                    color={colors.emergency}
                  />
                  <ThemedText style={[styles.senderName, { color: colors.emergency }]}>
                    {message.users.displayName}
                  </ThemedText>
                </View>

                <ThemedText style={styles.messageContent}>
                  {decryptedContent}
                </ThemedText>

                <ThemedText style={styles.timestamp}>
                  {new Date(message.createdAt).toLocaleString()}
                </ThemedText>

                {!acknowledged ? (
                  <Pressable
                    onPress={() => acknowledgeMessage(message.id)}
                    style={[styles.acknowledgeButton, { backgroundColor: colors.emergency }]}
                  >
                    <ThemedText style={styles.acknowledgeButtonText}>
                      Acknowledge
                    </ThemedText>
                  </Pressable>
                ) : (
                  <View style={[styles.acknowledgedBadge, { backgroundColor: colors.success }]}>
                    <Feather name="check" size={16} color="#FFFFFF" />
                    <ThemedText style={styles.acknowledgedText}>Acknowledged</ThemedText>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing['5xl']
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: Spacing.xl,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 15,
    opacity: 0.6,
    marginTop: Spacing.sm,
    textAlign: 'center'
  },
  messagesContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg
  },
  messageCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  senderName: {
    fontSize: 16,
    fontWeight: '700'
  },
  messageContent: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500'
  },
  timestamp: {
    fontSize: 13,
    opacity: 0.6
  },
  acknowledgeButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.sm
  },
  acknowledgeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  acknowledgedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs
  },
  acknowledgedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  }
});
