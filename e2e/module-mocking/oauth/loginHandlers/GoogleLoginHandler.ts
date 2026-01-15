/**
 * Mock GoogleLoginHandler for E2E Testing
 *
 * This mock bypasses the native Google OAuth UI while keeping
 * the rest of the authentication flow real.
 *
 * Flow:
 * 1. login() returns mock result with E2E email (bypasses native UI)
 * 2. getAuthTokens() is called with real implementation
 * 3. Auth Server call is intercepted by Mockttp → proxied to backend QA mock
 * 4. Backend QA mock returns valid tokens
 * 5. SeedlessOnboardingController.authenticate() runs with real tokens
 */

import { E2EOAuthHelpers } from '../OAuthService';

/**
 * Login result returned by the mock
 */
interface LoginHandlerResult {
  idToken: string;
  authCode?: string;
  email: string;
  provider: string;
}

/**
 * Auth tokens returned by Auth Server
 */
interface AuthResponse {
  id_token: string;
  access_token: string;
  refresh_token: string;
  revoke_token: string;
  metadata_access_token: string;
}

/**
 * Mock Google Login Handler
 *
 * Replaces the real GoogleLoginHandler during E2E builds.
 * Only login() is mocked - getAuthTokens() calls the real Auth Server.
 */
class MockGoogleLoginHandler {
  authConnection = 'google';
  clientId: string;
  redirectUri: string;

  constructor(clientId: string, redirectUri: string) {
    this.clientId = clientId;
    this.redirectUri = redirectUri;
  }

  /**
   * Mock login - bypasses native Google OAuth UI
   *
   * Returns a mock result with the E2E email configured via E2EOAuthHelpers.
   * The E2E email pattern determines the test scenario.
   */
  async login(): Promise<LoginHandlerResult> {
    const email = E2EOAuthHelpers.getE2EEmail();

    // Simulate a short delay (native UI would take time)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Return mock login result
    // The idToken here is just a placeholder - the real token comes from Auth Server
    return {
      idToken: this.createMockIdToken(email),
      authCode: 'mock-auth-code-for-e2e',
      email,
      provider: 'google',
    };
  }

  /**
   * Get auth tokens from Auth Server
   *
   * This is the REAL implementation - makes actual HTTP call to Auth Server.
   * In E2E tests, Mockttp intercepts this and proxies to backend QA mock.
   */
  async getAuthTokens(
    loginResult: LoginHandlerResult & { web3AuthNetwork: string },
    authServerUrl: string,
  ): Promise<AuthResponse> {
    const response = await fetch(`${authServerUrl}/api/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_token: loginResult.idToken,
        email: loginResult.email,
        login_provider: 'google',
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        web3auth_network: loginResult.web3AuthNetwork,
        access_type: 'offline',
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth server error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Decode ID token payload
   */
  decodeIdToken(idToken: string): string {
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        return '{}';
      }
      const payload = Buffer.from(parts[1], 'base64').toString('utf8');
      return payload;
    } catch {
      return '{}';
    }
  }

  /**
   * Create a mock ID token for the E2E email
   * This is a placeholder - the real token comes from backend QA mock
   */
  private createMockIdToken(email: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: `e2e-user-${Date.now()}`,
        email,
        email_verified: true,
        iss: 'https://accounts.google.com',
        aud: this.clientId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64');
    // Note: This signature is not valid - real token comes from backend QA mock
    const signature = 'e2e-mock-signature';
    return `${header}.${payload}.${signature}`;
  }
}

export default MockGoogleLoginHandler;
