import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/utils/cognito';
import { getUserFromToken } from '@/utils/jwt';

interface LoginRequest {
  email: string;
  password: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://7j7y34kk48.execute-api.us-east-1.amazonaws.com/v1';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Authenticate user with Cognito
    const authResponse = await login({
      email: body.email,
      password: body.password,
    });

    // Extract user info from ID token
    const userInfo = getUserFromToken(authResponse.idToken);

    // Optionally sync user with backend (in case they registered but weren't synced)
    // This is a fallback mechanism - normally users should be synced during registration
    try {
      // Check if user needs to be synced with backend
      // You could add logic here to check if user exists in backend first
      // For now, we'll just attempt to create/update the user record
      
      // Note: This call might fail if user already exists, which is fine
      await fetch(`${API_BASE_URL}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `bearer ${authResponse.idToken}`,
        },
        body: JSON.stringify({
          username: body.email,
          password: body.password,
        }),
      }).catch(() => {
        // Silently fail if user already exists in backend
      });
    } catch (syncError) {
      console.error('Backend sync error (non-critical):', syncError);
      // Don't fail login if backend sync fails
    }

    // Return success response with tokens and user info
    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        tokens: {
          accessToken: authResponse.accessToken,
          refreshToken: authResponse.refreshToken,
        },
        user: userInfo || {
          name: body.email.split('@')[0],
          email: body.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    
    // Return user-friendly error messages
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = errorMessage.includes('Incorrect') || 
                      errorMessage.includes('No account') ||
                      errorMessage.includes('verify') ? 401 : 500;
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}