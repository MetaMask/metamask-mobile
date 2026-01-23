/**
 * OAuth Mockttp Service for Seedless Onboarding E2E Tests
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
  SSSNodeKeyPairs,
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

  /**
   * Get current configuration
   */
  getConfig(): E2EOAuthConfig {
    return { ...this.config };
  }

  /**
   * Get the E2E email for current configuration
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

  /**
   * MAIN SETUP METHOD - Register mock handlers
   *
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

    // Setup TOPRF SSS node mocks
    await this.setupToprfSssNodeMocks(server);

    // Setup metadata service mocks
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
   */
  private async setupAuthServerProxy(server: Mockttp): Promise<void> {
    // Proxy token requests to backend QA mock
    const tokenEndpoint = `${AUTH_SERVICE_BASE_URL}/api/v1/oauth/token`;
    console.log(`[E2E MockServer] Registering mock for: ${tokenEndpoint}`);

    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/api/v1/oauth/token');
      })
      .asPriority(1000)
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

          let tokens;
          if (!response.ok) {
            console.warn(
              `[E2E] Backend QA mock returned ${response.status}, using fallback mock tokens`,
            );
            tokens = this.generateMockAuthResponse();
          } else {
            tokens = await response.json();
            console.log('[E2E] Received valid tokens from backend QA mock');
          }

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

          let tokens;
          if (!response.ok) {
            console.warn(
              `[E2E] Backend QA mock for id_token returned ${response.status}, using fallback`,
            );
            tokens = this.generateMockAuthResponse();
          } else {
            tokens = await response.json();
            console.log(
              '[E2E] Received valid tokens from backend QA mock (id_token)',
            );
          }

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

          if (!response.ok) {
            console.warn(
              `[E2E] Backend QA mock for renew_refresh_token returned ${response.status}, using fallback`,
            );
            // Fallback
            const mockTokens = this.generateMockAuthResponse();
            return {
              statusCode: 200,
              json: {
                id_token: mockTokens.id_token,
                access_token: mockTokens.access_token,
                metadata_access_token: mockTokens.metadata_access_token,
                indexes: mockTokens.indexes,
              },
            };
          }

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
   * Setup TOPRF SSS Node Mocks
   */
  private async setupToprfSssNodeMocks(server: Mockttp): Promise<void> {
    console.log('[E2E MockServer] Setting up TOPRF SSS node mocks');

    // Mock all 5 SSS nodes
    await server
      .forPost('/proxy')
      .matching((request) => {
        const url = this.getDecodedProxiedURL(request.url);
        return url.includes('/sss/jrpc');
      })
      .asPriority(1000)
      .thenCallback(async (request) => {
        try {
          const requestBody = (await request.body.getText()) || '{}';
          const body = JSON.parse(requestBody);
          const url = this.getDecodedProxiedURL(request.url);

          // Extract node index from URL (node-1, node-2, etc.)
          const nodeMatch = url.match(/node-(\d)/);
          const nodeIndex = nodeMatch ? parseInt(nodeMatch[1], 10) : 1;

          console.log(
            `[E2E MockServer] SSS Node ${nodeIndex} request: ${body.method}`,
          );
          const response = this.handleToprfRequest(body, nodeIndex);

          return {
            statusCode: 200,
            json: response,
          };
        } catch (error) {
          console.error('[E2E] Error handling SSS node request:', error);
          return {
            statusCode: 500,
            json: {
              jsonrpc: '2.0',
              error: { code: -32603, message: 'Internal error' },
              id: null,
            },
          };
        }
      });
  }

  /**
   * Handle TOPRF JSON-RPC requests based on method type
   *
   * @param body - JSON-RPC request body
   * @param nodeIndex - SSS node index (1-5)
   * @returns JSON-RPC response
   */
  private handleToprfRequest(
    body: { method: string; params?: Record<string, unknown>; id?: number },
    nodeIndex: number,
  ): Record<string, unknown> {
    const { method, id } = body;
    const isNewUser = !this.isExistingUser();

    switch (method) {
      case 'TOPRFCommitmentRequest':
        return this.handleCommitmentRequest(id, nodeIndex);

      case 'TOPRFAuthenticateRequest':
        return this.handleAuthenticateRequest(id, nodeIndex, isNewUser);

      case 'TOPRFGetPubKeyRequest':
        return this.handleGetPubKeyRequest(id, nodeIndex, isNewUser);

      case 'TOPRFEvalRequest':
        return this.handleEvalRequest(id, nodeIndex);

      case 'TOPRFStoreKeyShareRequest':
        return this.handleStoreKeyShareRequest(id);

      case 'TOPRFResetRateLimitRequest':
        return { jsonrpc: '2.0', result: { success: true }, id };

      default:
        console.warn(`[E2E] Unknown TOPRF method: ${method}`);
        return {
          jsonrpc: '2.0',
          error: { code: -32601, message: `Method not found: ${method}` },
          id,
        };
    }
  }

  /**
   * Handle TOPRFCommitmentRequest
   * Returns commitment data for the TOPRF protocol
   */
  private handleCommitmentRequest(
    id: number | undefined,
    nodeIndex: number,
  ): Record<string, unknown> {
    // Generate deterministic mock commitment based on node index
    const commitment = Buffer.from(`e2e-commitment-node-${nodeIndex}`).toString(
      'hex',
    );

    return {
      jsonrpc: '2.0',
      result: {
        commitment,
        node_index: nodeIndex,
        success: true,
      },
      id,
    };
  }

  /**
   * Handle TOPRFAuthenticateRequest
   * Returns auth token and indicates if user exists
   */
  private handleAuthenticateRequest(
    id: number | undefined,
    nodeIndex: number,
    isNewUser: boolean,
  ): Record<string, unknown> {
    // Generate mock auth token
    const authToken = Buffer.from(
      JSON.stringify({
        node: nodeIndex,
        email: this.config.email,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64');

    // For new users, we return null pub_key and key_index
    // For existing users, we return the pub_key and key_index
    const result: Record<string, unknown> = {
      auth_token: authToken,
      node_index: nodeIndex,
      node_pub_key: SSSNodeKeyPairs[nodeIndex]?.pubKey || '',
      success: true,
    };

    if (!isNewUser) {
      // Existing user - return key info
      result.pub_key = `04e2e-existing-user-pub-key-${this.config.email}`;
      result.key_index = 1;
    }

    console.log(
      `[E2E] Auth request - isNewUser: ${isNewUser}, nodeIndex: ${nodeIndex}`,
    );

    return {
      jsonrpc: '2.0',
      result,
      id,
    };
  }

  /**
   * Handle TOPRFGetPubKeyRequest
   * Returns null for new users, pub_key for existing users
   */
  private handleGetPubKeyRequest(
    id: number | undefined,
    nodeIndex: number,
    isNewUser: boolean,
  ): Record<string, unknown> {
    if (isNewUser) {
      // New user - no pub key exists
      return {
        jsonrpc: '2.0',
        result: {
          pub_key: null,
          key_index: null,
          success: true,
        },
        id,
      };
    }

    // Existing user - return pub key
    return {
      jsonrpc: '2.0',
      result: {
        pub_key: `04e2e-existing-user-pub-key-${this.config.email}`,
        key_index: 1,
        node_index: nodeIndex,
        success: true,
      },
      id,
    };
  }

  /**
   * Handle TOPRFEvalRequest
   * Returns OPRF evaluation result for key derivation
   */
  private handleEvalRequest(
    id: number | undefined,
    nodeIndex: number,
  ): Record<string, unknown> {
    // Generate deterministic mock OPRF evaluation
    const evalResult = Buffer.from(
      `e2e-eval-result-node-${nodeIndex}-${Date.now()}`,
    ).toString('hex');

    return {
      jsonrpc: '2.0',
      result: {
        eval_result: evalResult,
        node_index: nodeIndex,
        success: true,
      },
      id,
    };
  }

  /**
   * Handle TOPRFStoreKeyShareRequest
   * Returns success for storing key shares (new user flow)
   */
  private handleStoreKeyShareRequest(
    id: number | undefined,
  ): Record<string, unknown> {
    console.log('[E2E] Storing key share for new user');

    return {
      jsonrpc: '2.0',
      result: {
        success: true,
        message: 'Key share stored successfully',
      },
      id,
    };
  }

  /**
   * Generate mock auth response tokens
   * Used as fallback when backend QA mock is not available (404)
   */
  private generateMockAuthResponse(): {
    id_token: string;
    access_token: string;
    metadata_access_token: string;
    refresh_token: string;
    revoke_token: string;
    indexes: number[];
    endpoints: Record<string, string>;
  } {
    // Generate mock JWT-like tokens (base64 encoded JSON)
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour expiry

    // Mock ID token payload
    const idTokenPayload = {
      iss: 'https://auth-service.uat-api.cx.metamask.io',
      sub: `e2e-user-${this.config.email}`,
      aud: 'metamask-mobile-e2e',
      email: this.config.email,
      email_verified: true,
      iat: now,
      exp,
      verifier: this.config.loginProvider,
      verifier_id: this.config.email,
      // Include aggregateVerifier for TOPRF
      aggregateVerifier: 'torus-test-health-aggregate',
    };

    // Create mock JWT structure (header.payload.signature)
    // Use standard base64 (not base64url) for compatibility with decodeIdToken
    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    ).toString('base64');
    const payload = Buffer.from(JSON.stringify(idTokenPayload)).toString(
      'base64',
    );
    const mockSignature = Buffer.from('e2e-mock-signature').toString('base64');
    const idToken = `${header}.${payload}.${mockSignature}`;

    // Mock access token
    const accessToken = Buffer.from(
      JSON.stringify({
        type: 'access',
        email: this.config.email,
        exp,
      }),
    ).toString('base64');

    // Mock metadata access token
    const metadataAccessToken = Buffer.from(
      JSON.stringify({
        type: 'metadata',
        email: this.config.email,
        exp,
      }),
    ).toString('base64');

    // Mock refresh and revoke tokens
    const refreshToken = `e2e-refresh-${Date.now()}`;
    const revokeToken = `e2e-revoke-${Date.now()}`;

    console.log('[E2E] Generated fallback mock tokens for:', this.config.email);
    console.log(
      '[E2E] ⚠️  These are placeholder tokens - deploy backend QA mock for valid tokens',
    );

    return {
      id_token: idToken,
      access_token: accessToken,
      metadata_access_token: metadataAccessToken,
      refresh_token: refreshToken,
      revoke_token: revokeToken,
      indexes: [1, 2, 3, 4, 5],
      endpoints: {
        '1': 'https://node-1.uat-node.web3auth.io/sss/jrpc',
        '2': 'https://node-2.uat-node.web3auth.io/sss/jrpc',
        '3': 'https://node-3.uat-node.web3auth.io/sss/jrpc',
        '4': 'https://node-4.uat-node.web3auth.io/sss/jrpc',
        '5': 'https://node-5.uat-node.web3auth.io/sss/jrpc',
      },
    };
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
