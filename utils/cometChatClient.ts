import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COMETCHAT_APP_ID = process.env.EXPO_PUBLIC_COMETCHAT_APP_ID || '';
const COMETCHAT_REGION = process.env.EXPO_PUBLIC_COMETCHAT_REGION || 'us';
const COMETCHAT_AUTH_KEY = process.env.EXPO_PUBLIC_COMETCHAT_AUTH_KEY || '';

const CONNECTION_TIMEOUT = 30000;
const MAX_RETRY_ATTEMPTS = 3;
const MESSAGE_QUEUE_KEY = 'cometchat_message_queue';

console.log('[CometChat] Initializing CometChat client...');
console.log('[CometChat] EXPO_PUBLIC_COMETCHAT_APP_ID exists:', !!COMETCHAT_APP_ID);
console.log('[CometChat] EXPO_PUBLIC_COMETCHAT_REGION:', COMETCHAT_REGION);

const isValidConfig = (appId: string, authKey: string): boolean => {
  if (!appId || typeof appId !== 'string' || appId.length === 0) {
    console.error('[CometChat] Invalid App ID - empty or missing');
    return false;
  }
  if (!authKey || typeof authKey !== 'string' || authKey.length === 0) {
    console.error('[CometChat] Invalid Auth Key - empty or missing');
    return false;
  }
  if (appId.includes('$') || appId.includes('undefined')) {
    console.error('[CometChat] Invalid App ID - contains placeholder values');
    return false;
  }
  if (authKey.includes('$') || authKey.includes('undefined')) {
    console.error('[CometChat] Invalid Auth Key - contains placeholder values');
    return false;
  }
  if (appId.length < 10) {
    console.error('[CometChat] Invalid App ID - too short');
    return false;
  }
  if (authKey.length < 20) {
    console.error('[CometChat] Invalid Auth Key - too short');
    return false;
  }
  return true;
};

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const calculateBackoff = (attempt: number): number => {
  return Math.min(1000 * Math.pow(2, attempt), 30000);
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Connection timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    
    promise
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

interface QueuedMessage {
  id: string;
  receiverId: string;
  text: string;
  receiverType: string;
  metadata?: Record<string, any>;
  timestamp: number;
  retryCount: number;
}

let messageQueue: QueuedMessage[] = [];
let isOnline = true;

const loadMessageQueue = async (): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(MESSAGE_QUEUE_KEY);
    if (stored) {
      messageQueue = JSON.parse(stored);
      console.log('[CometChat] Loaded message queue:', messageQueue.length, 'pending messages');
    }
  } catch (error) {
    console.error('[CometChat] Failed to load message queue:', error);
  }
};

const saveMessageQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(MESSAGE_QUEUE_KEY, JSON.stringify(messageQueue));
  } catch (error) {
    console.error('[CometChat] Failed to save message queue:', error);
  }
};

const processMessageQueue = async (): Promise<void> => {
  if (messageQueue.length === 0 || !isOnline || !isInitialized) {
    return;
  }
  
  console.log('[CometChat] Processing message queue:', messageQueue.length, 'messages');
  
  const messagesToProcess = [...messageQueue];
  messageQueue = [];
  await saveMessageQueue();
  
  for (const queuedMsg of messagesToProcess) {
    try {
      await sendTextMessageInternal(
        queuedMsg.receiverId,
        queuedMsg.text,
        queuedMsg.receiverType,
        queuedMsg.metadata
      );
      console.log('[CometChat] Queued message sent successfully:', queuedMsg.id);
    } catch (error) {
      console.error('[CometChat] Failed to send queued message:', queuedMsg.id);
      if (queuedMsg.retryCount < MAX_RETRY_ATTEMPTS) {
        messageQueue.push({
          ...queuedMsg,
          retryCount: queuedMsg.retryCount + 1,
        });
      } else {
        console.error('[CometChat] Message dropped after max retries:', queuedMsg.id);
      }
    }
  }
  
  if (messageQueue.length > 0) {
    await saveMessageQueue();
  }
};

export const setOnlineStatus = (online: boolean): void => {
  const wasOffline = !isOnline;
  isOnline = online;
  console.log('[CometChat] Online status:', online ? 'online' : 'offline');
  
  if (online && wasOffline && isInitialized) {
    processMessageQueue();
  }
};

export const getQueuedMessagesCount = (): number => {
  return messageQueue.length;
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
    loadMessageQueue();
  } catch (e) {
    console.error('[CometChat] Failed to load CometChat SDK:', e);
    CometChat = null;
  }
} else {
  console.error('[CometChat] Invalid configuration - CometChat will not be loaded');
  console.error('  - Verify COMETCHAT_APP_ID is correct');
  console.error('  - Verify COMETCHAT_AUTH_KEY for frontend');
}

