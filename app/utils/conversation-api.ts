/**
 * Conversation API Client - WITH STREAMING SUPPORT
 * 
 * All API endpoints for managing conversations and messages.
 * Uses AWS Cognito access_token for authentication.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://7j7y34kk48.execute-api.us-east-1.amazonaws.com/v1';

// ============================================================================
// PROXY CONFIGURATION (for CORS handling)
// ============================================================================

const USE_PROXY = false;

function buildApiUrl(path: string, queryParams?: Record<string, string>): string {
  let url = USE_PROXY ? `${API_BASE_URL}${path}` : `${API_BASE_URL}${path}`;
  
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

export interface Conversation {
  id: string;
  name: string;
  total_messages: number;
  created_at: string;
}

export interface GetConversationsResponse {
  conversations: Conversation[];
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

export interface MessageStatusResponse {
  message_id: string;
  status: string;
  error: string;
  message: string;
  timestamp: string;
}

export interface Message {
  id: string;
  conversation_id?: string;
  role?: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  status?: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
  index?: number;
  message_by?: 'user' | 'model';
}

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot access sessionStorage on server');
  }

  const accessToken = sessionStorage.getItem('accessToken');
  
  if (!accessToken) {
    throw new Error('No authentication token found. Please log in.');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `bearer ${accessToken}`,
  };
}

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
 * Poll message status until complete with streaming callback
 * 
 * @param conversationId - Conversation ID
 * @param messageId - Message ID to poll
 * @param onProgress - Callback for streaming progress updates
 * @param maxAttempts - Maximum number of polling attempts (default: 60)
 * @param initialDelay - Initial delay in ms (default: 1000)
 * @param maxDelay - Maximum delay in ms (default: 5000)
 * @returns MessageStatusResponse when complete
 */
export async function pollUntilComplete(
  conversationId: string,
  messageId: string,
  onProgress?: (partialMessage: string) => void,
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
        // Final update with complete message
        if (onProgress && status.message) {
          onProgress(status.message);
        }
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
      
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        throw error;
      }
      
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

    if (data.error) {
      console.error('API returned error:', data.error);
      return [];
    }

    const messages: Message[] = (data.messages || []).map((msg: any) => {
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

    messages.sort((a, b) => (a.index || 0) - (b.index || 0));

    console.log(`Loaded ${messages.length} messages for conversation ${conversationId}`);
    return messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

export function storeMessageLocally(conversationId: string, message: Message): void {
  if (typeof window === 'undefined') return;

  const key = `conversation_${conversationId}`;
  const existing = localStorage.getItem(key);
  const messages: Message[] = existing ? JSON.parse(existing) : [];
  
  messages.push(message);
  localStorage.setItem(key, JSON.stringify(messages));
}

export function getLocalMessages(conversationId: string): Message[] {
  if (typeof window === 'undefined') return [];

  const key = `conversation_${conversationId}`;
  const existing = localStorage.getItem(key);
  
  return existing ? JSON.parse(existing) : [];
}

export function clearLocalMessages(conversationId: string): void {
  if (typeof window === 'undefined') return;

  const key = `conversation_${conversationId}`;
  localStorage.removeItem(key);
}