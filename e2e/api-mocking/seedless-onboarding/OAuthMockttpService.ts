/**
 * OAuth Mockttp Service for Seedless Onboarding E2E Tests
 * Matching MetaMask Extension's implementation pattern
 *
 * This service mocks all the HTTP endpoints needed for Google/Apple OAuth flows:
 * - Auth Server (token exchange, revoke, refresh)
 * - SSS Nodes (TOPRF operations)
 * - Metadata Service (encrypted seed phrase storage)
 *
 * Usage:
 * const oAuthMockttpService = new OAuthMockttpService();
 * await oAuthMockttpService.setup(mockServer); // New user
 * await oAuthMockttpService.setup(mockServer, { userEmail: 'user@gmail.com' }); // Existing user
 */

import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../helpers/mockHelpers';

import {
  AuthServer,
  MetadataService,
  SSSNodeKeyPairs,
  PasswordChangeItemId,
  E2E_SRP,
} from './constants';

import { MockAuthPubKey } from './data';

import {
  ToprfCommitmentRequestParams,
  ToprfEvalRequestParams,
  ToprfAuthenticateResponse,
  OAuthMockttpServiceOptions,
  SecretType,
} from './types';

/**
 * Pad hex string to specified length
 */
function padHex(hex: string, length: number = 64): string {
  return hex.length < length ? hex.padStart(length, '0') : hex;
}

/**
 * Generate a mock JWT token for testing
 * In production, this would be a real ES256 signed JWT
 */
function generateMockJwtToken(userId: string): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 120;

  // Create a mock JWT structure (not cryptographically valid, but works for E2E)
  const header = Buffer.from(
    JSON.stringify({ alg: 'ES256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: 'torus-key-test',
      aud: 'torus-key-test',
      name: userId,
      email: userId,
      scope: 'email',
      iat,
      exp,
    }),
  ).toString('base64url');
  const signature = 'mock-signature-for-e2e-testing';

  return `${header}.${payload}.${signature}`;
}

/**
 * Generate mock encrypted secret data
 * Simulates the encrypted seed phrase response from metadata service
 */
