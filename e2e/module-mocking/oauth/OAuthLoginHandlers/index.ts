/**
 * Mock OAuthLoginHandlers for E2E Testing
 *
 * This module replaces app/core/OAuthService/OAuthLoginHandlers/index.ts
 * during E2E builds via metro.config.js aliasing.
 *
 */

import { Platform } from 'react-native';
import { E2EOAuthHelpers } from '../E2EOAuthHelpers';

// Re-export types from real module
export { AuthConnection } from '../../../../app/core/OAuthService/OAuthInterface';

// Import constants from real module
import {
  AuthServerUrl,
  web3AuthNetwork,
} from '../../../../app/core/OAuthService/OAuthLoginHandlers/constants';

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
   * In E2E, this is intercepted by Mockttp → proxied to backend QA mock
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
  }

  async login(): Promise<LoginHandlerResult> {
    const email = E2EOAuthHelpers.getE2EEmail();
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
      // Include E2E email for backend QA mock scenario selection
      email: params.email || E2EOAuthHelpers.getE2EEmail(),
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
  }

  async login(): Promise<LoginHandlerResult> {
    const email = E2EOAuthHelpers.getE2EEmail();
    console.log(`[E2E Mock] Apple login with email: ${email}`);

    // Simulate brief delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Create mock ID token with E2E email
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
      // Include E2E email for backend QA mock scenario selection
      email: params.email || E2EOAuthHelpers.getE2EEmail(),
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
        clientId: 'e2e-mock-google-client-id',
        redirectUri: 'metamask://e2e',
      });
    case 'apple':
      return new MockAppleLoginHandler({
        clientId: 'e2e-mock-apple-client-id',
      });
    default:
      throw new Error(`[E2E Mock] Unsupported provider: ${provider}`);
  }
}

// Export BaseLoginHandler type for compatibility
export type { MockBaseLoginHandler as BaseLoginHandler };
