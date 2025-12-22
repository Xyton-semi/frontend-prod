/**
 * Conversation API Client - WITH FILE ATTACHMENT SUPPORT
 * 
 * All API endpoints for managing conversations and messages.
 * Uses AWS Cognito access_token for authentication.
 */

import type { FileAttachment } from './file-upload';

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
  timestamp: string;
  status?: 'sending' | 'processing' | 'complete' | 'error';
  error?: string;
  index?: number;
  message_by?: 'user' | 'model';
  attachments?: FileAttachment[];
  filenames?: string[];
}

export interface DeleteConversationResponse {
  success: boolean;
  message: string;
}

export interface MessageWithAttachments {
  query: string;
  user_id: string;
  filename?: string[]; // API expects 'filename' (singular) but it's an array
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

/**
 * Start a new conversation with optional file attachments
 * If attachments are present, uses the conversation_id from presigned URL
 */
export async function startNewConversation(
  query: string,
  attachments?: FileAttachment[]
): Promise<NewQueryResponse> {
  try {
    const userEmail = getUserEmail();
    const headers = getAuthHeaders();

    // If we have attachments, use the conversation_id from the first attachment
    // (all attachments should have the same conversation_id from presigned URL)
    const conversationId = attachments && attachments.length > 0 
      ? attachments[0].conversationId 
      : undefined;

    // If we have a conversation ID from attachments, use the existing message endpoint
    if (conversationId) {
      console.log('Using conversation ID from attachments:', conversationId);
      const messageResponse = await sendMessageInConversation(conversationId, query, attachments);
      // Convert NewMessageResponse to NewQueryResponse by adding conversation_id
      return {
        ...messageResponse,
        conversation_id: conversationId,
      };
    }

    // Otherwise, create new conversation without attachments
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
 * Send a message in an existing conversation with optional file attachments
 */
export async function sendMessageInConversation(
  conversationId: string,
  query: string,
  attachments?: FileAttachment[]
): Promise<NewMessageResponse> {
  try {
    const userEmail = getUserEmail();
    const headers = getAuthHeaders();

    const url = USE_PROXY 
      ? buildApiUrl(`/conversation/${conversationId}/message`)
      : `${API_BASE_URL}/conversation/${conversationId}/message`;

    const requestBody: MessageWithAttachments = {
      query: query,
      user_id: userEmail,
    };

    // Add filename if attachments are present
    if (attachments && attachments.length > 0) {
      requestBody.filename = attachments.map(att => att.filename);
      console.log('Sending message with filename:', requestBody.filename);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
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
    
    // Strip thinking tags from the message content
    if (data.message) {
      data.message = stripThinkingTags(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error polling message status:', error);
    throw error;
  }
}

export async function pollUntilComplete(
  conversationId: string,
  messageId: string,
  onProgress?: (partialMessage: string) => void,
  maxAttempts: number = 60,
  initialDelay: number = 1000,
  maxDelay: number = 5000,
  signal?: AbortSignal
): Promise<MessageStatusResponse> {
  let attempt = 0;
  let delay = initialDelay;

  while (attempt < maxAttempts) {
    // Check if aborted
    if (signal?.aborted) {
      throw new DOMException('Polling aborted by user', 'AbortError');
    }

    attempt++;

    try {
      const status = await pollMessageStatus(conversationId, messageId);

      if (status.status === 'Complete') {
        if (onProgress && status.message) {
          onProgress(status.message);
        }
        return status;
      }

      if (status.error) {
        throw new Error(status.error);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelay);

    } catch (error) {
      // Check if this is an abort error
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

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

/**
 * Remove Claude's thinking content from message content
 * Claude sometimes includes internal reasoning that should not be shown to users.
 */
function stripThinkingTags(content: string): string {
  if (!content) return content;
  
  let cleaned = content;
  
  // First, remove content within thinking XML tags
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<antThinking>[\s\S]*?<\/antThinking>/gi, '');
  cleaned = cleaned.replace(/<antthink>[\s\S]*?<\/antthink>/gi, '');
  
  // Handle raw thinking content (no XML tags)
  // Strategy: Find the LAST occurrence of common thinking-to-response transitions
  // and take everything after that point
  
  const thinkingMarkers = [
    'Let me write that.',
    'Alright, so the response should be',
    'So the answer is:',
    'The answer is:',
    'So the response should be',
    'The response should be',
    'Here\'s the response:',
    'My response:',
    'I\'ll respond with:',
    'Let me craft',
    'I should respond with:',
  ];
  
  // Find the last occurrence of any thinking marker
  let lastMarkerIndex = -1;
  let markerLength = 0;
  
  for (const marker of thinkingMarkers) {
    const index = cleaned.lastIndexOf(marker);
    if (index > lastMarkerIndex) {
      lastMarkerIndex = index;
      markerLength = marker.length;
    }
  }
  
  // If we found a marker, take everything after it
  if (lastMarkerIndex !== -1) {
    cleaned = cleaned.substring(lastMarkerIndex + markerLength).trim();
  }
  
  return cleaned;
}

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
      
      // Strip thinking tags from assistant messages
      const cleanContent = role === 'assistant' 
        ? stripThinkingTags(msg.content || '')
        : msg.content || '';
      
      return {
        id: msg.id,
        conversation_id: conversationId,
        role: role,
        content: cleanContent,
        timestamp: msg.timestamp || new Date().toISOString(),
        status: 'complete' as const,
        index: msg.index,
        message_by: msg.message_by,
        filenames: msg.filenames, // Include filenames from API
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
// DELETE CONVERSATION
// ============================================================================

/**
 * Delete a conversation by ID
 */
export async function deleteConversation(conversationId: string): Promise<DeleteConversationResponse> {
  try {
    const headers = getAuthHeaders();
    const url = USE_PROXY
      ? buildApiUrl(`/conversation/${conversationId}`)
      : `${API_BASE_URL}/conversation/${conversationId}`;

    const response = await fetch(url, {
      method: 'DELETE',
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
        // Conversation doesn't exist, treat as success
        clearLocalMessages(conversationId);
        return { 
          success: true, 
          message: 'Conversation not found (already deleted)' 
        };
      }

      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to delete conversation: ${response.status} ${errorText}`);
    }

    // Clear local cache
    clearLocalMessages(conversationId);

    const data = await response.json().catch(() => ({ 
      success: true, 
      message: 'Conversation deleted' 
    }));
    
    return { 
      success: true, 
      message: data.message || 'Conversation deleted successfully' 
    };
  } catch (error) {
    console.error('Error deleting conversation:', error);
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