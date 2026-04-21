/**
 * Mock OAuthLoginHandlers for E2E Testing
 *
 * Random email
 */

import { Platform } from 'react-native';
import { LaunchArguments } from 'react-native-launch-arguments';
import QuickCrypto from 'react-native-quick-crypto';

// Re-export types from real module
export { AuthConnection } from '../../../../app/core/OAuthService/OAuthInterface';

// Import constants from real module
import {
  AuthServerUrl,
  web3AuthNetwork,
} from '../../../../app/core/OAuthService/OAuthLoginHandlers/constants';
import type { BaseHandlerOptions } from '../../../../app/core/OAuthService/OAuthLoginHandlers/baseHandler';

const MOCK_GOOGLE_OAUTH_CLIENT_ID_IOS =
  process.env.MAIN_IOS_GOOGLE_CLIENT_ID_UAT;
const MOCK_GOOGLE_OAUTH_CLIENT_ID_ANDROID =
  process.env.MAIN_ANDROID_GOOGLE_CLIENT_ID_UAT;

function getMockGoogleOAuthClientId(): string {
  const clientId =
    Platform.OS === 'ios'
      ? MOCK_GOOGLE_OAUTH_CLIENT_ID_IOS
      : MOCK_GOOGLE_OAUTH_CLIENT_ID_ANDROID;
  if (!clientId) {
    throw new Error(
      `[E2E Mock] Missing Google OAuth UAT client ID env var for platform "${Platform.OS}". ` +
        'Ensure MAIN_IOS_GOOGLE_CLIENT_ID_UAT or MAIN_ANDROID_GOOGLE_CLIENT_ID_UAT is set.',
    );
  }
  return clientId;
}

/**
 * Get the E2E mock email.
 */
function getE2EMockEmail(): string {
  const raw = LaunchArguments.value() as Record<string, unknown>;
  const launchArgEmail = raw?.mockOAuthEmail;
  if (typeof launchArgEmail === 'string' && launchArgEmail.length > 0) {
    console.log('[E2E Mock] Using email from launchArgs:', launchArgEmail);
    return launchArgEmail;
  }
  const rand = QuickCrypto.randomBytes(4).toString('hex').slice(0, 8);
  const randomEmail = `${rand}${Date.now()}+e2e@web3auth.io`;
  console.log('[E2E Mock] Generated random email:', randomEmail);
  return randomEmail;
}

/**
 * Login result type
 */
interface LoginHandlerResult {
  authConnection: string;
  code?: string;
  idToken?: string;
  clientId: string;
  redirectUri?: string;
  codeVerifier?: string;
  email?: string;
}

/**
 * Auth response type
 */
interface AuthResponse {
  id_token: string;
  access_token: string;
  refresh_token: string;
  revoke_token: string;
  metadata_access_token: string;
}

/**
 * Mock base class matching BaseLoginHandler interface
 */
abstract class MockBaseLoginHandler {
  abstract authConnection: string;
  abstract scope: string[];
  abstract authServerPath: string;

  public options!: BaseHandlerOptions;

  protected authServerUrl: string;
  protected web3AuthNetwork: string;
  protected nonce: string;

  constructor() {
    this.authServerUrl = AuthServerUrl || '';
    this.web3AuthNetwork = web3AuthNetwork || '';
    this.nonce = `e2e-nonce-${Date.now()}`;
  }

  /**
   * Mock login - bypasses native OAuth UI
   * Returns mock result with E2E email
   */
  abstract login(): Promise<LoginHandlerResult>;

  /**
   * REAL getAuthTokens - calls Auth Server
   */
  async getAuthTokens(
    params: LoginHandlerResult & { web3AuthNetwork: string },
  ): Promise<AuthResponse> {
    const requestData = this.getAuthTokenRequestData(params);

    const response = await fetch(
      `${this.authServerUrl}/${this.authServerPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      },
    );

    if (!response.ok) {
      throw new Error(`Auth server error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get request data for auth tokens
   */
  abstract getAuthTokenRequestData(
    params: LoginHandlerResult & { web3AuthNetwork: string },
  ): Record<string, unknown>;

  /**
   * Decode ID token
   */
  decodeIdToken(idToken: string): string {
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) return '{}';
      return Buffer.from(parts[1], 'base64').toString('utf8');
    } catch {
      return '{}';
    }
  }
}

