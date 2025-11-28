/**
 * Conversation API - Based on Actual API Documentation
 * NO authentication headers needed (per API docs)
 * Extended polling timeout for long-running AI models
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
// USER EMAIL MANAGEMENT
// ============================================================================

/**
 * Get user email from sessionStorage
 */
function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('userEmail');
}

/**
 * Check if user is authenticated (has email)
 */
export function isAuthenticated(): boolean {
  const email = getUserEmail();
  return !!(email && email.trim().length > 0);
}

// ============================================================================
// API CALLS (No authentication headers per API docs)
// ============================================================================

/**
 * Create a new conversation with an initial query
 * 
 * API: POST /new_query
 * Body: { "email": "user@example.com", "query": "Hello" }
 * Response: { "message_id": "...", "conversation_id": "...", "timestamp": "..." }
 */
export async function createNewConversation(query: string): Promise<NewConversationResponse> {
  const userEmail = getUserEmail();

  if (!userEmail) {
    throw new Error('Please sign in to start a conversation');
  }

  try {
    console.log('📤 Creating conversation for:', userEmail);
    console.log('Query:', query);
    
    const response = await fetch(`${API_BASE_URL}/new_query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // NO Authorization header per API docs
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
        const text = await response.text();
        errorMessage = text || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Conversation created:', data.conversation_id);
    console.log('Message ID:', data.message_id);
    
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
 * 
 * API: POST /conversation/{conversation_id}/message
 * Body: { "query": "message", "user_id": "user@example.com" }
 * Response: { "message_id": "...", "timestamp": "..." }
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
    console.log('📤 Sending message to conversation:', conversationId);
    console.log('Query:', query);
    
    const response = await fetch(
      `${API_BASE_URL}/conversation/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // NO Authorization header per API docs
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
        const text = await response.text();
        errorMessage = text || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Message sent:', data.message_id);
    
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
 * Get message status and response
 * 
 * API: GET /conversation/{conversation_id}/message/{message_id}
 * Response: { 
 *   "message_id": "...", 
 *   "status": "Processing....." | "Complete" | "Error",
 *   "error": "",
 *   "message": "LLM output text",
 *   "timestamp": "..."
 * }
 */
export async function getMessageStatus(
  conversationId: string,
  messageId: string
): Promise<MessageStatus> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/conversation/${conversationId}/message/${messageId}`,
      {
        method: 'GET',
        // NO Authorization header per API docs
      }
    );

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const text = await response.text();
        errorMessage = text || errorMessage;
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
 * 
 * Extended timeout: 180 attempts × 2 seconds = 6 minutes max
 * (AI models can take a while to process complex queries)
 * 
 * @param conversationId - The conversation ID
 * @param messageId - The message ID to poll
 * @param onProgress - Optional callback for progress updates
 * @param maxAttempts - Maximum polling attempts (default: 180 = 6 minutes)
 * @param intervalMs - Interval between polls in milliseconds (default: 2000ms = 2 seconds)
 */
export async function pollForMessageCompletion(
  conversationId: string,
  messageId: string,
  onProgress?: (status: MessageStatus) => void,
  maxAttempts: number = 180, // 6 minutes (was 60 = 2 minutes)
  intervalMs: number = 2000
): Promise<MessageStatus> {
  let attempts = 0;

  console.log(`⏳ Starting to poll for message ${messageId}`);
  console.log(`Max attempts: ${maxAttempts} (${(maxAttempts * intervalMs) / 1000}s total)`);

  while (attempts < maxAttempts) {
    try {
      const status = await getMessageStatus(conversationId, messageId);
      
      console.log(`Poll attempt ${attempts + 1}/${maxAttempts}:`, status.status);
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(status);
      }

      // Check if processing is complete
      if (status.status === 'Complete') {
        console.log('✅ Message processing complete!');
        console.log('Response:', status.message);
        return status;
      }

      // Check for errors
      if (status.status === 'Error') {
        console.error('❌ Processing error:', status.error);
        throw new Error(status.error || 'Message processing failed');
      }

      // Still processing, wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    } catch (error) {
      console.error(`Poll attempt ${attempts + 1} failed:`, error);
      
      // On the last attempt, throw the error
      if (attempts >= maxAttempts - 1) {
        throw error;
      }
      
      // Otherwise, wait and retry
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }
  }

  console.error('❌ Polling timeout after', attempts, 'attempts');
  throw new Error(`Polling timeout: AI model took longer than ${(maxAttempts * intervalMs) / 60000} minutes to respond. Please try again.`);
}

/**
 * Get all conversations for the current user
 * 
 * API: GET /conversation?user_id=user@example.com
 * Response: { "conversations": [ { "id": "...", "name": "...", "total_messages": 0, "created_at": "..." } ] }
 */
export async function getUserConversations(): Promise<ConversationsResponse> {
  const userEmail = getUserEmail();

  if (!userEmail) {
    throw new Error('Please sign in to view conversations');
  }

  try {
    console.log('📥 Fetching conversations for:', userEmail);
    
    const response = await fetch(
      `${API_BASE_URL}/conversation?user_id=${encodeURIComponent(userEmail)}`,
      {
        method: 'GET',
        // NO Authorization header per API docs
      }
    );

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const text = await response.text();
        errorMessage = text || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Fetched conversations:', data.conversations.length);
    
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
 * This combines sending a message and polling for completion
 * 
 * @param conversationId - The conversation ID (null to create new)
 * @param query - The message to send
 * @param onProgress - Optional callback for progress updates
 * @returns The complete result including conversation ID, message ID, and AI response
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

    // Poll for completion (with extended timeout)
    console.log('⏳ Waiting for AI response (this may take a few minutes)...');
    const response = await pollForMessageCompletion(
      finalConversationId,
      messageId,
      onProgress,
      180, // 6 minutes max (180 attempts × 2s)
      2000 // Poll every 2 seconds
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