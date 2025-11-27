/**
 * Authentication & API Client (NO JWT decoding)
 * Works with Cognito but doesn't decode tokens
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://7j7y34kk48.execute-api.us-east-1.amazonaws.com/v1';

// ============================================================================
// SIMPLE AUTHENTICATION (No JWT decoding)
// ============================================================================

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
 * Login function - NO JWT decoding
 */
export async function login(params: LoginParams): Promise<LoginResponse> {
  try {
    // console.log('🔐 Attempting login for:', params.email);
    
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
    
    // console.log('📦 Login response received');

    // Extract tokens - try all possible field names but DON'T decode them
    const tokens = {
      accessToken: 
        data.AuthenticationResult?.AccessToken ||
        data.AuthResult?.AccessToken ||
        data.tokens?.AccessToken ||
        data.tokens?.access_token ||
        data.AccessToken ||
        data.access_token ||
        data.accessToken ||
        '',
      
      refreshToken:
        data.AuthenticationResult?.RefreshToken ||
        data.AuthResult?.RefreshToken ||
        data.tokens?.RefreshToken ||
        data.tokens?.refresh_token ||
        data.RefreshToken ||
        data.refresh_token ||
        data.refreshToken ||
        '',
      
      idToken:
        data.AuthenticationResult?.IdToken ||
        data.AuthResult?.IdToken ||
        data.tokens?.IdToken ||
        data.tokens?.id_token ||
        data.IdToken ||
        data.id_token ||
        data.idToken ||
        data.token ||
        '',
    };

    // console.log('🔑 Tokens extracted:', {
    //   accessToken: tokens.accessToken ? '✓' : '✗',
    //   refreshToken: tokens.refreshToken ? '✓' : '✗',
    //   idToken: tokens.idToken ? '✓' : '✗',
    // });

    // Create user info from email (NO JWT decoding)
    const emailName = params.email.split('@')[0];
    const nameParts = emailName.split(/[._\-]/).map(p => 
      p.charAt(0).toUpperCase() + p.slice(1)
    );
    
    const result: LoginResponse = {
      ...tokens,
      user: {
        name: nameParts.join(' '),
        email: params.email,
      },
    };

    // Store everything in sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('accessToken', tokens.accessToken);
      sessionStorage.setItem('refreshToken', tokens.refreshToken);
      sessionStorage.setItem('idToken', tokens.idToken);
      sessionStorage.setItem('userName', result.user.name);
      sessionStorage.setItem('userEmail', result.user.email);
      
      // console.log('✅ Login successful!');
      // console.log('User:', result.user.name);
      // console.log('Email:', result.user.email);
    }

    return result;
    
  } catch (error) {
    console.error('❌ Login error:', error);
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
// DEPRECATED FUNCTIONS (For backwards compatibility)
// ============================================================================

/**
 * @deprecated - API doesn't use idToken, but keeping for compatibility
 */
export function decodeJWT(token: string): any {
  console.warn('decodeJWT is deprecated - API does not use JWT tokens');
  return null;
}

/**
 * @deprecated - API doesn't use idToken, but keeping for compatibility
 */
export function getUserFromToken(idToken: string): { name: string; email: string } | null {
  console.warn('getUserFromToken is deprecated - API does not use JWT tokens');
  return null;
}