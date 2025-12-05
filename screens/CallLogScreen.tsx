import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, RefreshControl, Modal, FlatList, Text, ActivityIndicator, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { AppHeader } from '@/components/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useCometChatAuth } from '@/utils/cometChatAuth';
import { fetchUsers, addUserListener, removeUserListener } from '@/utils/cometChatClient';

interface CallLogEntry {
  id: string;
  contactName: string;
  contactId: string;
  callType: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  duration: number;
  timestamp: Date;
}

interface Contact {
  id: string;
  name: string;
  status?: 'online' | 'offline' | 'away';
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

function ContactSelector({ contact, selected, onToggle, theme }: { contact: Contact; selected: boolean; onToggle: (id: string) => void; theme: any }) {
  return (
    <Pressable
      style={[styles.contactSelectorItem, { backgroundColor: theme.surface }]}
      onPress={() => onToggle(contact.id)}
    >
      <Pressable
        style={[
          styles.checkbox,
          selected && { backgroundColor: theme.primary, borderColor: theme.primary }
        ]}
        onPress={() => onToggle(contact.id)}
      >
        {selected && <Feather name="check" size={14} color="#FFFFFF" />}
      </Pressable>
      <View style={styles.contactSelectorInfo}>
        <ThemedText style={styles.contactSelectorName}>{contact.name}</ThemedText>
        <Text style={[styles.contactSelectorStatus, { color: theme.textSecondary }]}>
          {contact.status === 'online' ? 'Online' : 'Offline'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function CallLogScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, cometChatUser } = useCometChatAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [calls] = useState<CallLogEntry[]>([]);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (showContactSelector) {
      loadContacts();
    }
  }, [showContactSelector]);

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const usersList = await fetchUsers();
      setContacts(usersList);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleContactToggle = useCallback((contactId: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  }, []);

  const handleStartCall = useCallback(() => {
    if (selectedContacts.size === 0) {
      Alert.alert('No contacts selected', 'Please select at least one contact to call.');
      return;
    }

    const selectedList = Array.from(selectedContacts);
    const isGroupCall = selectedList.length > 1;

    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Video calling requires the Expo Go app. Please use the mobile app to make calls.');
    } else {
      const callType = isGroupCall ? `group call with ${selectedList.length} people` : 'call';
      Alert.alert(
        'Start Call',
        `Would you like to start a ${callType}?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setSelectedContacts(new Set()) },
          { 
            text: 'Voice Call', 
            onPress: () => {
              Alert.alert('Coming Soon', 'Voice calling will be available in the next update.');
              setSelectedContacts(new Set());
            }
          },
          { 
            text: 'Video Call', 
            onPress: () => {
              Alert.alert('Coming Soon', 'Video calling will be available in the next update.');
              setSelectedContacts(new Set());
            }
          },
        ]
      );
    }
  }, [selectedContacts]);

  const handleCloseSelector = () => {
    setShowContactSelector(false);
    setSelectedContacts(new Set());
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

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + Spacing.lg }]}
        onPress={() => setShowContactSelector(true)}
      >
        <Feather name="phone" size={28} color="#FFFFFF" />
      </Pressable>

      <Modal
        visible={showContactSelector}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseSelector}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={handleCloseSelector}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
            <ThemedText style={styles.modalTitle}>Select Contacts</ThemedText>
            <Pressable 
              onPress={handleStartCall}
              disabled={selectedContacts.size === 0}
            >
              <ThemedText style={[
                styles.modalDone,
                selectedContacts.size === 0 && { color: theme.textSecondary }
              ]}>
                Call
              </ThemedText>
            </Pressable>
          </View>

          {loadingContacts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={contacts}
              renderItem={({ item }) => (
                <ContactSelector
                  contact={item}
                  selected={selectedContacts.has(item.id)}
                  onToggle={handleContactToggle}
                  theme={theme}
                />
              )}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.contactList}
            />
          )}
        </View>
      </Modal>
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
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4AF37',
  },
  contactSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  contactSelectorInfo: {
    flex: 1,
  },
  contactSelectorName: {
    fontSize: 16,
    fontWeight: '500',
  },
  contactSelectorStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  contactList: {
    paddingVertical: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
