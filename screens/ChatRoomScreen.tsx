import { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ActionSheetIOS
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/utils/auth';
import { getSocket, encryptMessage, decryptMessage } from '@/utils/socket';
import { cacheMessages, getCachedMessages, CachedMessage } from '@/utils/storage';
import { ChatsStackParamList } from '@/navigation/ChatsStackNavigator';

type RouteProps = RouteProp<ChatsStackParamList, 'ChatRoom'>;

export default function ChatRoomScreen() {
  const route = useRoute<RouteProps>();
  const { subgroupId, subgroupName } = route.params;
  const [messages, setMessages] = useState<CachedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadMessages();
    setupSocket();

    return () => {
      const socket = getSocket();
      socket.emit('leave_room', subgroupId);
    };
  }, [subgroupId]);

  async function loadMessages() {
    try {
      // Load cached messages first
      const cached = await getCachedMessages(subgroupId);
      if (cached.length > 0) {
        setMessages(cached);
        setIsLoading(false);
      }

      // Then fetch from server
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/messages/${subgroupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        await cacheMessages(subgroupId, data);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function setupSocket() {
    const socket = getSocket();
    
    if (!socket.connected && user) {
      socket.connect();
      socket.emit('authenticate', user.id);
    }

    socket.emit('join_room', subgroupId);

    socket.on('new_message', (message: CachedMessage) => {
      setMessages(prev => {
        const updated = [...prev, message];
        cacheMessages(subgroupId, updated);
        return updated;
      });
    });

    socket.on('message_error', (error: any) => {
      Alert.alert('Error', error.error || 'Failed to send message');
      setIsSending(false);
    });
  }

  async function sendMessage() {
    if (!inputText.trim() || isSending || !user) return;

    setIsSending(true);
    const messageText = inputText.trim();
    setInputText('');

    try {
      const encryptedContent = await encryptMessage(messageText, user.id);
      const socket = getSocket();

      socket.emit('send_message', {
        subgroupId,
        encryptedContent,
        messageType: 'text'
      });

      setIsSending(false);
    } catch (error) {
      console.error('Send message error:', error);
      setInputText(messageText);
      Alert.alert('Error', 'Failed to send message');
      setIsSending(false);
    }
  }

  async function handleAttachment() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Photo Library', 'Documents'],
          cancelButtonIndex: 0
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) await takePhoto();
          else if (buttonIndex === 2) await pickImage();
          else if (buttonIndex === 3) await pickDocument();
        }
      );
    } else {
      Alert.alert('Attach File', '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Documents', onPress: pickDocument }
      ]);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8
    });

    if (!result.canceled && result.assets[0]) {
      await uploadFile(result.assets[0].uri, result.assets[0].fileName || 'photo.jpg');
    }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8
    });

    if (!result.canceled && result.assets[0]) {
      await uploadFile(result.assets[0].uri, result.assets[0].fileName || 'media.jpg');
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true
    });

    if (!result.canceled && result.assets[0]) {
      await uploadFile(result.assets[0].uri, result.assets[0].name);
    }
  }

  async function uploadFile(uri: string, filename: string) {
    if (!user) return;
    
    try {
      setIsSending(true);
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: filename,
        type: 'application/octet-stream'
      } as any);

      const uploadResponse = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();
      const encryptedContent = await encryptMessage(`File: ${uploadData.filename}`, user.id);
      const socket = getSocket();

      socket.emit('send_message', {
        subgroupId,
        encryptedContent,
        messageType: 'file',
        fileUrl: uploadData.url,
        fileName: uploadData.filename,
        fileSize: uploadData.size
      });

      setIsSending(false);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload file');
      setIsSending(false);
    }
  }

  function MessageBubble({ item }: { item: CachedMessage }) {
    const [decryptedContent, setDecryptedContent] = useState('[Decrypting...]');
    const isOwnMessage = item.userId === user?.id;

    useEffect(() => {
      if (item.userId) {
        decryptMessage(item.encryptedContent, item.userId).then(setDecryptedContent);
      }
    }, [item.encryptedContent, item.userId]);

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage
        ]}
      >
        {!isOwnMessage ? (
          <ThemedText style={styles.senderName}>{item.user?.displayName || 'Unknown'}</ThemedText>
        ) : null}
        <ThemedView
          style={[
            styles.messageBubble,
            {
              backgroundColor: isOwnMessage ? colors.messageSent : colors.messageReceived
            }
          ]}
        >
          <ThemedText
            style={[
              styles.messageText,
              { color: isOwnMessage ? '#FFFFFF' : colors.text }
            ]}
          >
            {decryptedContent}
          </ThemedText>
          {item.fileUrl ? (
            <View style={styles.fileInfo}>
              <Feather name="file" size={16} color={isOwnMessage ? '#FFFFFF' : colors.text} />
              <ThemedText
                style={[
                  styles.fileName,
                  { color: isOwnMessage ? '#FFFFFF' : colors.text }
                ]}
              >
                {item.fileName}
              </ThemedText>
            </View>
          ) : null}
        </ThemedView>
        <ThemedText style={styles.timestamp}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </ThemedText>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundRoot }]}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => <MessageBubble item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + Spacing.md
          }
        ]}
      >
        <Pressable onPress={handleAttachment} style={styles.attachButton}>
          <Feather name="paperclip" size={24} color={colors.text} />
        </Pressable>

        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.light.textDisabled}
          multiline
          maxLength={1000}
        />

        <Pressable
          onPress={sendMessage}
          disabled={!inputText.trim() || isSending}
          style={[
            styles.sendButton,
            {
              backgroundColor: (!inputText.trim() || isSending)
                ? Colors.light.textDisabled
                : colors.primary
            }
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="send" size={20} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  messagesList: {
    padding: Spacing.lg,
    gap: Spacing.md
  },
  messageContainer: {
    maxWidth: '80%',
    gap: Spacing.xs
  },
  ownMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end'
  },
  otherMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start'
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: Spacing.sm,
    opacity: 0.7
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md
  },
  messageText: {
    fontSize: 16
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)'
  },
  fileName: {
    fontSize: 14
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.5,
    marginLeft: Spacing.sm
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border
  },
  attachButton: {
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: Spacing.sm
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
