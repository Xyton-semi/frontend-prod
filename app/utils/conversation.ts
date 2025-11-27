/**
 * Conversation Management API
 * Handles creating conversations, sending messages, and polling for responses
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://7j7y34kk48.execute-api.us-east-1.amazonaws.com/v1';

// TYPES

export interface Conversation {
  id: string;
  name: string;
  total_messages: number;
  created_at: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface NewConversationRequest {
  email: string;
  query: string;
}

export interface NewConversationResponse {
  message_id: string;
  conversation_id: string;
  timestamp: string;
}

export interface SendMessageRequest {
  query: string;
  user_id: string;
}

export interface SendMessageResponse {
  message_id: string;
  timestamp: string;
}

export interface MessageStatus {
  message_id: string;
  status: 'Processing.....' | 'Complete' | 'Error';
  error: string;
  message: string;
  timestamp: string;
}

// TOKEN MANAGEMENT

function getStoredTokens() {
  if (typeof window === 'undefined') return null;
  
  return {
    accessToken: sessionStorage.getItem('accessToken'),
    refreshToken: sessionStorage.getItem('refreshToken'),
    idToken: sessionStorage.getItem('idToken'),
  };
}

function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('userEmail');
}

// API CALLS

/**
 * Create a new conversation with an initial query
 */
export async function createNewConversation(query: string): Promise<NewConversationResponse> {
  const tokens = getStoredTokens();
  const userEmail = getUserEmail();

  if (!tokens?.idToken || !userEmail) {
    throw new Error('No authentication token found. Please log in.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/new_query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${tokens.idToken}`,
      },
      body: JSON.stringify({
        email: userEmail,
        query: query,
      }),
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please log in again.');
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create conversation. Please try again.');
  }
}

/**
 * Send a message to an existing conversation
 */
export async function sendMessageToConversation(
  conversationId: string,
  query: string
): Promise<SendMessageResponse> {
  const tokens = getStoredTokens();
  const userEmail = getUserEmail();

  if (!tokens?.idToken || !userEmail) {
    throw new Error('No authentication token found. Please log in.');
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/conversation/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `bearer ${tokens.idToken}`,
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
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }

      if (response.status === 401 || response.status === 403) {
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
 * Poll for message status and response
 */
export async function getMessageStatus(
  conversationId: string,
  messageId: string
): Promise<MessageStatus> {
  const tokens = getStoredTokens();

  if (!tokens?.idToken) {
    throw new Error('No authentication token found. Please log in.');
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/conversation/${conversationId}/message/${messageId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `bearer ${tokens.idToken}`,
        },
      }
    );

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please log in again.');
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get message status. Please try again.');
  }
}

/**
 * Poll for message completion with automatic retries
 * @param conversationId - The conversation ID
 * @param messageId - The message ID to poll
 * @param onProgress - Callback for progress updates
 * @param maxAttempts - Maximum number of polling attempts (default: 60)
 * @param intervalMs - Polling interval in milliseconds (default: 2000)
 */
export async function pollForMessageCompletion(
  conversationId: string,
  messageId: string,
  onProgress?: (status: MessageStatus) => void,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<MessageStatus> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const status = await getMessageStatus(conversationId, messageId);
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(status);
      }

      // Check if processing is complete
      if (status.status === 'Complete') {
        return status;
      }

      // Check for errors
      if (status.status === 'Error') {
        throw new Error(status.error || 'Message processing failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    } catch (error) {
      // On the last attempt, throw the error
      if (attempts >= maxAttempts - 1) {
        throw error;
      }
      // Otherwise, wait and retry
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }
  }

  throw new Error('Polling timeout: Message took too long to process');
}

/**
 * Get all conversations for the current user
 */
export async function getUserConversations(): Promise<ConversationsResponse> {
  const tokens = getStoredTokens();
  const userEmail = getUserEmail();

  if (!tokens?.idToken || !userEmail) {
    throw new Error('No authentication token found. Please log in.');
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/conversation?user_id=${encodeURIComponent(userEmail)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `bearer ${tokens.idToken}`,
        },
      }
    );

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please log in again.');
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch conversations. Please try again.');
  }
}

/**
 * Helper function to send a message and wait for response
 * This combines sending a message and polling for completion
 */
export async function sendMessageAndWait(
  conversationId: string | null,
  query: string,
  onProgress?: (status: MessageStatus) => void
): Promise<{ conversationId: string; messageId: string; response: MessageStatus }> {
  try {
    let finalConversationId: string;
    let messageId: string;

    // If no conversation ID, create a new conversation
    if (!conversationId) {
      const newConversation = await createNewConversation(query);
      finalConversationId = newConversation.conversation_id;
      messageId = newConversation.message_id;
    } else {
      // Send message to existing conversation
      const messageResponse = await sendMessageToConversation(conversationId, query);
      finalConversationId = conversationId;
      messageId = messageResponse.message_id;
    }

    // Poll for completion
    const response = await pollForMessageCompletion(
      finalConversationId,
      messageId,
      onProgress
    );

    return {
      conversationId: finalConversationId,
      messageId,
      response,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send message and get response. Please try again.');
  }
}