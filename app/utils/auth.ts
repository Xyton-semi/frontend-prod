/**
 * Consolidated Authentication & API Client
 * SECURITY IMPROVEMENTS:
 * - Never logs passwords
 * - Validates responses properly
 * - Handles authentication errors correctly
 * - Prevents password exposure in console/network logs
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
 * Validate password requirements
 */
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true };
}

/**
 * Login to AWS backend
 * SECURITY: Password is never logged and sent securely to backend
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
    // SECURITY: Create request payload (password will be sent, but never logged)
    const requestBody = {
      username: params.email,
      password: params.password,
    };

    console.log('Attempting login for:', params.email); // Only log email, never password

    const response = await fetch(`${API_BASE_URL}/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = 'Login failed';
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If JSON parsing fails, try text
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
    console.log('Login response received (tokens hidden for security)');

    // Validate response structure
    const tokens = {
      accessToken: data.access_token || data.accessToken || data.AccessToken || '',
      refreshToken: data.refresh_token || data.refreshToken || data.RefreshToken || '',
      idToken: data.id_token || data.idToken || data.IdToken || data.token || '',
    };

    // Ensure we have all required tokens
    if (!tokens.accessToken || !tokens.idToken) {
      console.error('Invalid token response from server');
      throw new Error('Authentication failed - invalid server response');
    }

    // Extract user info from token
    const userInfo = getUserFromToken(tokens.idToken);
    
    if (!userInfo) {
      console.error('Failed to extract user info from token');
      throw new Error('Authentication failed - invalid user token');
    }

    const result: LoginResponse = {
      ...tokens,
      user: userInfo,
    };

    // Store tokens
    storeTokens(tokens);
    
    console.log('Login successful for:', userInfo.email);

    return result;
  } catch (error) {
    // SECURITY: Never log the password in error cases
    console.error('Login error for:', params.email);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('An unexpected error occurred during login');
  }
}

/**
 * Register new user
 * SECURITY: Password is validated and never logged
 */
export async function register(params: RegisterParams): Promise<RegisterResponse> {
  // Validate inputs client-side
  if (!validateEmail(params.email)) {
    throw new Error('Invalid email format');
  }
  
  const passwordValidation = validatePassword(params.password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message || 'Invalid password');
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

    console.log('Attempting registration for:', params.email); // Only log email

    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorMessage = 'Registration failed';
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }

      // Provide specific error messages
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
    console.log('Registration successful for:', params.email);

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
    console.error('Registration error for:', params.email);
    
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
        clearTokens(); // Clear invalid tokens
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