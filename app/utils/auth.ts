/**
 * Consolidated Authentication & API Client
 * Enhanced with better debugging and flexible token parsing
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://7j7y34kk48.execute-api.us-east-1.amazonaws.com/v1';

// Enable debug logging (set to false in production)
const DEBUG_MODE = true;

function debugLog(message: string, data?: any) {
  if (DEBUG_MODE) {
    if (data !== undefined) {
      console.log(`[Auth Debug] ${message}`, data);
    } else {
      console.log(`[Auth Debug] ${message}`);
    }
  }
}

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
    console.error('Error decoding JWT - token may be invalid');
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
 * Validate email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract tokens from various response formats
 * Handles multiple API response structures flexibly
 */
function extractTokensFromResponse(data: any): { accessToken: string; refreshToken: string; idToken: string } | null {
  debugLog('Attempting to extract tokens from response structure');
  
  // Check if data is wrapped in a data property
  const responseData = data.data || data;
  
  // Try to find tokens in various formats
  const accessToken = 
    responseData.access_token || 
    responseData.accessToken || 
    responseData.AccessToken ||
    responseData.tokens?.access_token ||
    responseData.tokens?.accessToken ||
    responseData.authenticationResult?.AccessToken ||
    responseData.AuthenticationResult?.AccessToken ||
    '';
    
  const refreshToken = 
    responseData.refresh_token || 
    responseData.refreshToken || 
    responseData.RefreshToken ||
    responseData.tokens?.refresh_token ||
    responseData.tokens?.refreshToken ||
    responseData.authenticationResult?.RefreshToken ||
    responseData.AuthenticationResult?.RefreshToken ||
    '';
    
  const idToken = 
    responseData.id_token || 
    responseData.idToken || 
    responseData.IdToken ||
    responseData.token ||
    responseData.tokens?.id_token ||
    responseData.tokens?.idToken ||
    responseData.authenticationResult?.IdToken ||
    responseData.AuthenticationResult?.IdToken ||
    '';

  debugLog('Token extraction results:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hasIdToken: !!idToken,
    accessTokenLength: accessToken?.length || 0,
    idTokenLength: idToken?.length || 0
  });

  // We need at least an ID token for authentication
  if (!idToken) {
    console.error('No ID token found in response. Response structure:', Object.keys(responseData));
    return null;
  }

  return {
    accessToken: accessToken || idToken, // Fallback to idToken if no accessToken
    refreshToken: refreshToken || '',
    idToken: idToken
  };
}

/**
 * Login to AWS backend
 */
export async function login(params: LoginParams): Promise<LoginResponse> {
  // Validate inputs client-side
  if (!validateEmail(params.email)) {
    throw new Error('Invalid email format');
  }
  
  if (!params.password || params.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  try {
    const requestBody = {
      username: params.email,
      password: params.password,
    };

    debugLog('Attempting login for:', params.email);

    const response = await fetch(`${API_BASE_URL}/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    debugLog('Login response status:', response.status);

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = 'Login failed';
      
      try {
        const errorData = await response.json();
        debugLog('Error response data:', errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }

      // Provide specific error messages based on status code
      if (response.status === 401) {
        throw new Error('Invalid email or password');
      } else if (response.status === 404) {
        throw new Error('User not found. Please check your email or sign up.');
      } else if (response.status === 403) {
        throw new Error('Account not verified. Please check your email for verification link.');
      } else if (response.status === 500) {
        throw new Error('Server error. Please try again later.');
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    debugLog('Login response received (tokens hidden for security)');
    
    // Log response structure without sensitive data
    const responseStructure = Object.keys(data).reduce((acc, key) => {
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('password')) {
        acc[key] = '[HIDDEN]';
      } else {
        acc[key] = typeof data[key];
      }
      return acc;
    }, {} as any);
    debugLog('Response structure:', responseStructure);

    // Extract tokens using flexible parser
    const tokens = extractTokensFromResponse(data);
    
    if (!tokens) {
      console.error('Failed to extract tokens from response');
      console.error('Available fields in response:', Object.keys(data));
      throw new Error('Authentication failed - unable to extract tokens from server response');
    }

    // Validate we have the minimum required token
    if (!tokens.idToken) {
      console.error('No ID token found after extraction');
      throw new Error('Authentication failed - no ID token received');
    }

    // Extract user info from token
    const userInfo = getUserFromToken(tokens.idToken);
    
    if (!userInfo) {
      console.error('Failed to extract user info from ID token');
      throw new Error('Authentication failed - invalid user token');
    }

    debugLog('User info extracted:', { email: userInfo.email, name: userInfo.name });

    const result: LoginResponse = {
      ...tokens,
      user: userInfo,
    };

    // Store tokens
    storeTokens(tokens);
    
    console.log('✅ Login successful for:', userInfo.email);

    return result;
  } catch (error) {
    console.error('❌ Login error for:', params.email);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('An unexpected error occurred during login');
  }
}

/**
 * Register new user
 */
export async function register(params: RegisterParams): Promise<RegisterResponse> {
  // Validate inputs client-side
  if (!validateEmail(params.email)) {
    throw new Error('Invalid email format');
  }
  
  if (!params.password || params.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  
  if (!params.name.trim()) {
    throw new Error('Name is required');
  }
  
  if (!params.organization.trim()) {
    throw new Error('Organization is required');
  }
  
  if (!params.role.trim()) {
    throw new Error('Role is required');
  }

  try {
    const requestBody = {
      email: params.email,
      name: params.name,
      password: params.password,
      organization: params.organization,
      role: params.role,
      description: params.description || '',
    };

    debugLog('Attempting registration for:', params.email);

    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    debugLog('Registration response status:', response.status);

    if (!response.ok) {
      let errorMessage = 'Registration failed';
      
      try {
        const errorData = await response.json();
        debugLog('Registration error data:', errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }

      if (response.status === 409 || errorMessage.toLowerCase().includes('already exists')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      } else if (response.status === 400) {
        throw new Error(errorMessage || 'Invalid registration data. Please check all fields.');
      } else if (response.status === 500) {
        throw new Error('Server error. Please try again later.');
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Registration successful for:', params.email);

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
    console.error('❌ Registration error for:', params.email);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('An unexpected error occurred during registration');
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
        clearTokens();
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
      if (response.status === 401 || response.status === 403) {
        clearTokens();
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`Failed to create conversation: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create conversation. Please try again.');
  }
}