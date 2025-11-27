import { useState, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChannelList } from 'stream-chat-expo';
import { Channel } from 'stream-chat';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useStreamAuth } from '@/utils/streamAuth';
import { GroupsStackParamList } from '@/navigation/GroupsStackNavigator';
import { AppHeader } from '@/components/AppHeader';
import { fetchGroups, Group } from '@/utils/streamApi';
import { Spacing, BorderRadius } from '@/constants/theme';

type NavigationProp = NativeStackNavigationProp<GroupsStackParamList>;

interface HierarchicalGroup extends Group {
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

const EmptyChannelList = () => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyContainer}>
      <Feather name="message-circle" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No conversations yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Your group chats will appear here
      </Text>
    </View>
  );
};

const LoadingErrorIndicator = () => {
  const { theme } = useTheme();
  const { logout } = useStreamAuth();
  
  const handleRetry = async () => {
    try {
      await logout();
    } catch (error) {
      console.warn('Logout error:', error);
    }
  };
  
  return (
    <View style={styles.emptyContainer}>
      <Feather name="alert-circle" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No channels available
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        You are not a member of any channels yet. Contact your administrator to be added to a group.
      </Text>
      <Pressable 
        style={[styles.retryButton, { backgroundColor: theme.primary }]}
        onPress={handleRetry}
      >
        <Text style={[styles.retryButtonText, { color: theme.buttonText }]}>
          Log Out and Try Again
        </Text>
      </Pressable>
    </View>
  );
};

