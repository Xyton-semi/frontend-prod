import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/utils/cognito';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  organization: string;
  role: string;
  description?: string;
}

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

