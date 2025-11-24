/**
 * Decode JWT token without verification (for client-side use)
 * Note: In production, you should verify the token signature
 */
export function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString()
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
  if (!decoded) {
    return null;
  }

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

