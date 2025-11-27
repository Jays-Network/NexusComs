import { useState } from 'react';
import { View, TextInput, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenKeyboardAwareScrollView } from '@/components/ScreenKeyboardAwareScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useStreamAuth } from '@/utils/streamAuth';
import { getChatClient } from '@/utils/streamClient';

export default function CreateGroupScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { user } = useStreamAuth();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreateGroup() {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a group');
      return;
    }

    setIsLoading(true);
    try {
      const chatClient = getChatClient();
      if (!chatClient) {
        throw new Error('Chat client not available');
      }
      
      const channelId = groupName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
      
      const channel = chatClient.channel('messaging', channelId, {
        name: groupName.trim(),
        description: description.trim(),
        members: [user.id],
        created_by_id: user.id,
      });

      await channel.create();
      
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
