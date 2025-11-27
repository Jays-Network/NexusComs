import { View, StyleSheet, Text, FlatList, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useStreamAuth } from '@/utils/streamAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';

interface Contact {
  id: string;
  name: string;
  status?: 'online' | 'offline' | 'away';
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
        Your contacts will appear here
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
  const { user } = useStreamAuth();
  const insets = useSafeAreaInsets();

  // Mock contacts data - replace with Stream API call
  const contacts: Contact[] = [];

  if (!user) {
    return null;
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
