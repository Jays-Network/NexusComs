import { io, Socket } from 'socket.io-client';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'securechat-e2ee-key-change-in-production';

export function encryptMessage(message: string): string {
  return CryptoJS.AES.encrypt(message, ENCRYPTION_KEY).toString();
}

export function decryptMessage(encryptedMessage: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
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