export const initializeCometChat = async (retryAttempt: number = 0): Promise<boolean> => {
  if (isInitialized) {
    console.log('[CometChat] Already initialized');
    return true;
  }

  if (!CometChat || !COMETCHAT_CONFIG_VALID) {
    console.error('[CometChat] Cannot initialize - SDK not loaded or invalid config');
    console.error('[CometChat] Verify COMETCHAT_APP_ID is correct');
    console.error('[CometChat] Verify COMETCHAT_AUTH_KEY for frontend');
    return false;
  }

  try {
    console.log('[CometChat] Initializing with App ID:', COMETCHAT_APP_ID);
    console.log('[CometChat] Attempt:', retryAttempt + 1, 'of', MAX_RETRY_ATTEMPTS);
    
    const appSettings = new CometChat.AppSettingsBuilder()
      .subscribePresenceForAllUsers()
      .setRegion(COMETCHAT_REGION)
      .autoEstablishSocketConnection(true)
      .build();

    await withTimeout(
      CometChat.init(COMETCHAT_APP_ID, appSettings),
      CONNECTION_TIMEOUT
    );
    
    isInitialized = true;
    isOnline = true;
    console.log('[CometChat] Initialization successful');
    
    processMessageQueue();
    
    return true;
  } catch (error: any) {
    const isTimeout = error.message?.includes('timeout');
    const isInvalidCredentials = error.code === 'ERR_INVALID_APP_ID' || 
                                  error.code === 'ERR_INVALID_AUTH_KEY';
    
    if (isInvalidCredentials) {
      console.error('[CometChat] Invalid App ID or Auth Key');
      console.error('[CometChat] Verify COMETCHAT_APP_ID is correct');
      console.error('[CometChat] Verify COMETCHAT_AUTH_KEY for frontend');
      return false;
    }
    
    if (isTimeout && retryAttempt < MAX_RETRY_ATTEMPTS - 1) {
      const backoffTime = calculateBackoff(retryAttempt);
      console.warn(`[CometChat] Connection timeout. Retrying in ${backoffTime}ms...`);
      console.warn('[CometChat] Check frontend network connection');
      await delay(backoffTime);
      return initializeCometChat(retryAttempt + 1);
    }
    
    console.error('[CometChat] Initialization failed:', error);
    console.error('[CometChat] Auto-retry with exponential backoff exhausted');
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

export const createGroup = async (
  guid: string,
  name: string,
  groupType: string = 'public',
  metadata?: Record<string, any>
): Promise<any> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  try {
    console.log('[CometChat] Creating group:', guid, name);
    const group = new CometChat.Group(
      guid,
      name,
      groupType === 'public' ? CometChat.GROUP_TYPE.PUBLIC : 
        groupType === 'private' ? CometChat.GROUP_TYPE.PRIVATE : 
        CometChat.GROUP_TYPE.PASSWORD,
      ''
    );
    
    if (metadata) {
      group.setMetadata(metadata);
    }
    
    const createdGroup = await CometChat.createGroup(group);
    console.log('[CometChat] Group created successfully:', guid);
    return createdGroup;
  } catch (error: any) {
    if (error.code === 'ERR_GUID_ALREADY_EXISTS') {
      console.log('[CometChat] Group already exists:', guid);
      return await getGroup(guid);
    }
    console.error('[CometChat] Create group failed:', error);
    throw error;
  }
};

export const joinGroup = async (
  guid: string, 
  groupType: string = 'public',
  groupName?: string
): Promise<any> => {
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
    
    if (error.code === 'ERR_GUID_NOT_FOUND') {
      console.log('[CometChat] Group not found, creating:', guid);
      const name = groupName || `Group ${guid}`;
      try {
        await createGroup(guid, name, groupType);
        const joinedGroup = await CometChat.joinGroup(guid, groupType, '');
        console.log('[CometChat] Created and joined group:', guid);
        return joinedGroup;
      } catch (createError: any) {
        if (createError.code === 'ERR_GUID_ALREADY_EXISTS' || 
            createError.code === 'ERR_ALREADY_JOINED') {
          return await getGroup(guid);
        }
        throw createError;
      }
    }
    
    console.error('[CometChat] Join group failed:', error);
    throw error;
  }
};

