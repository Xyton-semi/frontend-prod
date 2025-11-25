import { CognitoIdentityProviderClient, SignUpCommand, AdminInitiateAuthCommand, InitiateAuthCommand, AuthFlowType } from '@aws-sdk/client-cognito-identity-provider';
import crypto from 'crypto';

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // Will use IAM role if credentials are not provided
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;

// Helper function to compute secret hash
function computeSecretHash(username: string): string {
  if (!CLIENT_SECRET) {
    throw new Error('COGNITO_CLIENT_SECRET is not configured');
  }
  return crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest('base64');
}

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  organization?: string;  // Not saved to Cognito, only to backend
  role?: string;          // Not saved to Cognito, only to backend
}

export interface SignUpResponse {
  userId: string;
  email: string;
  userConfirmed: boolean;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

/**
 * Register a new user with Cognito
 * Note: Only email, name, and password are saved to Cognito
 * Organization and role will be saved to backend database via /signup API
 */
export async function signUp(params: SignUpParams): Promise<SignUpResponse> {
  if (!USER_POOL_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Cognito configuration is missing. Please check your environment variables.');
  }

  const { email, password, name } = params;
  // organization and role are intentionally not saved to Cognito
  const secretHash = computeSecretHash(email);

  try {
    const command = new SignUpCommand({
      ClientId: CLIENT_ID,
      SecretHash: secretHash,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name },
      ],
    });

    const response = await cognitoClient.send(command);

    return {
      userId: response.UserSub || '',
      email: email,
      userConfirmed: response.UserConfirmed || false,
    };
  } catch (error: any) {
    if (error.name === 'UsernameExistsException') {
      throw new Error('An account with this email already exists');
    } else if (error.name === 'InvalidPasswordException') {
      throw new Error('Password does not meet requirements');
    } else if (error.name === 'InvalidParameterException') {
      throw new Error(error.message || 'Invalid parameters provided');
    }
    throw new Error(error.message || 'Failed to register user');
  }
}

/**
 * Authenticate user with Cognito
 */
export async function login(params: LoginParams): Promise<LoginResponse> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Cognito configuration is missing. Please check your environment variables.');
  }

  const { email, password } = params;
  const secretHash = computeSecretHash(email);

  try {
    const command = new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash,
      },
    });

    const response = await cognitoClient.send(command);

    if (!response.AuthenticationResult) {
      throw new Error('Authentication failed - no tokens received');
    }

    return {
      accessToken: response.AuthenticationResult.AccessToken || '',
      refreshToken: response.AuthenticationResult.RefreshToken || '',
      idToken: response.AuthenticationResult.IdToken || '',
      expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
    };
  } catch (error: any) {
    if (error.name === 'NotAuthorizedException') {
      throw new Error('Incorrect email or password');
    } else if (error.name === 'UserNotConfirmedException') {
      throw new Error('Please verify your email address before logging in');
    } else if (error.name === 'UserNotFoundException') {
      throw new Error('No account found with this email');
    }
    throw new Error(error.message || 'Failed to authenticate user');
  }
}