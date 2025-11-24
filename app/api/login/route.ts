import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/utils/cognito';
import { getUserFromToken } from '@/utils/jwt';

interface LoginRequest {
  email: string;
  password: string;
}

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

    // Return success response with tokens and user info
    // Note: In production, consider using httpOnly cookies for tokens instead of returning them in the response
    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        tokens: {
          accessToken: authResponse.accessToken,
          refreshToken: authResponse.refreshToken,
          idToken: authResponse.idToken,
          expiresIn: authResponse.expiresIn,
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