const sendTextMessageInternal = async (
  receiverId: string,
  text: string,
  receiverType: string = 'group',
  metadata?: Record<string, any>
): Promise<any> => {
  const textMessage = new CometChat.TextMessage(
    receiverId,
    text,
    receiverType === 'group' ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
  );

  if (metadata) {
    textMessage.setMetadata(metadata);
  }

  const message = await CometChat.sendMessage(textMessage);
  return message;
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

  if (!isOnline) {
    const queuedMessage: QueuedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      receiverId,
      text,
      receiverType,
      metadata,
      timestamp: Date.now(),
      retryCount: 0,
    };
    messageQueue.push(queuedMessage);
    await saveMessageQueue();
    console.log('[CometChat] Message queued for offline delivery:', queuedMessage.id);
    console.log('[CometChat] Queue locally & retry when online');
    return { queued: true, id: queuedMessage.id };
  }

  try {
    const message = await sendTextMessageInternal(receiverId, text, receiverType, metadata);
    console.log('[CometChat] Message sent:', message.getId());
    return message;
  } catch (error: any) {
    console.error('[CometChat] Send message failed:', error);
    console.error('[CometChat] Check browser DevTools > Network tab');
    
    if (error.code === 'ERR_NETWORK' || error.message?.includes('network')) {
      isOnline = false;
      const queuedMessage: QueuedMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        receiverId,
        text,
        receiverType,
        metadata,
        timestamp: Date.now(),
        retryCount: 0,
      };
      messageQueue.push(queuedMessage);
      await saveMessageQueue();
      console.log('[CometChat] Message queued due to network error:', queuedMessage.id);
      return { queued: true, id: queuedMessage.id };
    }
    
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
    let messagesRequestBuilder = new CometChat.MessagesRequestBuilder()
      .setLimit(limit);
    
    if (receiverType === 'user') {
      console.log('[CometChat] Fetching messages for user:', receiverId);
      messagesRequestBuilder = messagesRequestBuilder.setUID(receiverId);
    } else {
      console.log('[CometChat] Fetching messages for group:', receiverId);
      messagesRequestBuilder = messagesRequestBuilder.setGUID(receiverId);
    }
    
    const messagesRequest = messagesRequestBuilder.build();
    const messages = await messagesRequest.fetchPrevious();
    console.log('[CometChat] Fetched', messages.length, 'messages');
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

export const fetchUsers = async (limit: number = 30): Promise<any[]> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  try {
    const usersRequest = new CometChat.UsersRequestBuilder()
      .setLimit(limit)
      .build();

    const users = await usersRequest.fetchNext();
    console.log('[CometChat] Fetched users:', users.length);
    return users;
  } catch (error) {
    console.error('[CometChat] Fetch users failed:', error);
    throw error;
  }
};

export const addUserListener = (
  listenerId: string,
  callbacks: {
    onUserOnline?: (user: any) => void;
    onUserOffline?: (user: any) => void;
  }
): void => {
  if (!CometChat) {
    console.warn('[CometChat] Cannot add user listener - SDK not loaded');
    return;
  }

  CometChat.addUserListener(
    listenerId,
    new CometChat.UserListener({
      onUserOnline: (user: any) => {
        console.log('[CometChat] User online:', user.getUid());
        callbacks.onUserOnline?.(user);
      },
      onUserOffline: (user: any) => {
        console.log('[CometChat] User offline:', user.getUid());
        callbacks.onUserOffline?.(user);
      },
    })
  );
};

export const removeUserListener = (listenerId: string): void => {
  if (!CometChat) {
    return;
  }

  CometChat.removeUserListener(listenerId);
};

export const createDirectConversation = async (userId: string): Promise<any> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  try {
    console.log('[CometChat] Creating/getting direct conversation with user:', userId);
    const user = await CometChat.getUser(userId);
    return user;
  } catch (error) {
    console.error('[CometChat] Create direct conversation failed:', error);
    throw error;
  }
};

export const sendMediaMessage = async (
  receiverId: string,
  file: any,
  messageType: string,
  receiverType: string = 'group',
  metadata?: Record<string, any>
): Promise<any> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  try {
    const mediaMessage = new CometChat.MediaMessage(
      receiverId,
      file,
      messageType,
      receiverType === 'group' ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
    );

    if (metadata) {
      mediaMessage.setMetadata(metadata);
    }

    const message = await CometChat.sendMessage(mediaMessage);
    console.log('[CometChat] Media message sent:', message.getId());
    return message;
  } catch (error: any) {
    console.error('[CometChat] Send media message failed:', error);
    throw error;
  }
};

export const sendCustomMessage = async (
  receiverId: string,
  customType: string,
  customData: Record<string, any>,
  receiverType: string = 'group'
): Promise<any> => {
  if (!CometChat) {
    throw new Error('CometChat SDK not loaded');
  }

  try {
    const customMessage = new CometChat.CustomMessage(
      receiverId,
      receiverType === 'group' ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER,
      customType,
      customData
    );

    const message = await CometChat.sendMessage(customMessage);
    console.log('[CometChat] Custom message sent:', message.getId());
    return message;
  } catch (error: any) {
    console.error('[CometChat] Send custom message failed:', error);
    throw error;
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
