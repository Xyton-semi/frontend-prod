/**
 * Conversation API - WITH Authentication Headers
 * Your API returns 401, so it DOES need auth tokens
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://7j7y34kk48.execute-api.us-east-1.amazonaws.com/v1';

// ============================================================================
// TYPES
// ============================================================================

export interface Conversation {
  id: string;
  name: string;
  total_messages: number;
  created_at: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface NewConversationResponse {
  message_id: string;
  conversation_id: string;
  timestamp: string;
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

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Get authentication token (tries multiple token types)
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try different token types in order of preference
  const idToken = sessionStorage.getItem('idToken');
  const accessToken = sessionStorage.getItem('accessToken');
  
  // Return the first non-empty token
  if (idToken && idToken.trim() !== '') return idToken;
  if (accessToken && accessToken.trim() !== '') return accessToken;
  
  return null;
}

/**
 * Get user email
 */
function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('userEmail');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const email = getUserEmail();
  const token = getAuthToken();
  
  // User is authenticated if they have email
  // Token is optional depending on API requirements
  return !!(email && email.trim().length > 0);
}

/**
 * Get auth headers for API requests
 */
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Add Authorization header if we have a token
  if (token && token.trim() !== '') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Create a new conversation with an initial query
 */
export async function createNewConversation(query: string): Promise<NewConversationResponse> {
  const userEmail = getUserEmail();

  if (!userEmail) {
    throw new Error('Please sign in to start a conversation');
  }

  try {
    // console.log('📤 Creating conversation for:', userEmail);
    
    const headers = getAuthHeaders();
    // console.log('Headers:', headers);
    
    const response = await fetch(`${API_BASE_URL}/new_query`, {
      method: 'POST',
      headers: headers,
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

      if (response.status === 401) {
        throw new Error('Authentication failed. Your session may have expired. Please sign in again.');
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    // console.log('✅ Conversation created:', data.conversation_id);
    
    return data;
  } catch (error) {
    console.error('❌ Failed to create conversation:', error);
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
  const userEmail = getUserEmail();

  if (!userEmail) {
    throw new Error('Please sign in to send messages');
  }

  try {
    // console.log('📤 Sending message to conversation:', conversationId);
    
    const headers = getAuthHeaders();
    
    const response = await fetch(
      `${API_BASE_URL}/conversation/${conversationId}/message`,
      {
        method: 'POST',
        headers: headers,
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

      if (response.status === 401) {
        throw new Error('Authentication failed. Please sign in again.');
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    // console.log('✅ Message sent:', data.message_id);
    
    return data;
  } catch (error) {
    console.error('❌ Failed to send message:', error);
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
  try {
    const headers = getAuthHeaders();
    
    const response = await fetch(
      `${API_BASE_URL}/conversation/${conversationId}/message/${messageId}`,
      {
        method: 'GET',
        headers: headers,
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
        // console.log('✅ Message processing complete');
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
  const userEmail = getUserEmail();

  if (!userEmail) {
    throw new Error('Please sign in to view conversations');
  }

  try {
    // console.log('📥 Fetching conversations for:', userEmail);
    
    const headers = getAuthHeaders();
    
    const response = await fetch(
      `${API_BASE_URL}/conversation?user_id=${encodeURIComponent(userEmail)}`,
      {
        method: 'GET',
        headers: headers,
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

      throw new Error(errorMessage);
    }

    const data = await response.json();
    // console.log('✅ Fetched conversations:', data.conversations.length);
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch conversations. Please try again.');
  }
}

/**
 * Helper function to send a message and wait for response
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
      console.log('🆕 Creating new conversation...');
      const newConversation = await createNewConversation(query);
      finalConversationId = newConversation.conversation_id;
      messageId = newConversation.message_id;
    } else {
      // Send message to existing conversation
      console.log('📨 Sending to existing conversation...');
      const messageResponse = await sendMessageToConversation(conversationId, query);
      finalConversationId = conversationId;
      messageId = messageResponse.message_id;
    }

    // Poll for completion
    console.log('⏳ Polling for response...');
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