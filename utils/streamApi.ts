// Backend hosted on Replit, frontend on Expo.dev
// Get API URL from environment variable (set in Expo.dev build settings)
// For local development, use localhost
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // In web/browser environment, use environment variable
    return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  }
  // In React Native environment
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
};

const API_URL = getApiUrl();

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
