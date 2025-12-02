/**
 * Authentication utilities for AWS Cognito
 * * NOTE: This app uses AWS Cognito Amplify for authentication.
 * Cognito handles the actual login/signup and returns tokens.
 * Your backend APIs use the access_token from Cognito in the Authorization header.
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
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];
    if (!base64Url) {
      return null;
    }

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
export function getStoredTokens() {
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
export function storeTokens(tokens: { accessToken: string; refreshToken: string; idToken: string }) {
  if (typeof window === 'undefined') return;
  
  sessionStorage.setItem('accessToken', tokens.accessToken);
  sessionStorage.setItem('refreshToken', tokens.refreshToken);
  sessionStorage.setItem('idToken', tokens.idToken);
}

/**
 * Clear all stored tokens and user data
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
// AUTHENTICATION - COGNITO AMPLIFY
// ============================================================================

/**
 * Register/Signup new user
 * This calls your backend's /signup endpoint
 */
export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  organization: string;
  role: string;
  description?: string;
}

export interface RegisterResponse {
  message: string;
  timestamp: string;
  requiresVerification?: boolean;
}

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
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Login via backend /signin endpoint
 */
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

export async function login(params: LoginParams): Promise<LoginResponse> {
  try {
    console.log('Login attempt for:', params.email);
    
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

    console.log('Login response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Login failed with error:', errorData);
      throw new Error(errorData.message || errorData.error || 'Login failed');
    }

    const data = await response.json();
    console.log('Login response data keys:', Object.keys(data));

    // Extract tokens from response (your API returns access_token, refresh_token)
    const accessToken = data.access_token || '';
    const refreshToken = data.refresh_token || '';
    // Use accessToken as idToken since your API doesn't return separate id_token
    const idToken = data.id_token || accessToken;
    
    const tokens = {
      accessToken,
      idToken,
      refreshToken,
    };

    console.log('Token status:', {
      accessToken: accessToken ? '✓' : '✗',
      refreshToken: refreshToken ? '✓' : '✗',
      idToken: idToken ? '✓' : '✗',
    });

    // Validate that we got at least an accessToken
    if (!tokens.accessToken) {
      console.error('❌ No access_token found in response!');
      throw new Error('Invalid login response: missing authentication token');
    }

    // Extract user info from response
    const userInfo = {
      name: data.name || params.email.split('@')[0],
      email: data.email || params.email,
    };

    console.log('User info:', userInfo);

    const result: LoginResponse = {
      ...tokens,
      user: userInfo,
    };

    // Store tokens in sessionStorage
    storeTokens(tokens);
    
    // Store user info
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('userName', userInfo.name);
      sessionStorage.setItem('userEmail', userInfo.email);
    }

    console.log('✅ Login successful!');
    return result;
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  const tokens = getStoredTokens();
  return !!(tokens?.accessToken && tokens?.idToken);
}

/**
 * Get current user info from stored tokens
 */
export function getCurrentUser(): { name: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  
  const userName = sessionStorage.getItem('userName');
  const userEmail = sessionStorage.getItem('userEmail');
  
  if (userName && userEmail) {
    return { name: userName, email: userEmail };
  }
  
  // Fallback: try to decode from idToken
  const tokens = getStoredTokens();
  if (tokens?.idToken) {
    return getUserFromToken(tokens.idToken);
  }
  
  return null;
}