export default function GroupListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user, authToken } = useStreamAuth();
  const insets = useSafeAreaInsets();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showGroupTree, setShowGroupTree] = useState(true);

  const loadGroups = async () => {
    if (!authToken) {
      setIsLoadingGroups(false);
      return;
    }
    
    try {
      const fetchedGroups = await fetchGroups(authToken);
      setGroups(fetchedGroups);
    } catch (error) {
      console.warn('Failed to fetch groups:', error);
    } finally {
      setIsLoadingGroups(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [authToken])
  );

  // Auto-expand top-level groups on first load
  useFocusEffect(
    useCallback(() => {
      if (groups.length > 0 && expandedGroups.size === 0) {
        const topLevelIds = groups
          .filter(g => !g.parent_group_id)
          .map(g => g.id);
        setExpandedGroups(new Set(topLevelIds));
      }
    }, [groups])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadGroups();
  };

  const buildHierarchicalList = (): HierarchicalGroup[] => {
    const result: HierarchicalGroup[] = [];
    
    const hasChildren = (groupId: number) => groups.some(g => g.parent_group_id === groupId);
    
    const addGroup = (group: Group, level: number) => {
      const isExpanded = expandedGroups.has(group.id);
      result.push({
        ...group,
        level,
        hasChildren: hasChildren(group.id),
        isExpanded,
      });
      
      if (isExpanded) {
        const children = groups.filter(g => g.parent_group_id === group.id);
        children.forEach(child => addGroup(child, level + 1));
      }
    };
    
    const mainGroups = groups.filter(g => !g.parent_group_id);
    mainGroups.forEach(g => addGroup(g, 0));
    
    return result;
  };

  const toggleExpand = (groupId: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleGroupPress = (group: HierarchicalGroup) => {
    if (group.hasChildren) {
      toggleExpand(group.id);
    } else if (group.stream_channel_id) {
      setSelectedGroup(group);
      setShowGroupTree(false);
    } else {
      setSelectedGroup(group);
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    const channelId = channel.id ?? channel.cid ?? '';
    const channelName = (channel.data as { name?: string })?.name || 'Chat';
    
    navigation.navigate('GroupChatRoom', {
      channelId,
      channelName,
    });
  };

  const clearGroupFilter = () => {
    setSelectedGroup(null);
  };

  const renderGroupItem = ({ item }: { item: HierarchicalGroup }) => {
    const isSelected = selectedGroup?.id === item.id;
    
    return (
      <Pressable
        onPress={() => handleGroupPress(item)}
        style={[
          styles.groupItem,
          { 
            backgroundColor: isSelected ? theme.primary + '20' : theme.surface,
            borderLeftColor: isSelected ? theme.primary : 'transparent',
            marginLeft: Spacing.md + (item.level * 16),
          }
        ]}
      >
        <View style={styles.groupItemContent}>
          {item.hasChildren ? (
            <Pressable onPress={() => toggleExpand(item.id)} style={styles.expandButton}>
              <Feather 
                name={item.isExpanded ? "chevron-down" : "chevron-right"} 
                size={20} 
                color={theme.textSecondary} 
              />
            </Pressable>
          ) : (
            <View style={styles.expandPlaceholder} />
          )}
          
          <View style={[styles.groupIcon, { backgroundColor: theme.primary + '30' }]}>
            <Feather 
              name={item.hasChildren ? "folder" : "users"} 
              size={18} 
              color={theme.primary} 
            />
          </View>
          
          <View style={styles.groupInfo}>
            <Text style={[styles.groupName, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.description ? (
              <Text style={[styles.groupDescription, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </View>
          
          {item.member_count !== undefined && item.member_count > 0 ? (
            <View style={[styles.memberBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <Feather name="user" size={12} color={theme.textSecondary} />
              <Text style={[styles.memberCount, { color: theme.textSecondary }]}>
                {item.member_count}
              </Text>
            </View>
          ) : null}
          
          {!item.hasChildren ? (
            <Feather name="message-circle" size={16} color={theme.textSecondary} />
          ) : null}
        </View>
      </Pressable>
    );
  };

  if (!user) {
    return null;
  }

  const hierarchicalGroups = buildHierarchicalList();
  const hasGroups = groups.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
      <AppHeader />
      
      <View style={[styles.filterBar, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => setShowGroupTree(!showGroupTree)}
          style={[styles.filterButton, { backgroundColor: theme.surface }]}
        >
          <Feather name="layers" size={16} color={theme.primary} />
          <Text style={[styles.filterText, { color: theme.text }]} numberOfLines={1}>
            {selectedGroup ? selectedGroup.name : 'All Groups'}
          </Text>
          <Feather 
            name={showGroupTree ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={theme.textSecondary} 
          />
        </Pressable>
        
        {selectedGroup ? (
          <Pressable 
            onPress={clearGroupFilter}
            style={[styles.clearFilterButton, { backgroundColor: theme.surface }]}
          >
            <Feather name="x" size={16} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      
      {showGroupTree ? (
        <View style={[styles.groupTreeContainer, { backgroundColor: theme.backgroundRoot }]}>
          {isLoadingGroups ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Loading groups...
              </Text>
            </View>
          ) : hierarchicalGroups.length === 0 ? (
            <View style={styles.emptyGroupsContainer}>
              <Feather name="users" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyGroupsTitle, { color: theme.text }]}>
                No groups available
              </Text>
              <Text style={[styles.emptyGroupsSubtitle, { color: theme.textSecondary }]}>
                Contact your administrator to be added to a group
              </Text>
            </View>
          ) : (
            <FlatList
              data={hierarchicalGroups}
              keyExtractor={item => item.id.toString()}
              renderItem={renderGroupItem}
              contentContainerStyle={styles.groupListContent}
              style={styles.groupTree}
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
      ) : (
        <ChannelList
          filters={{
            members: { $in: [user.id] },
            ...(selectedGroup?.stream_channel_id ? { id: selectedGroup.stream_channel_id } : {}),
          }}
          sort={{ last_message_at: -1 }}
          onSelect={handleChannelSelect}
          EmptyStateIndicator={EmptyChannelList}
          LoadingErrorIndicator={LoadingErrorIndicator}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  filterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  clearFilterButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  groupTreeContainer: {
    flex: 1,
  },
  groupTree: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  emptyGroupsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyGroupsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptyGroupsSubtitle: {
    fontSize: 14,
    marginTop: Spacing.sm,
    textAlign: 'center',
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
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  groupListContent: {
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.md,
  },
  groupItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
  },
  groupItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandButton: {
    padding: 4,
    marginRight: 4,
  },
  expandPlaceholder: {
    width: 28,
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '500',
  },
  groupDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: Spacing.sm,
  },
  memberCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeTreeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  closeTreeText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
