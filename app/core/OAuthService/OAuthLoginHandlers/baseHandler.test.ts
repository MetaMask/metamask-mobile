import {
  AuthConnection,
  HandleFlowParams,
  LoginHandlerResult,
} from '../OAuthInterface';
import { BaseLoginHandler, getAuthTokens } from './baseHandler';
import { OAuthErrorType } from '../error';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';

// Mock fetch globally
global.fetch = jest.fn();

// Mock handler class that extends BaseLoginHandler for testing
class MockLoginHandler extends BaseLoginHandler {
  get authConnection(): AuthConnection {
    return AuthConnection.Google;
  }

  get scope(): string[] {
    return ['openid', 'email', 'profile'];
  }

  get authServerPath(): string {
    return 'auth/google';
  }

  async login(): Promise<LoginHandlerResult> {
    return {
      authConnection: AuthConnection.Google,
      code: 'mock-auth-code',
      clientId: 'mock-client-id',
      redirectUri: 'mock-redirect-uri',
      codeVerifier: 'mock-code-verifier',
    };
  }
}

describe('BaseLoginHandler', () => {
  let mockHandler: MockLoginHandler;

  beforeEach(() => {
    mockHandler = new MockLoginHandler();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('generates a nonce when instantiated', () => {
      const handler1 = new MockLoginHandler();
      const handler2 = new MockLoginHandler();

      expect(handler1.nonce).toBeDefined();
      expect(handler2.nonce).toBeDefined();
      expect(typeof handler1.nonce).toBe('string');
      expect(handler1.nonce.length).toBeGreaterThan(0);
      expect(handler1.nonce).not.toBe(handler2.nonce); // Each instance should have unique nonce
    });
  });

  describe('abstract properties', () => {
    it('authConnection is correct', () => {
      expect(mockHandler.authConnection).toBe(AuthConnection.Google);
    });

    it('scope is correct', () => {
      expect(mockHandler.scope).toEqual(['openid', 'email', 'profile']);
    });

    it('authServerPath is correct', () => {
      expect(mockHandler.authServerPath).toBe('auth/google');
    });
  });

  describe('login method', () => {
    it('returns a valid LoginHandlerResult', async () => {
      const result = await mockHandler.login();

      expect(result).toEqual({
        authConnection: AuthConnection.Google,
        code: 'mock-auth-code',
        clientId: 'mock-client-id',
        redirectUri: 'mock-redirect-uri',
        codeVerifier: 'mock-code-verifier',
      });
    });
  });

  describe('decodeIdToken', () => {
    it('decodes a valid JWT token', () => {
      // Create a mock JWT token with known payload
      const mockPayload = { email: 'test@example.com', sub: '123456' };
      const mockPayloadBase64 = Buffer.from(
        JSON.stringify(mockPayload),
      ).toString('base64');
      const mockToken = `header.${mockPayloadBase64}.signature`;

      const decoded = mockHandler.decodeIdToken(mockToken);

      expect(decoded).toBe(JSON.stringify(mockPayload));
    });

    it('handles JWT tokens with special characters in payload', () => {
      // Test with payload containing special characters that need padding
      const mockPayload = { email: 'test@example.com', name: 'test data 🦊' };
      const mockPayloadBase64 = Buffer.from(
        JSON.stringify(mockPayload),
      ).toString('base64');
      const mockToken = `header.${mockPayloadBase64}.signature`;

      const decoded = mockHandler.decodeIdToken(mockToken);

      expect(decoded).toBe(JSON.stringify(mockPayload));
    });

    it('handles JWT tokens that need padding', () => {
      // Create a payload that results in base64 string needing padding
      const mockPayload = { email: 'test@example.com' };
      const mockPayloadBase64 = Buffer.from(
        JSON.stringify(mockPayload),
      ).toString('base64');
      const mockToken = `header.${mockPayloadBase64}.signature`;

      const decoded = mockHandler.decodeIdToken(mockToken);

      expect(decoded).toBe(JSON.stringify(mockPayload));
    });
  });

  describe('padBase64String function (tested through decodeIdToken)', () => {
    let mockHandler: MockLoginHandler;

    beforeEach(() => {
      mockHandler = new MockLoginHandler();
    });

    it('handles base64 strings that need 1 padding character', () => {
      // Create a payload that results in base64 string ending with 3 characters (needs 1 padding)
      const mockPayload = { email: 'test@example.com' };
      const mockPayloadBase64 = Buffer.from(
        JSON.stringify(mockPayload),
      ).toString('base64');

      // Remove any existing padding to test the padding logic
      const unpaddedBase64 = mockPayloadBase64.replace(/=+$/, '');
      const mockToken = `header.${unpaddedBase64}.signature`;

      const decoded = mockHandler.decodeIdToken(mockToken);

      expect(decoded).toBe(JSON.stringify(mockPayload));
    });

    it('handles base64 strings that need 2 padding characters', () => {
      // Create a payload that results in base64 string ending with 2 characters (needs 2 padding)
      const mockPayload = { email: 'test' };
      const mockPayloadBase64 = Buffer.from(
        JSON.stringify(mockPayload),
      ).toString('base64');

      // Remove any existing padding to test the padding logic
      const unpaddedBase64 = mockPayloadBase64.replace(/=+$/, '');
      const mockToken = `header.${unpaddedBase64}.signature`;

      const decoded = mockHandler.decodeIdToken(mockToken);

      expect(decoded).toBe(JSON.stringify(mockPayload));
    });

    it('handles base64 strings that need 3 padding characters', () => {
      // Create a payload that results in base64 string ending with 1 character (needs 3 padding)
      const mockPayload = { email: 't' };
      const mockPayloadBase64 = Buffer.from(
        JSON.stringify(mockPayload),
      ).toString('base64');

      // Remove any existing padding to test the padding logic
      const unpaddedBase64 = mockPayloadBase64.replace(/=+$/, '');
      const mockToken = `header.${unpaddedBase64}.signature`;

      const decoded = mockHandler.decodeIdToken(mockToken);

      expect(decoded).toBe(JSON.stringify(mockPayload));
    });

    it('handles base64 strings that already have correct padding', () => {
      // Create a payload that results in base64 string with proper length (no padding needed)
      const mockPayload = {
        email: 'test@example.com',
        name: 'John Doe',
        id: 123,
      };
      const mockPayloadBase64 = Buffer.from(
        JSON.stringify(mockPayload),
      ).toString('base64');
      const mockToken = `header.${mockPayloadBase64}.signature`;

      const decoded = mockHandler.decodeIdToken(mockToken);

      expect(decoded).toBe(JSON.stringify(mockPayload));
    });

    it('handles base64 strings with URL-safe characters that need conversion', () => {
      // Test with payload containing characters that get URL-safe encoding
      const mockPayload = {
        email: 'test@example.com',
        data: 'special_chars_+/',
      };
      const mockPayloadBase64 = Buffer.from(
        JSON.stringify(mockPayload),
      ).toString('base64');

      // Convert to URL-safe format and remove padding
      const urlSafeBase64 = mockPayloadBase64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const mockToken = `header.${urlSafeBase64}.signature`;

      const decoded = mockHandler.decodeIdToken(mockToken);

      expect(decoded).toBe(JSON.stringify(mockPayload));
    });

    it('handles empty payload', () => {
      const mockPayload = {};
      const mockPayloadBase64 = Buffer.from(
        JSON.stringify(mockPayload),
      ).toString('base64');

      // Remove padding to test padding logic
      const unpaddedBase64 = mockPayloadBase64.replace(/=+$/, '');
      const mockToken = `header.${unpaddedBase64}.signature`;

      const decoded = mockHandler.decodeIdToken(mockToken);

      expect(decoded).toBe(JSON.stringify(mockPayload));
    });

    it('handles payload with unicode characters and emojis', () => {
      const mockPayload = {
        email: 'test@example.com',
        name: 'José 🦊',
        message: 'Hello 世界! 🌍',
      };
      const mockPayloadBase64 = Buffer.from(
        JSON.stringify(mockPayload),
      ).toString('base64');

      // Remove padding to test padding logic
      const unpaddedBase64 = mockPayloadBase64.replace(/=+$/, '');
      const mockToken = `header.${unpaddedBase64}.signature`;

      const decoded = mockHandler.decodeIdToken(mockToken);

      expect(decoded).toBe(JSON.stringify(mockPayload));
    });

    it('handles very short base64 strings', () => {
      const mockPayload = { a: 1 };
      const mockPayloadBase64 = Buffer.from(
        JSON.stringify(mockPayload),
      ).toString('base64');

      // Remove padding to test padding logic
      const unpaddedBase64 = mockPayloadBase64.replace(/=+$/, '');
      const mockToken = `header.${unpaddedBase64}.signature`;

      const decoded = mockHandler.decodeIdToken(mockToken);

      expect(decoded).toBe(JSON.stringify(mockPayload));
    });

    it('handles very long base64 strings', () => {
      const mockPayload = {
        email: 'test@example.com',
        data: 'a'.repeat(1000), // Very long string
        array: Array.from({ length: 100 }, (_, i) => i), // Large array
      };
      const mockPayloadBase64 = Buffer.from(
        JSON.stringify(mockPayload),
      ).toString('base64');

      // Remove padding to test padding logic
      const unpaddedBase64 = mockPayloadBase64.replace(/=+$/, '');
      const mockToken = `header.${unpaddedBase64}.signature`;

      const decoded = mockHandler.decodeIdToken(mockToken);

      expect(decoded).toBe(JSON.stringify(mockPayload));
    });
  });

  describe('getAuthTokens', () => {
    const mockAuthServerUrl = 'https://auth.example.com';
    const mockPathname = 'auth/test';

    beforeEach(() => {
      (global.fetch as jest.Mock).mockClear();
    });

    it('successfully gets auth tokens with code', async () => {
      const mockResponse = {
        success: true,
        id_token: 'mock-id-token',
        refresh_token: 'mock-refresh-token',
        indexes: [1, 2, 3],
        endpoints: { endpoint1: 'value1' },
        message: 'Success',
        jwt_tokens: { token1: 'value1' },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const params: HandleFlowParams = {
        authConnection: AuthConnection.Google,
        code: 'mock-code',
        clientId: 'mock-client-id',
        redirectUri: 'mock-redirect-uri',
        codeVerifier: 'mock-code-verifier',
        web3AuthNetwork: Web3AuthNetwork.Mainnet,
      };

      const result = await mockHandler.getAuthTokens(params, mockAuthServerUrl);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockAuthServerUrl}/auth/google`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: 'mock-code',
            client_id: 'mock-client-id',
            login_provider: AuthConnection.Google,
            network: 'sapphire_mainnet',
            redirect_uri: 'mock-redirect-uri',
            code_verifier: 'mock-code-verifier',
          }),
        },
      );

      expect(result).toEqual(mockResponse);
    });

    it('successfully gets auth tokens with idToken', async () => {
      const mockResponse = {
        success: true,
        id_token: 'mock-id-token',
        refresh_token: 'mock-refresh-token',
        indexes: [1, 2, 3],
        endpoints: { endpoint1: 'value1' },
        message: 'Success',
        jwt_tokens: { token1: 'value1' },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const params: HandleFlowParams = {
        authConnection: AuthConnection.Apple,
        idToken: 'mock-id-token',
        clientId: 'mock-client-id',
        redirectUri: 'mock-redirect-uri',
        codeVerifier: 'mock-code-verifier',
        web3AuthNetwork: Web3AuthNetwork.Devnet,
      };

      const result = await mockHandler.getAuthTokens(params, mockAuthServerUrl);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockAuthServerUrl}/auth/google`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id_token: 'mock-id-token',
            client_id: 'mock-client-id',
            login_provider: AuthConnection.Apple,
            network: 'sapphire_devnet',
            redirect_uri: 'mock-redirect-uri',
            code_verifier: 'mock-code-verifier',
          }),
        },
      );

      expect(result).toEqual(mockResponse);
    });

    it('auth server returns error response with OAuthError', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Invalid credentials',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const params: HandleFlowParams = {
        authConnection: AuthConnection.Google,
        code: 'mock-code',
        clientId: 'mock-client-id',
        redirectUri: 'mock-redirect-uri',
        codeVerifier: 'mock-code-verifier',
        web3AuthNetwork: Web3AuthNetwork.Mainnet,
      };

      await expect(
        mockHandler.getAuthTokens(params, mockAuthServerUrl),
      ).rejects.toMatchObject({
        message: 'Auth server error - Invalid credentials',
        code: OAuthErrorType.AuthServerError,
      });
    });

    it('auth server returns non-200 status with OAuthError', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      });

      const params: HandleFlowParams = {
        authConnection: AuthConnection.Google,
        code: 'mock-code',
        clientId: 'mock-client-id',
        redirectUri: 'mock-redirect-uri',
        codeVerifier: 'mock-code-verifier',
        web3AuthNetwork: Web3AuthNetwork.Mainnet,
      };

      await expect(
        mockHandler.getAuthTokens(params, mockAuthServerUrl),
      ).rejects.toMatchObject({
        message:
          'Auth server error - AuthServer Error, request failed with status: [400]: Bad Request',
        code: OAuthErrorType.AuthServerError,
      });
    });

    it('makes correct request with code parameter', async () => {
      const mockResponse = {
        success: true,
        id_token: 'mock-id-token',
        message: 'Success',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const params: HandleFlowParams = {
        authConnection: AuthConnection.Google,
        code: 'mock-code',
        clientId: 'mock-client-id',
        redirectUri: 'mock-redirect-uri',
        codeVerifier: 'mock-code-verifier',
        web3AuthNetwork: Web3AuthNetwork.Mainnet,
      };

      const result = await getAuthTokens(
        params,
        mockPathname,
        mockAuthServerUrl,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockAuthServerUrl}/${mockPathname}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: 'mock-code',
            client_id: 'mock-client-id',
            login_provider: AuthConnection.Google,
            network: 'sapphire_mainnet',
            redirect_uri: 'mock-redirect-uri',
            code_verifier: 'mock-code-verifier',
          }),
        },
      );

      expect(result).toEqual(mockResponse);
    });

    it('makes correct request with idToken parameter', async () => {
      const mockResponse = {
        success: true,
        id_token: 'mock-id-token',
        message: 'Success',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const params: HandleFlowParams = {
        authConnection: AuthConnection.Apple,
        idToken: 'mock-id-token',
        clientId: 'mock-client-id',
        redirectUri: 'mock-redirect-uri',
        codeVerifier: 'mock-code-verifier',
        web3AuthNetwork: Web3AuthNetwork.Devnet,
      };

      const result = await getAuthTokens(
        params,
        mockPathname,
        mockAuthServerUrl,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockAuthServerUrl}/${mockPathname}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id_token: 'mock-id-token',
            client_id: 'mock-client-id',
            login_provider: AuthConnection.Apple,
            network: 'sapphire_devnet',
            redirect_uri: 'mock-redirect-uri',
            code_verifier: 'mock-code-verifier',
          }),
        },
      );

      expect(result).toEqual(mockResponse);
    });
  });
});
