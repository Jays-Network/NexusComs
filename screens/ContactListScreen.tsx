import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useCometChatAuth } from '@/utils/cometChatAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { fetchUsers, addUserListener, removeUserListener } from '@/utils/cometChatClient';
import { Spacing } from '@/constants/theme';

interface Contact {
  id: string;
  name: string;
  status?: 'online' | 'offline' | 'away';
  avatar?: string;
}

const EmptyStateView = () => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyContainer}>
      <Feather name="users" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No contacts yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        When other team members log in, they will appear here
      </Text>
    </View>
  );
};

const ContactItem = ({ contact, theme }: { contact: Contact; theme: any }) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return '#34C759';
      case 'away':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  return (
    <Pressable
      style={[styles.contactItem, { backgroundColor: theme.card }]}
      onPress={() => {}}
    >
      <View style={styles.contactContent}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.primary },
          ]}
        >
          <Text style={[styles.avatarText, { color: theme.buttonText }]}>
            {contact.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: theme.text }]}>
            {contact.name}
          </Text>
          <Text style={[styles.contactStatus, { color: theme.textSecondary }]}>
            {contact.status === 'online' ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.statusIndicator,
          { backgroundColor: getStatusColor(contact.status) },
        ]}
      />
    </Pressable>
  );
};

export default function ContactListScreen() {
  const { theme } = useTheme();
  const { user, cometChatUser, isInitialized } = useCometChatAuth();
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transformUser = useCallback((cometChatUserData: any): Contact => {
    return {
      id: cometChatUserData.getUid?.() || cometChatUserData.uid || '',
      name: cometChatUserData.getName?.() || cometChatUserData.name || 'Unknown',
      status: cometChatUserData.getStatus?.() === 'online' ? 'online' : 'offline',
      avatar: cometChatUserData.getAvatar?.() || cometChatUserData.avatar,
    };
  }, []);

  const loadContacts = useCallback(async () => {
    if (!isInitialized || !cometChatUser) {
      console.log('[ContactList] Waiting for CometChat initialization', { isInitialized, hasCometChatUser: !!cometChatUser });
      return;
    }

    try {
      setError(null);
      const currentUserId = cometChatUser.getUid?.() || cometChatUser.uid;
      console.log('[ContactList] Fetching users from CometChat (current user:', currentUserId, ')...');
      
      const users = await fetchUsers(50);
      console.log('[ContactList] Raw users from CometChat:', users.length);
      
      const filteredUsers = users.filter((u: any) => {
        const uid = u.getUid?.() || u.uid;
        return uid !== currentUserId;
      });
      
      const transformedContacts = filteredUsers.map(transformUser);
      console.log('[ContactList] Loaded contacts (excluding self):', transformedContacts.length);
      
      if (transformedContacts.length === 0) {
        console.log('[ContactList] No other users found. Other team members need to log in to appear here.');
      }
      
      setContacts(transformedContacts);
    } catch (err: any) {
      console.error('[ContactList] Error loading contacts:', err);
      setError(err.message || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isInitialized, cometChatUser, transformUser]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (!isInitialized || !cometChatUser) return;

    const listenerId = 'contact_list_listener';
    
    addUserListener(listenerId, {
      onUserOnline: (onlineUser: any) => {
        setContacts(prev => prev.map(contact => {
          const uid = onlineUser.getUid?.() || onlineUser.uid;
          if (contact.id === uid) {
            return { ...contact, status: 'online' };
          }
          return contact;
        }));
      },
      onUserOffline: (offlineUser: any) => {
        setContacts(prev => prev.map(contact => {
          const uid = offlineUser.getUid?.() || offlineUser.uid;
          if (contact.id === uid) {
            return { ...contact, status: 'offline' };
          }
          return contact;
        }));
      },
    });

    return () => {
      removeUserListener(listenerId);
    };
  }, [isInitialized, cometChatUser]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadContacts();
  }, [loadContacts]);

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top,
          },
        ]}
      >
        <AppHeader />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading contacts...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 80,
          },
        ]}
      >
        <AppHeader />
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <Text style={[styles.errorTitle, { color: theme.text }]}>
            Unable to load contacts
          </Text>
          <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>
            {error}
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadContacts}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 80,
        },
      ]}
    >
      <AppHeader />
      {contacts.length === 0 ? (
        <EmptyStateView />
      ) : (
        <FlatList
          data={contacts}
          renderItem={({ item }) => (
            <ContactItem contact={item} theme={theme} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
  },
  contactStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
