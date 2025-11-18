import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CachedMessage {
  id: string;
  subgroupId: string;
  userId: string;
  encryptedContent: string;
  messageType: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export async function cacheMessages(subgroupId: string, messages: CachedMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`messages_${subgroupId}`, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to cache messages:', error);
  }
}

export async function getCachedMessages(subgroupId: string): Promise<CachedMessage[]> {
  try {
    const cached = await AsyncStorage.getItem(`messages_${subgroupId}`);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Failed to get cached messages:', error);
    return [];
  }
}

export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const messageKeys = keys.filter(key => key.startsWith('messages_'));
    await AsyncStorage.multiRemove(messageKeys);
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}
