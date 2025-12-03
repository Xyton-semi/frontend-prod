/**
 * Conversation API Client
 * 
 * All API endpoints for managing conversations and messages.
 * Uses AWS Cognito access_token for authentication.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://7j7y34kk48.execute-api.us-east-1.amazonaws.com/v1';

// ============================================================================
// PROXY CONFIGURATION (for CORS handling)
// ============================================================================

/**
 * Set to true to use proxy for API requests (helps with CORS issues)
 * The proxy endpoint should be set up to forward requests to the API
 */
const USE_PROXY = false;

/**
 * Build API URL with proxy if enabled
 */
function buildApiUrl(path: string, queryParams?: Record<string, string>): string {
  let url = USE_PROXY ? `${API_BASE_URL}${path}` : `${API_BASE_URL}${path}`;
  
  // Add query parameters if provided
  if (queryParams && Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  return url;
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Conversation from GET /conversation
 */
export interface Conversation {
  id: string;
  name: string;
  total_messages: number;
  created_at: string;
}

/**
 * Response from GET /conversation?user_id={email}
 */
export interface GetConversationsResponse {
  conversations: Conversation[];
}

/**
 * Response from POST /new_query
 */
export interface NewQueryResponse {
  message_id: string;
  conversation_id: string;
  timestamp: string;
}

/**
 * Response from POST /conversation/{id}/message
 */
export interface NewMessageResponse {
  message_id: string;
  timestamp: string;
}

/**
 * Response from GET /conversation/{id}/message/{msgId} (polling)
 */
export interface MessageStatusResponse {
  message_id: string;
  status: string; // "Processing....." or "Complete"
  error: string;
  message: string; // LLM response when status is "Complete"
  timestamp: string;
}

/**
 * Local message structure for UI
 */
export interface Message {
  id: string;
  conversation_id?: string;
  role?: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  status?: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
  // New API response fields
  index?: number;
  message_by?: 'user' | 'model';
}

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Get authentication headers with bearer token
 * Uses access_token from Cognito
 */
function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot access sessionStorage on server');
  }

  // Use accessToken from Cognito as per API documentation
  const accessToken = sessionStorage.getItem('accessToken');
  
  if (!accessToken) {
    throw new Error('No authentication token found. Please log in.');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `bearer ${accessToken}`,
  };
}

/**
 * Get user email from sessionStorage
 */
function getUserEmail(): string {
  if (typeof window === 'undefined') {
    throw new Error('Cannot access sessionStorage on server');
  }

  const userEmail = sessionStorage.getItem('userEmail');
  
  if (!userEmail) {
    throw new Error('User email not found. Please log in again.');
  }

  return userEmail;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all conversations for the current user
 * GET /conversation?user_id={email}
 */
export async function getAllConversations(): Promise<Conversation[]> {
  try {
    const userEmail = getUserEmail();
    const headers = getAuthHeaders();

    const url = USE_PROXY 
      ? buildApiUrl('/conversation', { user_id: userEmail })
      : `${API_BASE_URL}/conversation?user_id=${encodeURIComponent(userEmail)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Clear tokens and redirect to login
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          window.location.href = '/login';
        }
        throw new Error('Authentication failed. Please log in again.');
      }

      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to fetch conversations: ${response.status} ${errorText}`);
    }

    const data: GetConversationsResponse = await response.json();
    return data.conversations || [];
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Start a new conversation with initial query
 * POST /new_query
 * 
 * Body: { email: string, query: string }
 * Response: { message_id: string, conversation_id: string, timestamp: string }
 */
export async function startNewConversation(query: string): Promise<NewQueryResponse> {
  try {
    const userEmail = getUserEmail();
    const headers = getAuthHeaders();

    const url = USE_PROXY 
      ? buildApiUrl('/new_query')
      : `${API_BASE_URL}/new_query`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: userEmail,
        query: query,
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          window.location.href = '/login';
        }
        throw new Error('Authentication failed. Please log in again.');
      }

      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to start conversation: ${response.status} ${errorText}`);
    }

    const data: NewQueryResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error starting conversation:', error);
    throw error;
  }
}

/**
 * Send a new message in an existing conversation
 * POST /conversation/{conversation_id}/message
 * 
 * Body: { query: string, user_id: string }
 * Response: { message_id: string, timestamp: string }
 */
export async function sendMessageInConversation(
  conversationId: string,
  query: string
): Promise<NewMessageResponse> {
  try {
    const userEmail = getUserEmail();
    const headers = getAuthHeaders();

    const url = USE_PROXY 
      ? buildApiUrl(`/conversation/${conversationId}/message`)
      : `${API_BASE_URL}/conversation/${conversationId}/message`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: query,
        user_id: userEmail,
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          window.location.href = '/login';
        }
        throw new Error('Authentication failed. Please log in again.');
      }

      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to send message: ${response.status} ${errorText}`);
    }

    const data: NewMessageResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Poll for message status and response
 * GET /conversation/{conversation_id}/message/{message_id}
 * 
 * Response: { message_id, status, error, message, timestamp }
 * Status can be "Processing....." or "Complete"
 */
