import { StreamChat } from 'stream-chat';
import { StreamVideoClient } from '@stream-io/video-react-native-sdk';

const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY || '';

if (!STREAM_API_KEY) {
  console.warn('EXPO_PUBLIC_STREAM_API_KEY is not set. Stream features will not work.');
}

// Singleton instances
let chatClient: StreamChat | null = null;
let videoClient: StreamVideoClient | null = null;

export const getChatClient = () => {
  if (!chatClient) {
    chatClient = StreamChat.getInstance(STREAM_API_KEY);
  }
  return chatClient;
};

export const getVideoClient = () => {
  // Video client requires WebRTC which is not available in Expo Go
  // Only initialize if we have a custom development build
  try {
    if (!videoClient && STREAM_API_KEY) {
      videoClient = new StreamVideoClient({
        apiKey: STREAM_API_KEY,
      });
    }
    return videoClient;
  } catch (error) {
    console.warn('Stream Video SDK not available (Expo Go limitation):', error);
    return null;
  }
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
  const client = getVideoClient();
  
  if (!client) {
    throw new Error('Video client not initialized');
  }
  
  try {
    await client.connectUser(
      {
        id: userId,
        name: userName,
      },
      userToken
    );
    
    console.log('Stream video user connected:', userId);
    return client;
  } catch (error) {
    console.error('Failed to connect Stream video user:', error);
    throw error;
  }
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
  if (videoClient) {
    try {
      await videoClient.disconnectUser();
      console.log('Stream video user disconnected');
    } catch (error) {
      console.error('Failed to disconnect Stream video user:', error);
    }
  }
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
