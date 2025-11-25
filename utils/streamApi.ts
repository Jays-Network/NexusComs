// Backend hosted on Replit, frontend on Expo.dev
// Safe API URL initialization - never parse undefined
let API_URL = 'http://localhost:3000'; // Default fallback
if (process.env.EXPO_PUBLIC_API_URL && typeof process.env.EXPO_PUBLIC_API_URL === 'string' && process.env.EXPO_PUBLIC_API_URL.length > 0) {
  API_URL = process.env.EXPO_PUBLIC_API_URL.trim();
}

export interface StreamTokenResponse {
  token: string;
  userId: string;
  apiKey: string;
}

export async function getStreamToken(
  userId: string,
  userName: string,
  userImage?: string
): Promise<StreamTokenResponse> {
  try {
    const response = await fetch(`${API_URL}/api/auth/stream-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        userName,
        userImage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get Stream token');
    }

    return await response.json();
  } catch (error) {
    console.warn('⚠️ Stream token request failed (backend may be down):', error);
    throw error;
  }
}