export async function pollMessageStatus(
  conversationId: string,
  messageId: string
): Promise<MessageStatusResponse> {
  try {
    const headers = getAuthHeaders();

    const url = USE_PROXY 
      ? buildApiUrl(`/conversation/${conversationId}/message/${messageId}`)
      : `${API_BASE_URL}/conversation/${conversationId}/message/${messageId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          window.location.href = '/login';
        }
        throw new Error('Authentication failed. Please log in again.');
      }

      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to poll message: ${response.status} ${errorText}`);
    }

    const data: MessageStatusResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error polling message status:', error);
    throw error;
  }
}

/**
 * Poll message status until complete or timeout
 * Uses exponential backoff: 1s → 1.5s → 2.25s → 3.375s → 5s (max)
 * 
 * @param conversationId - Conversation ID
 * @param messageId - Message ID to poll
 * @param maxAttempts - Maximum number of polling attempts (default: 60)
 * @param initialDelay - Initial delay in ms (default: 1000)
 * @param maxDelay - Maximum delay in ms (default: 5000)
 * @returns MessageStatusResponse when complete
 */
export async function pollUntilComplete(
  conversationId: string,
  messageId: string,
  maxAttempts: number = 60,
  initialDelay: number = 1000,
  maxDelay: number = 5000
): Promise<MessageStatusResponse> {
  let attempt = 0;
  let delay = initialDelay;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      const status = await pollMessageStatus(conversationId, messageId);

      // Check if complete
      if (status.status === 'Complete') {
        return status;
      }

      // Check for errors
      if (status.error) {
        throw new Error(status.error);
      }

      // Wait before next poll with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelay);

    } catch (error) {
      console.error(`Polling attempt ${attempt} failed:`, error);
      
      // If it's an auth error, don't retry
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        throw error;
      }
      
      // If it's not the last attempt, wait and retry
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, maxDelay);
      } else {
        throw error;
      }
    }
  }

  throw new Error('Polling timeout: Message did not complete in time');
}

// ============================================================================
// CONVERSATION MESSAGES
// ============================================================================

/**
 * Get all messages for a conversation from the API
 * GET /conversation/{conversation_id}
 * 
 * Response: { messages: [{ id, index, message_by, content }], error: "" }
 */
export async function getConversationMessages(
  conversationId: string
): Promise<Message[]> {
  try {
    const headers = getAuthHeaders();
    const url = USE_PROXY
      ? buildApiUrl(`/conversation/${conversationId}`)
      : `${API_BASE_URL}/conversation/${conversationId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          window.location.href = '/login';
        }
        throw new Error('Authentication failed. Please log in again.');
      }

      if (response.status === 404) {
        console.warn(`Conversation ${conversationId} not found`);
        return [];
      }

      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to fetch messages: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Check for API error
    if (data.error) {
      console.error('API returned error:', data.error);
      return [];
    }

    // Transform API response to our Message format
    const messages: Message[] = (data.messages || []).map((msg: any) => {
      // Map message_by to role
      const role = msg.message_by === 'user' ? 'user' : 'assistant';
      
      return {
        id: msg.id,
        conversation_id: conversationId,
        role: role,
        content: msg.content || '',
        timestamp: msg.timestamp || new Date().toISOString(),
        status: 'complete' as const,
        index: msg.index,
        message_by: msg.message_by,
      };
    });

    // Sort by index to maintain message order
    messages.sort((a, b) => (a.index || 0) - (b.index || 0));

    console.log(`Loaded ${messages.length} messages for conversation ${conversationId}`);
    return messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

// ============================================================================
// LOCAL STORAGE HELPERS (for caching messages)
// ============================================================================

/**
 * Store message locally in localStorage
 */
export function storeMessageLocally(conversationId: string, message: Message): void {
  if (typeof window === 'undefined') return;

  const key = `conversation_${conversationId}`;
  const existing = localStorage.getItem(key);
  const messages: Message[] = existing ? JSON.parse(existing) : [];
  
  messages.push(message);
  localStorage.setItem(key, JSON.stringify(messages));
}

/**
 * Get messages for a conversation from localStorage
 */
export function getLocalMessages(conversationId: string): Message[] {
  if (typeof window === 'undefined') return [];

  const key = `conversation_${conversationId}`;
  const existing = localStorage.getItem(key);
  
  return existing ? JSON.parse(existing) : [];
}

/**
 * Clear messages for a conversation from localStorage
 */
export function clearLocalMessages(conversationId: string): void {
  if (typeof window === 'undefined') return;

  const key = `conversation_${conversationId}`;
  localStorage.removeItem(key);
}