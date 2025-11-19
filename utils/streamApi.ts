// In Replit, both frontend and backend run on the same domain
// Backend runs on port 3000, frontend uses the Replit proxy
const API_URL = typeof window !== 'undefined' && window.location?.origin 
  ? window.location.origin.replace(':8081', ':3000').replace(':5000', ':3000')
  : process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
