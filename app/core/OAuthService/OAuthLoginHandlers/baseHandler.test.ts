import {
  AuthConnection,
  AuthRequestParams,
  HandleFlowParams,
  LoginHandlerResult,
} from '../OAuthInterface';
import { BaseLoginHandler, getAuthTokens } from './baseHandler';
import { OAuthErrorType } from '../error';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';

// Mock fetch globally
global.fetch = jest.fn();

const mockRandomUUID = jest.fn();

// Mock Logger
jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('react-native-quick-crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from('mock-random-bytes')),
  randomUUID: () => mockRandomUUID(),
}));

// Mock handler class that extends BaseLoginHandler for testing
class MockLoginHandler extends BaseLoginHandler {
  getAuthTokenRequestData(params: HandleFlowParams): AuthRequestParams {
    let body: AuthRequestParams;
    if ('code' in params) {
      body = {
        code: params.code,
        client_id: params.clientId,
        login_provider: params.authConnection,
        network: params.web3AuthNetwork,
        redirect_uri: params.redirectUri,
        code_verifier: params.codeVerifier,
      };
    } else {
      body = {
        id_token: params.idToken,
        client_id: params.clientId,
        login_provider: params.authConnection,
        network: params.web3AuthNetwork,
        redirect_uri: params.redirectUri,
        code_verifier: params.codeVerifier,
      };
    }
    return body;
  }
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
const mockBaseHandlerParams = {
  authServerUrl: 'https://auth.example.com',
  clientId: 'mock-client-id',
  web3AuthNetwork: Web3AuthNetwork.Mainnet,
};
describe('BaseLoginHandler', () => {
  let mockHandler: MockLoginHandler;

  beforeEach(() => {
    mockHandler = new MockLoginHandler(mockBaseHandlerParams);
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('generates a nonce when instantiated', () => {
      mockRandomUUID.mockReturnValue('mock-random-uuid-1');
      const handler1 = new MockLoginHandler(mockBaseHandlerParams);
      mockRandomUUID.mockReturnValue('mock-random-uuid-2');
      const handler2 = new MockLoginHandler(mockBaseHandlerParams);

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

      // Remove the padding characters to force the padding logic to be triggered
      const nonPaddedBase64 = mockPayloadBase64.replace(/[=]/g, '');
      const mockToken = `header.${nonPaddedBase64}.signature`;

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
        revoke_token: 'mock-revoke-token',
        access_token: 'mock-access-token',
        metadata_access_token: 'mock-metadata-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
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
            access_type: 'offline',
          }),
        },
      );

      expect(result).toEqual(mockResponse);
    });

    it('successfully gets auth tokens with idToken', async () => {
      const mockResponse = {
        id_token: 'mock-id-token',
        refresh_token: 'mock-refresh-token',
        revoke_token: 'mock-revoke-token',
        access_token: 'mock-access-token',
        metadata_access_token: 'mock-metadata-access-token',
        expires_in: 3600,
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
            access_type: 'offline',
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
        status: 400,
        json: () => Promise.resolve(mockErrorResponse),
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
        refresh_token: 'mock-refresh-token',
        revoke_token: 'mock-revoke-token',
        access_token: 'mock-access-token',
        metadata_access_token: 'mock-metadata-access-token',
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
        mockHandler.getAuthTokenRequestData(params),
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
            access_type: 'offline',
          }),
        },
      );

      expect(result).toEqual(mockResponse);
    });

    it('makes correct request with idToken parameter', async () => {
      const mockResponse = {
        success: true,
        id_token: 'mock-id-token',
        refresh_token: 'mock-refresh-token',
        revoke_token: 'mock-revoke-token',
        access_token: 'mock-access-token',
        metadata_access_token: 'mock-metadata-access-token',
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
        mockHandler.getAuthTokenRequestData(params),
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
            access_type: 'offline',
          }),
        },
      );

      expect(result).toEqual(mockResponse);
    });
  });
});
