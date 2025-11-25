import { NextRequest, NextResponse } from 'next/server';
import { signUp, login } from '@/utils/cognito';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  organization: string;
  role: string;
  description?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://7j7y34kk48.execute-api.us-east-1.amazonaws.com/v1';

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.password || !body.organization || !body.role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Validate password (Cognito requirements: min 8 chars, uppercase, lowercase, number, special char)
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Register user with Cognito
    const cognitoResponse = await signUp({
      email: body.email,
      password: body.password,
      name: body.name,
      organization: body.organization,
      role: body.role,
    });

    // If user is auto-confirmed, log them in to get a token
    let authToken: string | null = null;
    if (cognitoResponse.userConfirmed) {
      try {
        const authResponse = await login({
          email: body.email,
          password: body.password,
        });
        authToken = authResponse.idToken;
      } catch (loginError) {
        console.error('Auto-login failed:', loginError);
        // Continue without token - user can login separately
      }
    }

    // Call backend signup API if we have a token
    if (authToken) {
      try {
        const backendResponse = await fetch(`${API_BASE_URL}/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${authToken}`,
          },
          body: JSON.stringify({
            email: body.email,
            name: body.name,
            organization: body.organization,
            role: body.role,
            description: body.description || '',
          }),
        });

        if (!backendResponse.ok) {
          const errorData = await backendResponse.json().catch(() => ({}));
          console.error('Backend signup failed:', errorData);
          // Don't fail the whole registration if backend call fails
        } else {
          const backendData = await backendResponse.json();
          console.log('Backend signup successful:', backendData);
        }
      } catch (backendError) {
        console.error('Backend signup error:', backendError);
        // Continue even if backend signup fails - user is registered in Cognito
      }
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: cognitoResponse.userConfirmed 
          ? 'User registered successfully' 
          : 'User registered successfully. Please check your email to verify your account.',
        user: {
          id: cognitoResponse.userId,
          email: cognitoResponse.email,
          confirmed: cognitoResponse.userConfirmed,
        },
        requiresVerification: !cognitoResponse.userConfirmed,
        backendSyncRequired: !authToken, // Flag to indicate backend sync is needed after login
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    
    // Return user-friendly error messages
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = errorMessage.includes('already exists') || 
                      errorMessage.includes('Invalid') ? 400 : 500;
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}