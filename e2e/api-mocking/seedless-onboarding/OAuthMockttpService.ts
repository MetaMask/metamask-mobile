/**
 * OAuth Mockttp Service for Seedless Onboarding E2E Tests
 *
 * This service proxies Auth Server calls to the backend QA mock endpoints,
 * which generate cryptographically valid tokens using real SignerService.
 *
 * Architecture:
 * 1. App calls Auth Server /api/v1/oauth/token (intercepted by Mockttp)
 * 2. Mockttp proxies to Backend QA Mock /api/v1/qa/mock/oauth/token
 * 3. Backend generates valid tokens with SignerService
 * 4. App receives valid tokens, authenticates with real TOPRF nodes
 *
 * @example
 * const service = createOAuthMockttpService();
 * service.configureGoogleNewUser();
 * await service.setup(mockServer);
 */

import { Mockttp } from 'mockttp';

import {
  AuthServer,
  AUTH_SERVICE_BASE_URL,
  E2E_EMAILS,
  E2EScenario,
  E2ELoginProvider,
  parseE2EScenario,
  PasswordChangeItemId,
  E2E_SRP,
} from './constants';

import { OAuthMockttpServiceOptions, SecretType } from './types';

/**
 * Configuration for E2E OAuth mock
 */
export interface E2EOAuthConfig {
  loginProvider: E2ELoginProvider;
  scenario: E2EScenario;
  email: string;
}

/**
 * OAuthMockttpService - Proxies Auth Server to Backend QA Mock
 *
 * Key features:
 * - Proxies /api/v1/oauth/token → /api/v1/qa/mock/oauth/token
 * - Backend generates valid JWT tokens
 * - Real TOPRF authentication works with valid tokens
 */
export class OAuthMockttpService {
  private config: E2EOAuthConfig;

  constructor() {
    // Default config - new Google user
    this.config = {
      loginProvider: E2ELoginProvider.GOOGLE,
      scenario: E2EScenario.NEW_USER,
      email: E2E_EMAILS.GOOGLE_NEW_USER,
    };
  }

  // ============================================
  // CONFIGURATION METHODS
  // ============================================

  /**
   * Configure for Google New User flow
   * @returns this for method chaining
   */
  configureGoogleNewUser(): this {
    this.config = {
      loginProvider: E2ELoginProvider.GOOGLE,
      scenario: E2EScenario.NEW_USER,
      email: E2E_EMAILS.GOOGLE_NEW_USER,
    };
    return this;
  }

  /**
   * Configure for Google Existing User flow
   * @returns this for method chaining
   */
  configureGoogleExistingUser(): this {
    this.config = {
      loginProvider: E2ELoginProvider.GOOGLE,
      scenario: E2EScenario.EXISTING_USER,
      email: E2E_EMAILS.GOOGLE_EXISTING_USER,
    };
    return this;
  }

  /**
   * Configure for Apple New User flow
   * @returns this for method chaining
   */
  configureAppleNewUser(): this {
    this.config = {
      loginProvider: E2ELoginProvider.APPLE,
      scenario: E2EScenario.NEW_USER,
      email: E2E_EMAILS.APPLE_NEW_USER,
    };
    return this;
  }

  /**
   * Configure for Apple Existing User flow
   * @returns this for method chaining
   */
  configureAppleExistingUser(): this {
    this.config = {
      loginProvider: E2ELoginProvider.APPLE,
      scenario: E2EScenario.EXISTING_USER,
      email: E2E_EMAILS.APPLE_EXISTING_USER,
    };
    return this;
  }

  /**
   * Configure for error scenario
   * @param errorType - Type of error to simulate
   * @returns this for method chaining
   */
  configureError(
    errorType: 'timeout' | 'invalid' | 'network' | 'auth_failed',
  ): this {
    const errorEmails: Record<string, string> = {
      timeout: E2E_EMAILS.ERROR_TIMEOUT,
      invalid: E2E_EMAILS.ERROR_INVALID_TOKEN,
      network: E2E_EMAILS.ERROR_NETWORK,
      auth_failed: E2E_EMAILS.ERROR_AUTH_FAILED,
    };

    const errorScenarios: Record<string, E2EScenario> = {
      timeout: E2EScenario.ERROR_TIMEOUT,
      invalid: E2EScenario.ERROR_INVALID,
      network: E2EScenario.ERROR_NETWORK,
      auth_failed: E2EScenario.ERROR_AUTH_FAILED,
    };

    this.config = {
      loginProvider: E2ELoginProvider.GOOGLE,
      scenario: errorScenarios[errorType],
      email: errorEmails[errorType],
    };
    return this;
  }

  /**
   * Configure with custom email
   * @param email - Custom E2E email (must match *+e2e@web3auth.io pattern)
   * @param loginProvider - Login provider (default: google)
   * @returns this for method chaining
   */
  configureCustom(
    email: string,
    loginProvider: E2ELoginProvider = E2ELoginProvider.GOOGLE,
  ): this {
    this.config = {
      loginProvider,
      scenario: parseE2EScenario(email),
      email,
    };
    return this;
  }