/**
 * Mock Google Login Handler
 */
class MockGoogleLoginHandler extends MockBaseLoginHandler {
  authConnection = 'google';
  scope = ['email', 'profile', 'openid'];
  authServerPath = 'api/v1/oauth/token';

  private clientId: string;
  private redirectUri: string;

  constructor(params: { clientId: string; redirectUri?: string }) {
    super();
    this.clientId = params.clientId;
    this.redirectUri = params.redirectUri || 'metamask://';
    this.options = {
      clientId: this.clientId,
      authServerUrl: this.authServerUrl,
      web3AuthNetwork: this.web3AuthNetwork,
    };
  }

  async login(): Promise<LoginHandlerResult> {
    const email = getE2EMockEmail();
    console.log(`[E2E Mock] Google login with email: ${email}`);

    // Simulate brief delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      authConnection: this.authConnection,
      code: 'e2e-mock-google-code',
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      codeVerifier: 'e2e-mock-code-verifier',
      email,
    };
  }

  getAuthTokenRequestData(
    params: LoginHandlerResult & { web3AuthNetwork: string },
  ): Record<string, unknown> {
    return {
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      code: params.code,
      login_provider: this.authConnection,
      network: params.web3AuthNetwork,
      code_verifier: params.codeVerifier,
      email: params.email,
    };
  }
}

/**
 * Mock Apple Login Handler
 */
class MockAppleLoginHandler extends MockBaseLoginHandler {
  authConnection = 'apple';
  scope = ['full_name', 'email'];
  authServerPath = 'api/v1/oauth/id_token';

  private clientId: string;

  constructor(params: { clientId: string }) {
    super();
    this.clientId = params.clientId;
    this.options = {
      clientId: this.clientId,
      authServerUrl: this.authServerUrl,
      web3AuthNetwork: this.web3AuthNetwork,
    };
  }

  async login(): Promise<LoginHandlerResult> {
    const email = getE2EMockEmail();
    console.log(`[E2E Mock] Apple login with email: ${email}`);

    // Simulate brief delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    const mockIdToken = this.createMockIdToken(email);

    return {
      authConnection: this.authConnection,
      idToken: mockIdToken,
      clientId: this.clientId,
      email,
    };
  }

  private createMockIdToken(email: string): string {
    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    ).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: `e2e-apple-user-${Date.now()}`,
        email,
        email_verified: true,
        iss: 'https://appleid.apple.com',
        aud: this.clientId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64');
    return `${header}.${payload}.e2e-mock-signature`;
  }

  getAuthTokenRequestData(
    params: LoginHandlerResult & { web3AuthNetwork: string },
  ): Record<string, unknown> {
    return {
      client_id: params.clientId,
      id_token: params.idToken,
      login_provider: this.authConnection,
      network: params.web3AuthNetwork,
      email: params.email,
    };
  }
}

/**
 * Factory function to create mock login handlers
 */
export function createLoginHandler(
  _platformOS: Platform['OS'],
  provider: string,
  _fallback = false,
): MockBaseLoginHandler {
  console.log(`[E2E Mock] createLoginHandler called for provider: ${provider}`);

  switch (provider) {
    case 'google':
      return new MockGoogleLoginHandler({
        clientId: getMockGoogleOAuthClientId(),
        redirectUri: 'metamask://e2e',
      });
    case 'apple': {
      const appleClientId = process.env.MAIN_ANDROID_APPLE_CLIENT_ID_UAT;
      if (!appleClientId) {
        throw new Error(
          '[E2E Mock] Missing Apple OAuth UAT client ID. ' +
            'Ensure MAIN_ANDROID_APPLE_CLIENT_ID_UAT is set.',
        );
      }
      return new MockAppleLoginHandler({ clientId: appleClientId });
    }
    default:
      throw new Error(`[E2E Mock] Unsupported provider: ${provider}`);
  }
}

// Export BaseLoginHandler type for compatibility
export type { MockBaseLoginHandler as BaseLoginHandler };
