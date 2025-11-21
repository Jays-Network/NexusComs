// Backend hosted on Replit, frontend on Expo.dev
// Safe API URL initialization that handles all environments
const API_URL = process.env.EXPO_PUBLIC_API_URL ? String(process.env.EXPO_PUBLIC_API_URL).trim() : 'http://localhost:3000';

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
    console.error('Stream token API error:', error);
    throw error;
  }
}
