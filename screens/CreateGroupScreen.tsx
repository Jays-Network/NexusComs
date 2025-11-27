import { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Alert, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenKeyboardAwareScrollView } from '@/components/ScreenKeyboardAwareScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useStreamAuth } from '@/utils/streamAuth';
import { fetchGroups, createGroup, Group } from '@/utils/streamApi';

export default function CreateGroupScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { user, authToken } = useStreamAuth();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [parentGroupId, setParentGroupId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingGroups, setIsFetchingGroups] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showParentPicker, setShowParentPicker] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    if (!authToken) {
      setIsFetchingGroups(false);
      return;
    }
    
    try {
      const fetchedGroups = await fetchGroups(authToken);
      setGroups(fetchedGroups);
    } catch (error) {
      console.warn('Failed to fetch groups:', error);
    } finally {
      setIsFetchingGroups(false);
    }
  }

  function getParentGroupName(): string {
    if (!parentGroupId) return 'None (Main Group)';
    const parent = groups.find(g => g.id === parentGroupId);
    return parent?.name || 'Unknown';
  }

  function buildHierarchicalGroups(): { group: Group; level: number }[] {
    const result: { group: Group; level: number }[] = [];
    
    function addGroup(group: Group, level: number) {
      result.push({ group, level });
      const children = groups.filter(g => g.parent_group_id === group.id);
      children.forEach(child => addGroup(child, level + 1));
    }
    
    const mainGroups = groups.filter(g => !g.parent_group_id);
    mainGroups.forEach(g => addGroup(g, 0));
    
    return result;
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (!user || !authToken) {
      Alert.alert('Error', 'You must be logged in to create a group');
      return;
    }

    setIsLoading(true);
    try {
      await createGroup(authToken, {
        name: groupName.trim(),
        description: description.trim() || undefined,
        parentGroupId: parentGroupId,
      });
      
      Alert.alert('Success', 'Group created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Create group error:', error);
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScreenKeyboardAwareScrollView style={{ backgroundColor: theme.backgroundRoot }}>
      <View style={styles.container}>
        <View style={styles.iconSection}>
          <View style={[styles.groupIcon, { backgroundColor: theme.primary }]}>
            <Feather name="users" size={40} color="#FFFFFF" />
          </View>
          <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
            Create a new group chat
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Group Name</ThemedText>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text
              }]}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Enter group name"
              placeholderTextColor={Colors.light.textDisabled}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Description (Optional)</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text
              }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description for your group"
              placeholderTextColor={Colors.light.textDisabled}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Parent Group (Optional)</ThemedText>
            <Pressable
              onPress={() => setShowParentPicker(!showParentPicker)}
              disabled={isFetchingGroups || isLoading}
              style={[styles.pickerButton, { 
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }]}
            >
              {isFetchingGroups ? (
                <ActivityIndicator size="small" color={theme.textSecondary} />
              ) : (
                <>
                  <ThemedText style={{ color: parentGroupId ? theme.text : theme.textSecondary }}>
                    {getParentGroupName()}
                  </ThemedText>
                  <Feather 
                    name={showParentPicker ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={theme.textSecondary} 
                  />
                </>
              )}
            </Pressable>
            <ThemedText style={[styles.helperText, { color: theme.textSecondary }]}>
              Leave empty to create a main group, or select a parent to create a subgroup
            </ThemedText>

            {showParentPicker ? (
              <View style={[styles.pickerList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  <Pressable
                    onPress={() => {
                      setParentGroupId(null);
                      setShowParentPicker(false);
                    }}
                    style={[
                      styles.pickerItem,
                      !parentGroupId && { backgroundColor: theme.primary + '20' }
                    ]}
                  >
                    <ThemedText style={[styles.pickerItemText, !parentGroupId && { color: theme.primary }]}>
                      None (Main Group)
                    </ThemedText>
                  </Pressable>
                  
                  {buildHierarchicalGroups().map(({ group, level }) => (
                    <Pressable
                      key={group.id}
                      onPress={() => {
                        setParentGroupId(group.id);
                        setShowParentPicker(false);
                      }}
                      style={[
                        styles.pickerItem,
                        { paddingLeft: Spacing.lg + (level * 16) },
                        parentGroupId === group.id && { backgroundColor: theme.primary + '20' }
                      ]}
                    >
                      <ThemedText style={[
                        styles.pickerItemText, 
                        level > 0 && { color: theme.textSecondary },
                        parentGroupId === group.id && { color: theme.primary }
                      ]}>
                        {level > 0 ? '└─ ' : ''}{group.name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={handleCreateGroup}
            disabled={isLoading || !groupName.trim()}
            style={[
              styles.createButton,
              {
                backgroundColor: !groupName.trim()
                  ? Colors.light.textDisabled 
                  : theme.primary
              }
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="plus" size={20} color="#FFFFFF" />
                <ThemedText style={styles.createButtonText}>Create Group</ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    gap: Spacing['2xl'],
  },
  iconSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  groupIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  hint: {
    fontSize: 15,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.xl,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.lg,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  pickerList: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  pickerScroll: {
    maxHeight: 200,
  },
  pickerItem: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  pickerItemText: {
    fontSize: 15,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
