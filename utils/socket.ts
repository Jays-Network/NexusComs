import { io, Socket } from 'socket.io-client';
import CryptoJS from 'crypto-js';

let ENCRYPTION_KEY: string | null = null;
let CURRENT_USER_ID: string | null = null;

async function getEncryptionKey(userId: string): Promise<string> {
  // Validate userId to prevent crashes
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Invalid userId: userId must be a non-empty string');
  }
  
  if (ENCRYPTION_KEY && CURRENT_USER_ID === userId) {
    return ENCRYPTION_KEY;
  }
  
  // Derive a deterministic key from userId + server secret
  // This ensures all devices for the same user can decrypt messages
  const serverSecret = process.env.EXPO_PUBLIC_ENCRYPTION_SECRET || 'default-secret-change-in-production';
  const derivedKey = CryptoJS.PBKDF2(userId, serverSecret, {
    keySize: 256/32,
    iterations: 1000
  }).toString();
  
  ENCRYPTION_KEY = derivedKey;
  CURRENT_USER_ID = userId;
  return derivedKey;
}

export async function encryptMessage(message: string, userId: string): Promise<string> {
  try {
    if (!userId) {
      throw new Error('userId is required for encryption');
    }
    const key = await getEncryptionKey(userId);
    return CryptoJS.AES.encrypt(message, key).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw error; // Re-throw to let caller handle it
  }
}

export async function decryptMessage(encryptedMessage: string, userId: string): Promise<string> {
  try {
    if (!userId) {
      console.warn('Decryption skipped: userId is missing');
      return '[User ID missing]';
    }
    if (!encryptedMessage) {
      return '[No content]';
    }
    const key = await getEncryptionKey(userId);
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || '[Decryption failed]';
  } catch (error) {
    console.error('Decryption error:', error);
    return '[Decryption failed]';
  }
}

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    socketInstance = io(API_URL, {
      transports: ['websocket'],
      autoConnect: false
    });
  }
  return socketInstance;
}

export function connectSocket(userId: string) {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
    socket.emit('authenticate', userId);
  }
}

export function disconnectSocket() {
  if (socketInstance?.connected) {
    socketInstance.disconnect();
  }
}
