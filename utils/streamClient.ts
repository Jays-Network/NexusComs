const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY || '';

console.log('🔍 [streamClient.ts] Initializing Stream Chat client...');
console.log('📌 EXPO_PUBLIC_STREAM_API_KEY exists:', !!STREAM_API_KEY);
console.log('📌 EXPO_PUBLIC_STREAM_API_KEY length:', STREAM_API_KEY.length);

// Validate API key more strictly BEFORE loading Stream
const isValidStreamKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') return false;
  if (key.length === 0) return false;
  if (key.includes('$') || key.includes('undefined') || key.includes('null')) return false;
  // Stream API keys should be at least 8 characters
  if (key.length < 8) return false;
  return true;
};

const STREAM_API_KEY_VALID = isValidStreamKey(STREAM_API_KEY);

console.log('✅ API Key validation result:', STREAM_API_KEY_VALID);

// Only load Stream Chat if we have a valid key
let StreamChat: any = null;
if (STREAM_API_KEY_VALID) {
  try {
    const streamModule = require('stream-chat');
    StreamChat = streamModule.StreamChat;
    console.log('✅ Stream Chat module loaded');
  } catch (e) {
    console.error('❌ Failed to load Stream Chat module:', e);
    StreamChat = null;
  }
} else {
  console.error('❌ CRITICAL: Invalid Stream API key - Stream Chat will not be loaded');
  console.error('  - EXPO_PUBLIC_STREAM_API_KEY is either missing or invalid');
  console.error('📝 To fix: Add a valid EXPO_PUBLIC_STREAM_API_KEY to your Replit Secrets');
}

// NOTE: Stream Video SDK is disabled for Expo Go compatibility
// It requires WebRTC which causes crashes on Android in Expo Go
// Uncomment this import only when building with EAS or custom development build
// import { StreamVideoClient } from '@stream-io/video-react-native-sdk';

// Singleton instances
let chatClient: StreamChat | null = null;
// Video client disabled for Expo Go
// let videoClient: StreamVideoClient | null = null;

export const getChatClient = () => {
  console.log('📞 getChatClient() called, STREAM_API_KEY_VALID:', STREAM_API_KEY_VALID);
  
  if (!STREAM_API_KEY_VALID) {
    console.error('❌ Cannot create StreamChat client: STREAM_API_KEY is not configured');
    return null;
  }
  
  if (!StreamChat) {
    console.error('❌ StreamChat module not available');
    return null;
  }
  
  if (!chatClient) {
    try {
      console.log('🚀 Creating new StreamChat instance...');
      // Wrap in try-catch to prevent crashes from malformed keys
      if (!STREAM_API_KEY || STREAM_API_KEY.length === 0) {
        throw new Error('Empty API key');
      }
      
      // Final safety check before calling getInstance
      if (typeof StreamChat.getInstance !== 'function') {
        throw new Error('StreamChat.getInstance is not a function');
      }
      
      chatClient = StreamChat.getInstance(STREAM_API_KEY);
      console.log('✅ StreamChat instance created successfully');
    } catch (error) {
      console.error('❌ Failed to initialize StreamChat:', error);
      console.error('📋 Error type:', error instanceof Error ? error.name : typeof error);
      console.error('📋 Error message:', error instanceof Error ? error.message : String(error));
      chatClient = null;
      return null;
    }
  } else {
    console.log('✅ Using existing StreamChat instance');
  }
  return chatClient;
};

export const getVideoClient = () => {
  // Video client disabled for Expo Go compatibility
  // WebRTC causes Android crashes in Expo Go
  // To enable: build with EAS or custom development build, then uncomment the import above
  console.warn('Stream Video SDK is disabled in Expo Go. Build with EAS to enable video features.');
  return null;
};

export const connectStreamUser = async (
  userId: string,
  userName: string,
  userToken: string,
  userImage?: string
) => {
  console.log('🔗 connectStreamUser() called for:', userId);
  const client = getChatClient();
  
  if (!client) {
    console.error('❌ Stream client not initialized: EXPO_PUBLIC_STREAM_API_KEY is missing');
    throw new Error('Stream client not initialized: EXPO_PUBLIC_STREAM_API_KEY is missing');
  }
  
  try {
    console.log('🔐 Connecting Stream user...');
    await client.connectUser(
      {
        id: userId,
        name: userName,
        image: userImage,
      },
      userToken
    );
    
    console.log('✅ Stream chat user connected:', userId);
    return client;
  } catch (error) {
    console.error('❌ Failed to connect Stream user:', error);
    console.error('📋 Error details:', JSON.stringify(error));
    throw error;
  }
};

export const connectVideoUser = async (
  userId: string,
  userName: string,
  userToken: string
) => {
  // Video features disabled for Expo Go
  console.warn('Video features are not available in Expo Go. Build with EAS to enable.');
  return null;
};

export const disconnectStreamUser = async () => {
  const client = getChatClient();
  
  if (!client) {
    console.warn('Cannot disconnect: Stream client not initialized');
    return;
  }
  
  try {
    await client.disconnectUser();
    console.log('Stream user disconnected');
  } catch (error) {
    console.error('Failed to disconnect Stream user:', error);
  }
};

export const disconnectVideoUser = async () => {
  // Video features disabled for Expo Go
  console.log('Video disconnect skipped (Expo Go mode)');
};

// Generate user token for development/testing
// In production, this should be done on your backend server
export const generateUserToken = (userId: string): string => {
  // This is a temporary solution for development
  // In production, you MUST generate tokens on your backend
  const chatClient = getChatClient();
  
  // Note: This requires STREAM_API_SECRET to be available
  // For production, move this to a backend server
  const token = chatClient.devToken(userId);
  return token;
};

export { STREAM_API_KEY };