  // ============================================
  // GETTERS
  // ============================================

  /**
   * Get current configuration
   */
  getConfig(): E2EOAuthConfig {
    return { ...this.config };
  }

  /**
   * Get the E2E email for current configuration
   * This email should be used in the OAuth flow
   */
  getE2EEmail(): string {
    return this.config.email;
  }

  /**
   * Check if current config is for existing user
   */
  isExistingUser(): boolean {
    return this.config.scenario === E2EScenario.EXISTING_USER;
  }

  /**
   * Check if current config is for error scenario
   */
  isErrorScenario(): boolean {
    return [
      E2EScenario.ERROR_TIMEOUT,
      E2EScenario.ERROR_INVALID,
      E2EScenario.ERROR_NETWORK,
      E2EScenario.ERROR_AUTH_FAILED,
    ].includes(this.config.scenario);
  }

  /**
   * Get login provider
   */
  getLoginProvider(): E2ELoginProvider {
    return this.config.loginProvider;
  }

  // ============================================
  // SETUP METHODS
  // ============================================

  /**
   * MAIN SETUP METHOD - Register mock handlers
   *
   * Sets up:
   * 1. Auth Server token endpoint → Proxy to backend QA mock
   * 2. Marketing opt-in mock
   * 3. Metadata service mocks (optional)
   *
   * @param server - Mockttp server instance
   * @param options - Configuration options
   */
  async setup(
    server: Mockttp,
    options?: OAuthMockttpServiceOptions,
  ): Promise<void> {
    // Update config from options if provided
    if (options?.userEmail) {
      this.configureCustom(
        options.userEmail,
        options.loginProvider === 'apple'
          ? E2ELoginProvider.APPLE
          : E2ELoginProvider.GOOGLE,
      );
    }

    // Setup Auth Server proxy to backend QA mock
    await this.setupAuthServerProxy(server);

    // Setup marketing opt-in mock
    await this.setupMarketingOptInMock(server);

    // Setup metadata service mocks (unless explicitly disabled)
    if (options?.mockMetadataService !== false) {
      await this.setupMetadataServiceMocks(server);
    }
  }

  /**
   * Helper to decode the proxied URL from /proxy?url=<encoded_url>
   */
  private getDecodedProxiedURL(url: string): string {
    try {
      return decodeURIComponent(String(new URL(url).searchParams.get('url')));
    } catch {
      return '';
    }
  }

