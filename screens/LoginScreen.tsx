import { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useStreamAuth } from '@/utils/streamAuth';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useStreamAuth();
  const insets = useSafeAreaInsets();
  const { theme: colors } = useTheme();

  async function handleLogin() {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    const finalDisplayName = displayName.trim() || username.trim();

    setIsLoading(true);
    try {
      // Create a unique user ID (in production, this might come from your backend)
      const userId = username.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      await login(userId, finalDisplayName);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Failed to connect to Stream');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.backgroundRoot,
        paddingTop: insets.top + Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xl
      }
    ]}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>SecureChat</ThemedText>
        <ThemedText style={styles.subtitle}>Powered by Stream</ThemedText>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Username</ThemedText>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text
              }]}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username (e.g., john_doe)"
              placeholderTextColor={Colors.light.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <ThemedText style={styles.hint}>
              Lowercase letters and numbers only
            </ThemedText>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Display Name (Optional)</ThemedText>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text
              }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter display name (e.g., John Doe)"
              placeholderTextColor={Colors.light.textDisabled}
              autoCorrect={false}
              editable={!isLoading}
            />
            <ThemedText style={styles.hint}>
              Leave blank to use username
            </ThemedText>
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={isLoading || !username.trim()}
            style={[
              styles.loginButton,
              {
                backgroundColor: !username.trim() 
                  ? Colors.light.textDisabled 
                  : colors.primary
              }
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.loginButtonText}>Continue</ThemedText>
            )}
          </Pressable>
          
          <ThemedText style={styles.info}>
            This demo uses Stream's development tokens. In production, tokens should be generated securely on your backend server.
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl']
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: Spacing['4xl']
  },
  form: {
    gap: Spacing.xl
  },
  inputContainer: {
    gap: Spacing.sm
  },
  label: {
    fontSize: 15,
    fontWeight: '600'
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 17
  },
  hint: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: -4
  },
  loginButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  info: {
    fontSize: 13,
    opacity: 0.5,
    textAlign: 'center',
    lineHeight: 18
  }
});
