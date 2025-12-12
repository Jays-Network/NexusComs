import { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useCometChatAuth } from '@/utils/cometChatAuth';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useCometChatAuth();
  const insets = useSafeAreaInsets();
  const { theme: colors } = useTheme();

  async function handleLogin() {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    setIsLoading(true);
    try {
      await login(username.trim(), password.trim());
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid username or password');
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
        <Image
          source={require('@/assets/images/nexus-coms-logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />

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
              placeholder="Enter username"
              placeholderTextColor={Colors.light.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text
              }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={Colors.light.textDisabled}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={isLoading || !username.trim() || !password.trim()}
            style={[
              styles.loginButton,
              {
                backgroundColor: !username.trim() || !password.trim()
                  ? Colors.light.textDisabled 
                  : colors.primary
              }
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.loginButtonText}>Login</ThemedText>
            )}
          </Pressable>
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
  logo: {
    width: '100%',
    height: 150,
    marginBottom: Spacing['4xl'],
    alignSelf: 'center'
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