  /**
   * Proxy Auth Server token requests to backend QA mock
   *
   * This is the key integration point:
   * - App calls: /proxy?url=https://auth-service.../api/v1/oauth/token
   * - We intercept and proxy to: /api/v1/qa/mock/oauth/token
   * - Backend returns valid tokens
   */
  private async setupAuthServerProxy(server: Mockttp): Promise<void> {
    // Proxy token requests to backend QA mock
    // Use /proxy pattern to match mobile proxy requests
    const tokenEndpoint = `${AUTH_SERVICE_BASE_URL}/api/v1/oauth/token`;
    console.log(`[E2E MockServer] Registering mock for: ${tokenEndpoint}`);

    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/api/v1/oauth/token');
      })
      .asPriority(1000) // High priority to override default handlers
      .thenCallback(async (request) => {
        const decodedUrl = this.getDecodedProxiedURL(request.url);
        console.log(
          `[E2E MockServer] ✅ INTERCEPTED via /proxy: POST ${decodedUrl}`,
        );
        try {
          const requestBody = (await request.body.getText()) || '{}';
          const body = JSON.parse(requestBody);
          console.log(
            `[E2E MockServer] Request body:`,
            JSON.stringify(body, null, 2),
          );

          // Override email with E2E email for scenario selection
          body.email = this.config.email;
          body.login_provider = this.config.loginProvider;

          console.log(
            `[E2E] Proxying OAuth token request for: ${this.config.email}`,
          );
          console.log(`[E2E] Proxying to: ${AuthServer.MockRequestToken}`);

          // Call backend QA mock endpoint
          const response = await fetch(AuthServer.MockRequestToken, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Add internal secret header if required by backend
              'X-Internal-Secret': process.env.E2E_INTERNAL_SECRET || '',
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            console.error(`[E2E] Backend QA mock error: ${response.status}`);
            return {
              statusCode: response.status,
              json: { error: 'Backend QA mock error' },
            };
          }

          const tokens = await response.json();
          console.log('[E2E] Received valid tokens from backend QA mock');

          return {
            statusCode: 200,
            json: tokens,
          };
        } catch (error) {
          console.error('[E2E] Error proxying to backend QA mock:', error);
          return {
            statusCode: 500,
            json: { error: 'Failed to proxy to backend QA mock' },
          };
        }
      });

    // Handle Apple login id_token endpoint
    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/api/v1/oauth/id_token');
      })
      .asPriority(1000)
      .thenCallback(async (request) => {
        try {
          const requestBody = (await request.body.getText()) || '{}';
          const body = JSON.parse(requestBody);

          // Override email with E2E email for scenario selection
          body.email = this.config.email;
          body.login_provider = this.config.loginProvider;

          console.log(
            `[E2E] Proxying Apple id_token request for: ${this.config.email}`,
          );

          // Call backend QA mock endpoint for id_token
          const response = await fetch(AuthServer.MockIdToken, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': process.env.E2E_INTERNAL_SECRET || '',
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            console.error(
              `[E2E] Backend QA mock error for id_token: ${response.status}`,
            );
            return {
              statusCode: response.status,
              json: { error: 'Backend QA mock error for id_token' },
            };
          }

          const tokens = await response.json();
          console.log(
            '[E2E] Received valid tokens from backend QA mock (id_token)',
          );

          return {
            statusCode: 200,
            json: tokens,
          };
        } catch (error) {
          console.error(
            '[E2E] Error proxying id_token to backend QA mock:',
            error,
          );
          return {
            statusCode: 500,
            json: { error: 'Failed to proxy id_token to backend QA mock' },
          };
        }
      });

    // Also handle token renewal
    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/api/v2/oauth/renew_refresh_token');
      })
      .asPriority(1000)
      .thenCallback(async (request) => {
        try {
          const requestBody = await request.body.getText();

          const response = await fetch(AuthServer.MockRenewRefreshToken, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': process.env.E2E_INTERNAL_SECRET || '',
            },
            body: requestBody,
          });

          const result = await response.json();
          return { statusCode: response.status, json: result };
        } catch (error) {
          console.error('[E2E] Error renewing refresh token:', error);
          return { statusCode: 500, json: { error: 'Renewal failed' } };
        }
      });

    // Handle token revocation
    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/api/v2/oauth/revoke');
      })
      .asPriority(1000)
      .thenCallback(async () =>
        // Just return success for revocation
        ({ statusCode: 200, json: { success: true } }),
      );
  }

  /**
   * Mock marketing opt-in status to avoid real API calls
   */
  private async setupMarketingOptInMock(server: Mockttp): Promise<void> {
    // GET request
    await server
      .forGet('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/api/v1/oauth/marketing_opt_in_status');
      })
      .asPriority(1000)
      .thenJson(200, { is_opt_in: true });

    // POST request
    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/api/v1/oauth/marketing_opt_in_status');
      })
      .asPriority(1000)
      .thenJson(200, { is_opt_in: true });
  }

  /**
   * Setup Metadata Service mocks
   * These may still be needed if backend doesn't handle metadata mocking
   */
  private async setupMetadataServiceMocks(server: Mockttp): Promise<void> {
    const encryptedSecretData = this.generateMockEncryptedSecretData();

    // Set metadata
    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/metadata/enc_account_data/set');
      })
      .asPriority(1000)
      .thenJson(200, {
        success: true,
        message: 'Metadata set successfully',
      });

    // Get metadata - returns encrypted SRP for existing users
    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/metadata/enc_account_data/get');
      })
      .asPriority(1000)
      .thenJson(200, {
        success: true,
        data: this.isExistingUser() ? encryptedSecretData : [],
        ids: this.isExistingUser() ? ['', PasswordChangeItemId] : [],
      });

    // Acquire lock
    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/metadata/acquireLock');
      })
      .asPriority(1000)
      .thenJson(200, {
        success: true,
        status: 1,
        id: 'E2E_MOCK_LOCK_ID',
      });

    // Release lock
    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/metadata/releaseLock');
      })
      .asPriority(1000)
      .thenJson(200, {
        success: true,
        status: 1,
      });

    // Batch set
    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/metadata/enc_account_data/batch_set');
      })
      .asPriority(1000)
      .thenJson(200, {
        success: true,
        message: 'Metadata set successfully',
      });
  }

  /**
   * Generate mock encrypted secret data for existing user flow
   * This simulates the encrypted seed phrase response from metadata service
   */
  private generateMockEncryptedSecretData(): string[] {
    const mockEncryptedSrp = Buffer.from(
      JSON.stringify({
        data: Buffer.from(E2E_SRP).toString('base64'),
        timestamp: Date.now(),
        type: SecretType.Mnemonic,
      }),
    ).toString('base64');

    const mockPasswordChangeItem = Buffer.from(
      JSON.stringify({
        itemId: PasswordChangeItemId,
        data: 'mock-encrypted-password-change-data',
      }),
    ).toString('base64');

    return [mockEncryptedSrp, mockPasswordChangeItem];
  }
}

// Export singleton factory for convenience
export const createOAuthMockttpService = (): OAuthMockttpService =>
  new OAuthMockttpService();
