/**
 * Consolidated Authentication & API Client
 * Combines authentication, token management, and API calls
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://7j7y34kk48.execute-api.us-east-1.amazonaws.com/v1';

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Decode JWT token without verification (client-side only)
 */
export function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Extract user information from Cognito ID token
 */
export function getUserFromToken(idToken: string): { name: string; email: string } | null {
  const decoded = decodeJWT(idToken);
  if (!decoded) return null;

  return {
    name: decoded.name || decoded['cognito:username'] || decoded.email?.split('@')[0] || 'User',
    email: decoded.email || '',
  };
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  if (!name) return 'U';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get stored tokens from sessionStorage
 */
function getStoredTokens() {
  if (typeof window === 'undefined') return null;
  
  return {
    accessToken: sessionStorage.getItem('accessToken'),
    refreshToken: sessionStorage.getItem('refreshToken'),
    idToken: sessionStorage.getItem('idToken'),
  };
}

/**
 * Store tokens in sessionStorage
 */
function storeTokens(tokens: { accessToken: string; refreshToken: string; idToken: string }) {
  if (typeof window === 'undefined') return;
  
  sessionStorage.setItem('accessToken', tokens.accessToken);
  sessionStorage.setItem('refreshToken', tokens.refreshToken);
  sessionStorage.setItem('idToken', tokens.idToken);
}

/**
 * Clear all stored tokens
 */
export function clearTokens() {
  if (typeof window === 'undefined') return;
  
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('idToken');
  sessionStorage.removeItem('userName');
  sessionStorage.removeItem('userEmail');
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

export interface LoginParams {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  user: {
    name: string;
    email: string;
  };
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  organization: string;
  role: string;
  description?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    confirmed: boolean;
  };
  requiresVerification: boolean;
}

/**
 * Login to AWS backend
 */
export async function login(params: LoginParams): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: params.email,
        password: params.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Login failed');
    }

    const data = await response.json();

    // Handle various response formats
    const tokens = {
      accessToken: data.access_token || data.accessToken || '',
      refreshToken: data.refresh_token || data.refreshToken || '',
      idToken: data.id_token || data.idToken || data.token || '',
    };

    // Extract user info from token
    const userInfo = getUserFromToken(tokens.idToken);

    const result: LoginResponse = {
      ...tokens,
      user: userInfo || {
        name: params.email.split('@')[0],
        email: params.email,
      },
    };

    // Store tokens
    storeTokens(tokens);

    return result;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Register new user
 */
export async function register(params: RegisterParams): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        name: params.name,
        password: params.password,
        organization: params.organization,
        role: params.role,
        description: params.description || '',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Registration failed');
    }

    const data = await response.json();

    return {
      success: true,
      message: data.message || 'Registration successful',
      user: {
        id: data.user?.id || data.userId || '',
        email: data.user?.email || data.email || params.email,
        confirmed: data.user?.confirmed !== false,
      },
      requiresVerification: data.requiresVerification === true || data.user?.confirmed === false,
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// ============================================================================
// API CALLS
// ============================================================================

export interface SendMessageRequest {
  query: string;
  user_id: string;
}

export interface SendMessageResponse {
  response?: string;
  conversation_id?: string;
  message_id?: string;
  [key: string]: any;
}

/**
 * Send a message to the conversation API
 */
export async function sendMessage(
  conversationId: string,
  query: string,
  userId?: string
): Promise<SendMessageResponse> {
  const tokens = getStoredTokens();
  const userEmail = userId || (typeof window !== 'undefined' ? sessionStorage.getItem('userEmail') : null);

  if (!tokens?.idToken) {
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
        errorMessage = errorData.message || errorMessage;
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
 * Create a new conversation
 */
export async function createConversation(): Promise<{ conversation_id: string }> {
  const tokens = getStoredTokens();
  const userEmail = typeof window !== 'undefined' ? sessionStorage.getItem('userEmail') : null;

  if (!tokens?.idToken || !userEmail) {
    throw new Error('No authentication token found. Please log in.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${tokens.idToken}`,
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