import { Platform } from 'react-native';
import Constants from 'expo-constants';

const COMETCHAT_APP_ID = process.env.EXPO_PUBLIC_COMETCHAT_APP_ID || '';
const COMETCHAT_REGION = process.env.EXPO_PUBLIC_COMETCHAT_REGION || 'us';
const COMETCHAT_AUTH_KEY = process.env.EXPO_PUBLIC_COMETCHAT_AUTH_KEY || '';

console.log('[CometChat] Initializing CometChat client...');
console.log('[CometChat] EXPO_PUBLIC_COMETCHAT_APP_ID exists:', !!COMETCHAT_APP_ID);
console.log('[CometChat] EXPO_PUBLIC_COMETCHAT_REGION:', COMETCHAT_REGION);

const isValidConfig = (appId: string, authKey: string): boolean => {
  if (!appId || typeof appId !== 'string' || appId.length === 0) return false;
  if (!authKey || typeof authKey !== 'string' || authKey.length === 0) return false;
  if (appId.includes('$') || appId.includes('undefined')) return false;
  if (authKey.includes('$') || authKey.includes('undefined')) return false;
  return true;
};

const COMETCHAT_CONFIG_VALID = isValidConfig(COMETCHAT_APP_ID, COMETCHAT_AUTH_KEY);
console.log('[CometChat] Config validation result:', COMETCHAT_CONFIG_VALID);

let CometChat: any = null;
let isInitialized = false;

if (COMETCHAT_CONFIG_VALID) {
  try {
    const cometChatModule = require('@cometchat/chat-sdk-react-native');
    CometChat = cometChatModule.CometChat;
    console.log('[CometChat] SDK module loaded');
  } catch (e) {
    console.error('[CometChat] Failed to load CometChat SDK:', e);
    CometChat = null;
  }
} else {
  console.error('[CometChat] Invalid configuration - CometChat will not be loaded');
  console.error('  - Check EXPO_PUBLIC_COMETCHAT_APP_ID and EXPO_PUBLIC_COMETCHAT_AUTH_KEY');
}

export const initializeCometChat = async (): Promise<boolean> => {
  if (isInitialized) {
    console.log('[CometChat] Already initialized');
    return true;
  }

  if (!CometChat || !COMETCHAT_CONFIG_VALID) {
    console.error('[CometChat] Cannot initialize - SDK not loaded or invalid config');
    return false;
  }

  try {
    console.log('[CometChat] Initializing with App ID:', COMETCHAT_APP_ID);
    
    const appSettings = new CometChat.AppSettingsBuilder()
      .subscribePresenceForAllUsers()
      .setRegion(COMETCHAT_REGION)
      .autoEstablishSocketConnection(true)
      .build();

    await CometChat.init(COMETCHAT_APP_ID, appSettings);
    isInitialized = true;
    console.log('[CometChat] Initialization successful');
    return true;
  } catch (error) {
    console.error('[CometChat] Initialization failed:', error);
    return false;
  }
};

export const loginCometChatUser = async (
  uid: string,
  authToken?: string
): Promise<any> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  if (!isInitialized) {
    const success = await initializeCometChat();
    if (!success) {
      throw new Error('CometChat initialization failed');
    }
  }

  try {
    console.log('[CometChat] Logging in user:', uid);
    
    let user;
    if (authToken) {
      user = await CometChat.login(authToken);
    } else {
      user = await CometChat.login(uid, COMETCHAT_AUTH_KEY);
    }
    
    console.log('[CometChat] User logged in:', user.getUid());
    return user;
  } catch (error: any) {
    console.error('[CometChat] Login failed:', error);
    throw error;
  }
};

export const logoutCometChatUser = async (): Promise<void> => {
  if (!CometChat) {
    console.warn('[CometChat] Cannot logout - SDK not loaded');
    return;
  }

  try {
    await CometChat.logout();
    console.log('[CometChat] User logged out');
  } catch (error) {
    console.error('[CometChat] Logout failed:', error);
  }
};

export const getCometChatUser = async (uid: string): Promise<any> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  try {
    const user = await CometChat.getUser(uid);
    return user;
  } catch (error) {
    console.error('[CometChat] Get user failed:', error);
    throw error;
  }
};

export const getLoggedInUser = async (): Promise<any> => {
  if (!CometChat) {
    return null;
  }

  try {
    const user = await CometChat.getLoggedinUser();
    return user;
  } catch (error) {
    console.error('[CometChat] Get logged in user failed:', error);
    return null;
  }
};

