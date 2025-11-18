import { StreamChat } from 'stream-chat';
// NOTE: Stream Video SDK is disabled for Expo Go compatibility
// It requires WebRTC which causes crashes on Android in Expo Go
// Uncomment this import only when building with EAS or custom development build
// import { StreamVideoClient } from '@stream-io/video-react-native-sdk';

const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY || '';

if (!STREAM_API_KEY) {
  console.warn('EXPO_PUBLIC_STREAM_API_KEY is not set. Stream features will not work.');
}

// Singleton instances
let chatClient: StreamChat | null = null;
// Video client disabled for Expo Go
// let videoClient: StreamVideoClient | null = null;

export const getChatClient = () => {
  if (!chatClient) {
    chatClient = StreamChat.getInstance(STREAM_API_KEY);
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
  const client = getChatClient();
  
  try {
    await client.connectUser(
      {
        id: userId,
        name: userName,
        image: userImage,
      },
      userToken
    );
    
    console.log('Stream chat user connected:', userId);
    return client;
  } catch (error) {
    console.error('Failed to connect Stream user:', error);
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
