// app/utils/api-client.ts
/**
 * API Client for authenticated requests to AWS backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export interface SendMessageRequest {
  query: string;
  user_id: string;
}

export interface SendMessageResponse {
  // Define based on your actual API response structure
  response?: string;
  conversation_id?: string;
  message_id?: string;
  [key: string]: any;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

/**
 * Get the stored access token from localStorage
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

/**
 * Get the stored ID token from localStorage (use this for API calls)
 */
function getIdToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('idToken');
}

/**
 * Get user email from localStorage
 */
function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userEmail');
}

/**
 * Send a message to the conversation API
 */
export async function sendMessage(
  conversationId: string,
  query: string,
  userId?: string
): Promise<SendMessageResponse> {
  const token = getIdToken(); // AWS typically uses ID token for API Gateway authorization
  const userEmail = userId || getUserEmail();

  if (!token) {
    throw new Error('No authentication token found. Please log in.');
  }

  if (!userEmail) {
    throw new Error('User email not found. Please log in again.');
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/conversation/${conversationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Try both lowercase and uppercase 'Bearer'
          'Authorization': `bearer ${token}`,
        },
        body: JSON.stringify({
          query: query,
          user_id: userEmail,
        }),
      }
    );

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }

      if (response.status === 401 || response.status === 403) {
        // Token might be expired
        throw new Error('Authentication failed. Please log in again.');
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send message. Please try again.');
  }
}

/**
 * Create a new conversation (if needed)
 */
export async function createConversation(): Promise<{ conversation_id: string }> {
  const token = getIdToken();
  const userEmail = getUserEmail();

  if (!token || !userEmail) {
    throw new Error('No authentication token found. Please log in.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: userEmail,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error('Failed to create conversation. Please try again.');
  }
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAuthToken(): Promise<boolean> {
  // This would need to be implemented based on your Cognito setup
  // For now, redirect to login if token is expired
  return false;
}