function generateMockEncryptedSecretData(): string[] {
  // In Extension, this uses @noble/ciphers for real encryption
  // For mobile E2E, we return pre-computed mock data
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

/**
 * OAuthMockttpService - Main mock service class
 * Matches the MetaMask Extension's implementation
 */
export class OAuthMockttpService {
  #sessionPubKey: string = '';
  #latestAuthPubKey: string = MockAuthPubKey;
  #numbOfRequestTokensCalls: number = 0;

  /**
   * Mock Auth Server token endpoint response
   */
  mockAuthServerToken(overrides?: OAuthMockttpServiceOptions): {
    statusCode: number;
    json: Record<string, unknown>;
  } {
    const userEmail =
      overrides?.userEmail || `e2e-user-${Date.now()}@gmail.com`;
    const idToken = generateMockJwtToken(userEmail);

    this.#numbOfRequestTokensCalls += 1;

    // Simulate auth error on second call if configured
    if (
      this.#numbOfRequestTokensCalls === 2 &&
      overrides?.throwAuthenticationErrorAtUnlock &&
      overrides?.passwordOutdated
    ) {
      return {
        statusCode: 500,
        json: { message: 'Internal server error' },
      };
    }

    return {
      statusCode: 200,
      json: {
        access_token: idToken,
        id_token: idToken,
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        revoke_token: 'mock-revoke-token',
        metadata_access_token: idToken,
      },
    };
  }

  onPostToken(overrides?: OAuthMockttpServiceOptions): {
    statusCode: number;
    json: Record<string, unknown>;
  } {
    return this.mockAuthServerToken(overrides);
  }

  onPostRevokeToken(): { statusCode: number; json: Record<string, unknown> } {
    return {
      statusCode: 200,
      json: { message: 'Token revoked successfully' },
    };
  }

  onPostRenewRefreshToken(): {
    statusCode: number;
    json: Record<string, unknown>;
  } {
    return {
      statusCode: 200,
      json: {
        refresh_token: 'new-mock-refresh-token',
        revoke_token: 'new-mock-revoke-token',
      },
    };
  }

  /**
   * Handle TOPRF Commitment Request
   */
  onPostToprfCommitment(
    params: ToprfCommitmentRequestParams,
    nodeIndex: number,
  ): { statusCode: number; json: Record<string, unknown> } {
    const paddedTempPubKeyX = padHex(params.temp_pub_key_x);
    const paddedTempPubKeyY = padHex(params.temp_pub_key_y);
    this.#sessionPubKey = `04${paddedTempPubKeyX}${paddedTempPubKeyY}`;

    return {
      statusCode: 200,
      json: {
        id: 1,
        jsonrpc: '2.0',
        result: {
          signature: 'mock-signature',
          data: 'mock-data',
          node_pub_x: params.temp_pub_key_x,
          node_pub_y: params.temp_pub_key_y,
          node_index: nodeIndex,
        },
      },
    };
  }

  /**
   * Handle TOPRF Authenticate Request
   */
  onPostToprfAuthenticate(
    nodeIndex: number,
    isNewUser: boolean = true,
  ): { statusCode: number; json: Record<string, unknown> } {
    const mockNodePubKey = SSSNodeKeyPairs[nodeIndex].pubKey;
    const mockAuthToken = this.#generateMockAuthToken();

    const authenticateResult: ToprfAuthenticateResponse = {
      auth_token: mockAuthToken,
      node_index: nodeIndex,
      node_pub_key: mockNodePubKey,
    };

    // For existing users, include key_index and pub_key
    if (!isNewUser) {
      authenticateResult.key_index = 1;
      authenticateResult.pub_key = MockAuthPubKey;
    }

    return {
      statusCode: 200,
      json: {
        id: 1,
        jsonrpc: '2.0',
        result: authenticateResult,
      },
    };
  }

  /**
   * Handle TOPRF Eval Request
   * Returns mock blinded output for the given blinded input
   */
  onPostToprfEval(
    _params: ToprfEvalRequestParams,
    nodeIndex: number,
  ): { statusCode: number; json: Record<string, unknown> } {
    // In Extension, this does real elliptic curve math
    // For mobile E2E, we return mock values
    const mockBlindedOutputX = padHex(
      `mock-blinded-output-x-node-${nodeIndex}`,
      64,
    );
    const mockBlindedOutputY = padHex(
      `mock-blinded-output-y-node-${nodeIndex}`,
      64,
    );

    return {
      statusCode: 200,
      json: {
        id: 1,
        jsonrpc: '2.0',
        result: {
          blinded_output_x: mockBlindedOutputX,
          blinded_output_y: mockBlindedOutputY,
          key_share_index: 1,
          node_index: nodeIndex,
          pub_key: MockAuthPubKey,
        },
      },
    };
  }

  /**
   * Handle Metadata Get Request
   * Returns encrypted seed phrase data for existing users
   */
  onPostMetadataGet(): { statusCode: number; json: Record<string, unknown> } {
    const encryptedSecretData = generateMockEncryptedSecretData();

    return {
      statusCode: 200,
      json: {
        success: true,
        data: encryptedSecretData,
        ids: ['', PasswordChangeItemId],
      },
    };
  }

  /**
   * MAIN SETUP METHOD - Register all mock handlers
   *
   * @param server - Mockttp server instance
   * @param options - Configuration options
   * @param options.userEmail - If provided, simulates existing user; otherwise new user
   * @param options.passwordOutdated - Simulates password outdated scenario
   * @param options.throwAuthenticationErrorAtUnlock - Throws error on second token request
   */
  async setup(
    server: Mockttp,
    options?: OAuthMockttpServiceOptions,
  ): Promise<void> {
    // Auth Server mocks
    await this.#setupAuthServerMocks(server, options);

    // TOPRF/SSS Node mocks
    await this.#setupToprfMocks(server, options);

    // Metadata Service mocks
    await this.#setupMetadataServiceMocks(server);
  }

  /**
   * Setup Auth Server endpoint mocks
   */
  async #setupAuthServerMocks(
    server: Mockttp,
    options?: OAuthMockttpServiceOptions,
  ): Promise<void> {
    // Token endpoint
    await setupMockRequest(server, {
      requestMethod: 'POST',
      url: AuthServer.RequestToken,
      response: this.onPostToken(options).json,
      responseCode: this.onPostToken(options).statusCode,
    });

    // Revoke token endpoint
    await setupMockRequest(server, {
      requestMethod: 'POST',
      url: AuthServer.RevokeToken,
      response: this.onPostRevokeToken().json,
      responseCode: this.onPostRevokeToken().statusCode,
    });

    // Marketing opt-in status (GET)
    await setupMockRequest(server, {
      requestMethod: 'GET',
      url: AuthServer.GetMarketingOptInStatus,
      response: { is_opt_in: true },
      responseCode: 200,
    });

    // Marketing opt-in status (POST)
    await setupMockRequest(server, {
      requestMethod: 'POST',
      url: AuthServer.GetMarketingOptInStatus,
      response: { is_opt_in: true },
      responseCode: 200,
    });

    // Renew refresh token
    await setupMockRequest(server, {
      requestMethod: 'POST',
      url: AuthServer.RenewRefreshToken,
      response: this.onPostRenewRefreshToken().json,
      responseCode: this.onPostRenewRefreshToken().statusCode,
    });
  }

  /**
   * Setup TOPRF/SSS Node mocks for all 5 nodes
   */
  async #setupToprfMocks(
    server: Mockttp,
    options?: OAuthMockttpServiceOptions,
  ): Promise<void> {
    // Setup mocks for each of the 5 SSS nodes
    for (let nodeIndex = 1; nodeIndex <= 5; nodeIndex++) {
      const nodeUrl = `https://node-${nodeIndex}.dev-node.web3auth.io/sss/jrpc`;

      // For each node, we need to handle different TOPRF methods
      // Since setupMockRequest doesn't support dynamic request body parsing,
      // we'll set up generic successful responses

      // TOPRF Commitment
      await setupMockRequest(server, {
        requestMethod: 'POST',
        url: nodeUrl,
        response: this.#getToprfResponse(nodeIndex, options),
        responseCode: 200,
      });
    }
  }

  /**
   * Get generic TOPRF response for a node
   * In Extension, this parses the request body to determine the method
   * For mobile, we return a generic successful response
   */
  #getToprfResponse(
    nodeIndex: number,
    options?: OAuthMockttpServiceOptions,
  ): Record<string, unknown> {
    const isNewUser = !options?.userEmail;
    const mockNodePubKey = SSSNodeKeyPairs[nodeIndex].pubKey;

    // Return authenticate response by default (most common case)
    const result: ToprfAuthenticateResponse = {
      auth_token: this.#generateMockAuthToken(),
      node_index: nodeIndex,
      node_pub_key: mockNodePubKey,
    };

    if (!isNewUser) {
      result.key_index = 1;
      result.pub_key = options?.passwordOutdated
        ? MockAuthPubKey
        : MockAuthPubKey;
    }

    return {
      id: 1,
      jsonrpc: '2.0',
      result,
    };
  }

  /**
   * Setup Metadata Service mocks
   */
  async #setupMetadataServiceMocks(server: Mockttp): Promise<void> {
    // Set metadata
    await setupMockRequest(server, {
      requestMethod: 'POST',
      url: MetadataService.Set,
      response: { success: true, message: 'Metadata set successfully' },
      responseCode: 200,
    });

    // Get metadata
    await setupMockRequest(server, {
      requestMethod: 'POST',
      url: MetadataService.Get,
      response: this.onPostMetadataGet().json,
      responseCode: 200,
    });

    // Acquire lock
    await setupMockRequest(server, {
      requestMethod: 'POST',
      url: MetadataService.AcquireLock,
      response: { success: true, status: 1, id: 'MOCK_LOCK_ID' },
      responseCode: 200,
    });

    // Release lock
    await setupMockRequest(server, {
      requestMethod: 'POST',
      url: MetadataService.ReleaseLock,
      response: { success: true, status: 1 },
      responseCode: 200,
    });

    // Batch set
    await setupMockRequest(server, {
      requestMethod: 'POST',
      url: MetadataService.BatchSet,
      response: { success: true, message: 'Metadata set successfully' },
      responseCode: 200,
    });
  }

  /**
   * Generate a mock encrypted auth token
   */
  #generateMockAuthToken(): string {
    // In Extension, this uses eccrypto for real encryption
    // For mobile E2E, we return a mock token structure
    return JSON.stringify({
      data: 'mock-encrypted-auth-token-data',
      metadata: {
        iv: 'mock-iv',
        ephemPublicKey: 'mock-ephemeral-public-key',
        mac: 'mock-mac',
      },
    });
  }

  /**
   * Extract node index from SSS URL
   */
  #extractNodeIndexFromUrl(url: string): number {
    const match = url.match(/node-[1-5]/u);
    if (!match) {
      throw new Error('Invalid SSS Node URL');
    }
    return parseInt(match[0].replace('node-', ''), 10);
  }
}

// Export singleton factory for convenience
export const createOAuthMockttpService = (): OAuthMockttpService =>
  new OAuthMockttpService();
