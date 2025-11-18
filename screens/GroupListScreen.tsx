import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/utils/auth';
import { ChatsStackParamList } from '@/navigation/ChatsStackNavigator';

interface Subgroup {
  id: string;
  name: string;
  description?: string;
  is_template_locked: boolean;
}

interface MainGroup {
  id: string;
  name: string;
  description?: string;
  subgroups: Subgroup[];
}

type NavigationProp = NativeStackNavigationProp<ChatsStackParamList>;

export default function GroupListScreen() {
  const [groups, setGroups] = useState<MainGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { token } = useAuth();

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/groups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load groups');
      }

      const data = await response.json();
      setGroups(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  }

  function toggleGroup(groupId: string) {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  }

  function openChat(subgroup: Subgroup) {
    navigation.navigate('ChatRoom', {
      subgroupId: subgroup.id,
      subgroupName: subgroup.name
    });
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenScrollView style={{ backgroundColor: colors.backgroundRoot }}>
      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="message-circle" size={64} color={Colors.light.textDisabled} />
          <ThemedText style={styles.emptyText}>No groups available</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Contact your administrator to join groups
          </ThemedText>
        </View>
      ) : (
        <View style={styles.groupsContainer}>
          {groups.map((group) => (
            <View key={group.id} style={styles.groupCard}>
              <Pressable
                onPress={() => toggleGroup(group.id)}
                style={[styles.groupHeader, { backgroundColor: colors.surface }]}
              >
                <View style={styles.groupHeaderContent}>
                  <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                  {group.description ? (
                    <ThemedText style={styles.groupDescription}>{group.description}</ThemedText>
                  ) : null}
                </View>
                <Feather
                  name={expandedGroups.has(group.id) ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={colors.text}
                />
              </Pressable>

              {expandedGroups.has(group.id) && group.subgroups.length > 0 ? (
                <View style={styles.subgroupsContainer}>
                  {group.subgroups.map((subgroup) => (
                    <Pressable
                      key={subgroup.id}
                      onPress={() => openChat(subgroup)}
                      style={[styles.subgroupItem, { borderColor: colors.border }]}
                    >
                      <View style={styles.subgroupContent}>
                        <ThemedText style={styles.subgroupName}>{subgroup.name}</ThemedText>
                        {subgroup.is_template_locked ? (
                          <View style={[styles.badge, { backgroundColor: Colors.light.warning }]}>
                            <ThemedText style={styles.badgeText}>Template</ThemedText>
                          </View>
                        ) : null}
                      </View>
                      <Feather name="chevron-right" size={20} color={colors.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
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
  groupsContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg
  },
  groupCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden'
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md
  },
  groupHeaderContent: {
    flex: 1,
    marginRight: Spacing.md
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600'
  },
  groupDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: Spacing.xs
  },
  subgroupsContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md
  },
  subgroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1
  },
  subgroupContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  subgroupName: {
    fontSize: 16
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});