export const getGroup = async (guid: string): Promise<any> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  try {
    const group = await CometChat.getGroup(guid);
    return group;
  } catch (error) {
    console.error('[CometChat] Get group failed:', error);
    throw error;
  }
};

export const joinGroup = async (guid: string, groupType: string = 'public'): Promise<any> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  try {
    const group = await CometChat.joinGroup(guid, groupType, '');
    console.log('[CometChat] Joined group:', guid);
    return group;
  } catch (error: any) {
    if (error.code === 'ERR_ALREADY_JOINED') {
      console.log('[CometChat] Already a member of group:', guid);
      return await getGroup(guid);
    }
    console.error('[CometChat] Join group failed:', error);
    throw error;
  }
};

export const sendTextMessage = async (
  receiverId: string,
  text: string,
  receiverType: string = 'group',
  metadata?: Record<string, any>
): Promise<any> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  try {
    const textMessage = new CometChat.TextMessage(
      receiverId,
      text,
      receiverType === 'group' ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
    );

    if (metadata) {
      textMessage.setMetadata(metadata);
    }

    const message = await CometChat.sendMessage(textMessage);
    console.log('[CometChat] Message sent:', message.getId());
    return message;
  } catch (error) {
    console.error('[CometChat] Send message failed:', error);
    throw error;
  }
};

export const fetchMessages = async (
  receiverId: string,
  receiverType: string = 'group',
  limit: number = 50
): Promise<any[]> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  try {
    const messagesRequest = new CometChat.MessagesRequestBuilder()
      .setLimit(limit)
      .setGUID(receiverId)
      .build();

    const messages = await messagesRequest.fetchPrevious();
    return messages;
  } catch (error) {
    console.error('[CometChat] Fetch messages failed:', error);
    throw error;
  }
};

export const addMessageListener = (
  listenerId: string,
  onMessageReceived: (message: any) => void
): void => {
  if (!CometChat) {
    console.warn('[CometChat] Cannot add listener - SDK not loaded');
    return;
  }

  CometChat.addMessageListener(
    listenerId,
    new CometChat.MessageListener({
      onTextMessageReceived: (message: any) => {
        console.log('[CometChat] Text message received:', message.getId());
        onMessageReceived(message);
      },
      onMediaMessageReceived: (message: any) => {
        console.log('[CometChat] Media message received:', message.getId());
        onMessageReceived(message);
      },
      onCustomMessageReceived: (message: any) => {
        console.log('[CometChat] Custom message received:', message.getId());
        onMessageReceived(message);
      },
    })
  );
};

export const removeMessageListener = (listenerId: string): void => {
  if (!CometChat) {
    return;
  }

  CometChat.removeMessageListener(listenerId);
};

export const fetchConversations = async (limit: number = 50): Promise<any[]> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  try {
    const conversationsRequest = new CometChat.ConversationsRequestBuilder()
      .setLimit(limit)
      .build();

    const conversations = await conversationsRequest.fetchNext();
    return conversations;
  } catch (error) {
    console.error('[CometChat] Fetch conversations failed:', error);
    throw error;
  }
};

export const fetchGroups = async (limit: number = 50): Promise<any[]> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  try {
    const groupsRequest = new CometChat.GroupsRequestBuilder()
      .setLimit(limit)
      .joinedOnly(true)
      .build();

    const groups = await groupsRequest.fetchNext();
    return groups;
  } catch (error) {
    console.error('[CometChat] Fetch groups failed:', error);
    throw error;
  }
};

export const markAsRead = async (message: any): Promise<void> => {
  if (!CometChat) {
    return;
  }

  try {
    await CometChat.markAsRead(message);
  } catch (error) {
    console.error('[CometChat] Mark as read failed:', error);
  }
};

export const getUnreadMessageCount = async (): Promise<Record<string, number>> => {
  if (!CometChat) {
    return {};
  }

  try {
    const count = await CometChat.getUnreadMessageCount();
    return count;
  } catch (error) {
    console.error('[CometChat] Get unread count failed:', error);
    return {};
  }
};

export {
  CometChat,
  COMETCHAT_APP_ID,
  COMETCHAT_REGION,
  COMETCHAT_AUTH_KEY,
  COMETCHAT_CONFIG_VALID,
  isInitialized,
};
