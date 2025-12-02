/**
 * Conversation API Client
 * Handles all conversation-related API calls including messaging and polling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://7j7y34kk48.execute-api.us-east-1.amazonaws.com/v1';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Conversation {
  id: string;
  name: string;
  total_messages: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status?: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface MessageStatus {
  message_id: string;
  status: string;
  error: string;
  message: string;
  timestamp: string;
}

export interface NewQueryResponse {
  message_id: string;
  conversation_id: string;
  timestamp: string;
}

export interface NewMessageResponse {
  message_id: string;
  timestamp: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get stored authentication tokens
 */
function getStoredTokens() {
  if (typeof window === 'undefined') return null;
  
  return {
    accessToken: sessionStorage.getItem('accessToken'),
    idToken: sessionStorage.getItem('idToken'),
  };
}

/**
 * Get user email from session storage
 */
function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('userEmail');
}

/**
 * Create authorization headers for API requests
 */
function getAuthHeaders(): HeadersInit {
  const tokens = getStoredTokens();
  
  if (!tokens?.idToken) {
    throw new Error('No authentication token found. Please log in.');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `bearer ${tokens.idToken}`,
  };
}

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

/**
 * Get all conversations for the current user
 */
export async function getAllConversations(): Promise<Conversation[]> {
  const userEmail = getUserEmail();
  
  if (!userEmail) {
    throw new Error('User email not found. Please log in.');
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/conversation?user_id=${encodeURIComponent(userEmail)}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`Failed to fetch conversations: ${response.status}`);
    }

    const data = await response.json();
    return data.conversations || [];
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Start a new conversation with an initial query
 */
export async function startNewConversation(query: string): Promise<NewQueryResponse> {
  const userEmail = getUserEmail();
  
  if (!userEmail) {
    throw new Error('User email not found. Please log in.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/new_query`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        email: userEmail,
        query: query,
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`Failed to start conversation: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error starting conversation:', error);
    throw error;
  }
}

// ============================================================================
// MESSAGING
// ============================================================================

/**
 * Send a new message in an existing conversation
 */
export async function sendMessageInConversation(
  conversationId: string,
  query: string
): Promise<NewMessageResponse> {
  const userEmail = getUserEmail();
  
  if (!userEmail) {
    throw new Error('User email not found. Please log in.');
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/conversation/${conversationId}/message`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          query: query,
          user_id: userEmail,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`Failed to send message: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Poll for message response status
 */
export async function pollMessageStatus(
  conversationId: string,
  messageId: string
): Promise<MessageStatus> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversation/${conversationId}/message/${messageId}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`Failed to poll message: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error polling message:', error);
    throw error;
  }
}

/**
 * Poll message with exponential backoff until complete
 * @param conversationId - The conversation ID
 * @param messageId - The message ID to poll
 * @param maxAttempts - Maximum number of polling attempts (default: 60)
 * @param initialDelay - Initial delay in ms (default: 1000)
 * @param maxDelay - Maximum delay between polls in ms (default: 5000)
 */
export async function pollUntilComplete(
  conversationId: string,
  messageId: string,
  maxAttempts: number = 60,
  initialDelay: number = 1000,
  maxDelay: number = 5000
): Promise<MessageStatus> {
  let attempt = 0;
  let delay = initialDelay;

  while (attempt < maxAttempts) {
    try {
      const status = await pollMessageStatus(conversationId, messageId);

      // Check if message is complete
      if (status.status === 'Complete' || status.status === 'complete') {
        return status;
      }

      // Check for errors
      if (status.error) {
        throw new Error(status.error);
      }

      // Wait before next poll with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt, but cap at maxDelay
      delay = Math.min(delay * 1.5, maxDelay);
      attempt++;
    } catch (error) {
      console.error(`Polling attempt ${attempt + 1} failed:`, error);
      
      // If it's an auth error, throw immediately
      if (error instanceof Error && error.message.includes('Authentication')) {
        throw error;
      }

      // For other errors, retry
      if (attempt >= maxAttempts - 1) {
        throw new Error('Maximum polling attempts reached');
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelay);
      attempt++;
    }
  }

  throw new Error('Polling timeout: Message did not complete in time');
}

// ============================================================================
// CONVERSATION HISTORY
// ============================================================================

/**
 * Get conversation messages (implementation depends on if there's a dedicated endpoint)
 * This is a placeholder - adjust based on actual API
 */
export async function getConversationMessages(
  conversationId: string
): Promise<Message[]> {
  // Note: This endpoint may not exist in your API
  // You might need to build message history client-side
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversation/${conversationId}/messages`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      // If endpoint doesn't exist, return empty array
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch messages: ${response.status}`);
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    // Return empty array if endpoint doesn't exist
    return [];
  }
}

// ============================================================================
// LOCAL MESSAGE MANAGEMENT
// ============================================================================

/**
 * Store message locally in localStorage
 */
export function storeMessageLocally(
  conversationId: string,
  message: Message
): void {
  if (typeof window === 'undefined') return;

  const key = `conversation_${conversationId}`;
  const stored = localStorage.getItem(key);
  const messages: Message[] = stored ? JSON.parse(stored) : [];
  
  messages.push(message);
  localStorage.setItem(key, JSON.stringify(messages));
}

/**
 * Get messages from local storage
 */
export function getLocalMessages(conversationId: string): Message[] {
  if (typeof window === 'undefined') return [];

  const key = `conversation_${conversationId}`;
  const stored = localStorage.getItem(key);
  
  return stored ? JSON.parse(stored) : [];
}

/**
 * Clear local messages for a conversation
 */
export function clearLocalMessages(conversationId: string): void {
  if (typeof window === 'undefined') return;

  const key = `conversation_${conversationId}`;
  localStorage.removeItem(key);
}