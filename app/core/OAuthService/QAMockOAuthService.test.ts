import { AuthConnection, OAuthLoginResultType } from './OAuthInterface';
import { OAuthError, OAuthErrorType } from './error';
import type { BaseLoginHandler } from './OAuthLoginHandlers/baseHandler';

const MOCK_JWT_TOKEN =
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN3bmFtOTA5QGdtYWlsLmNvbSIsInN1YiI6InN3bmFtOTA5QGdtYWlsLmNvbSIsImlzcyI6Im1ldGFtYXNrIiwiYXVkIjoibWV0YW1hc2siLCJpYXQiOjE3NDUyMDc1NjYsImVhdCI6MTc0NTIwNzg2NiwiZXhwIjoxNzQ1MjA3ODY2fQ.nXRRLB7fglRll7tMzFFCU0u7Pu6EddqEYf_DMyRgOENQ6tJ8OLtVknNf83_5a67kl_YKHFO-0PEjvJviPID6xg';

jest.mock('./OAuthLoginHandlers/constants', () => {
  const actual = jest.requireActual<
    typeof import('./OAuthLoginHandlers/constants')
  >('./OAuthLoginHandlers/constants');
  return {
    ...actual,
    E2E_QA_MOCK_OAUTH_TOKEN_URL: 'https://test.qa.mock/oauth/token',
  };
});

const mockGetE2EByoaAuthSecret = jest.fn<string | undefined, []>(
  () => undefined,
);
const mockGetE2EMockOAuthEmailForQaMock = jest.fn<string | undefined, []>(
  () => undefined,
);

jest.mock('../../util/environment', () => ({
  ...jest.requireActual('../../util/environment'),
  getE2EByoaAuthSecret: () => mockGetE2EByoaAuthSecret(),
  getE2EMockOAuthEmailForQaMock: () => mockGetE2EMockOAuthEmailForQaMock(),
}));

jest.mock('react-native-quick-crypto', () => ({
  __esModule: true,
  default: {
    randomBytes: jest.fn((size: number) =>
      Buffer.from(Array.from({ length: size }, (_, i) => (i % 255) + 1)),
    ),
  },
}));

import { QAMockOAuthService } from './QAMockOAuthService';

const MOCK_GOOGLE_OAUTH_CLIENT_ID =
  process.env.IOS_GOOGLE_CLIENT_ID ||
  process.env.ANDROID_GOOGLE_SERVER_CLIENT_ID ||
  'abc.apps.googleusercontent.com';

const createStubLoginHandler = (): BaseLoginHandler =>
  ({
    authConnection: AuthConnection.Google,
    options: {
      clientId: MOCK_GOOGLE_OAUTH_CLIENT_ID,
      authServerUrl: 'https://auth.example.com',
      web3AuthNetwork: 'sapphire_mainnet',
    },
    decodeIdToken: () =>
      JSON.stringify({
        email: 'swnam909@gmail.com',
        sub: 'swnam909@gmail.com',
        iss: 'metamask',
        aud: 'metamask',
        iat: 1745207566,
        eat: 1745207866,
        exp: 1745207866,
      }),
  }) as unknown as BaseLoginHandler;

describe('QAMockOAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetE2EByoaAuthSecret.mockReturnValue(undefined);
    mockGetE2EMockOAuthEmailForQaMock.mockReturnValue(undefined);
  });

  describe('parseAuthServiceResponse', () => {
    it('maps data.tokens envelope to AuthResponse', () => {
      const raw = {
        success: true,
        data: {
          tokens: {
            jwt_token: MOCK_JWT_TOKEN,
            access_token: 'a',
            metadata_access_token: 'm',
            refresh_token: 'r',
            revoke_token: 'v',
            indexes: [1, 2],
            endpoints: { k: 'v' },
          },
        },
      };

      const parsed = QAMockOAuthService.parseAuthServiceResponse(raw);

      expect(parsed.id_token).toBe(MOCK_JWT_TOKEN);
      expect(parsed.access_token).toBe('a');
      expect(parsed.metadata_access_token).toBe('m');
      expect(parsed.refresh_token).toBe('r');
      expect(parsed.revoke_token).toBe('v');
      expect(parsed.indexes).toEqual([1, 2]);
      expect(parsed.endpoints).toEqual({ k: 'v' });
    });

    it('throws OAuthError when id and access and metadata tokens are missing', () => {
      const raw = {
        data: {
          tokens: {
            jwt_token: MOCK_JWT_TOKEN,
            access_token: 'a',
          },
        },
      };

      expect(() => QAMockOAuthService.parseAuthServiceResponse(raw)).toThrow(
        OAuthError,
      );
    });
  });

  describe('exchangeTokens', () => {
    it('uses default BYOA secret when env secret is unset', async () => {
      const envelope = {
        success: true,
        data: {
          tokens: {
            jwt_token: MOCK_JWT_TOKEN,
            access_token: 'mock-access-token',
            metadata_access_token: 'mock-metadata-access-token',
          },
        },
      };
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(envelope),
      });

      await QAMockOAuthService.exchangeTokens(
        createStubLoginHandler(),
        fetchImpl as unknown as typeof fetch,
      );

      expect(fetchImpl).toHaveBeenCalledWith(
        'https://test.qa.mock/oauth/token',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'byoa-auth-secret': '6SMBaAx6*TG8AEQ+7Ap#zEUAIZ42',
          },
        }),
      );
    });

    it('POSTs QA mock URL and returns data userId and accountName', async () => {
      mockGetE2EByoaAuthSecret.mockReturnValue('test-byoa-secret');
      mockGetE2EMockOAuthEmailForQaMock.mockReturnValue(
        'newuser+e2e@web3auth.io',
      );
      const envelope = {
        success: true,
        data: {
          tokens: {
            jwt_token: MOCK_JWT_TOKEN,
            access_token: 'mock-access-token',
            metadata_access_token: 'mock-metadata-access-token',
          },
        },
      };
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(envelope),
      });

      const result = await QAMockOAuthService.exchangeTokens(
        createStubLoginHandler(),
        fetchImpl as unknown as typeof fetch,
      );

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(fetchImpl).toHaveBeenCalledWith(
        'https://test.qa.mock/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'byoa-auth-secret': 'test-byoa-secret',
          },
        }),
      );
      const body = JSON.parse(
        (fetchImpl.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body).toMatchObject({
        email_id: 'newuser+e2e@web3auth.io',
        client_id: MOCK_GOOGLE_OAUTH_CLIENT_ID,
        login_provider: AuthConnection.Google,
        access_type: 'offline',
      });
      expect(result.userId).toBe('swnam909@gmail.com');
      expect(result.accountName).toBe('swnam909@gmail.com');
      expect(result.data.id_token).toBe(MOCK_JWT_TOKEN);
    });

    it('throws OAuthError when response is not ok', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.resolve({}),
      });

      await expect(
        QAMockOAuthService.exchangeTokens(
          createStubLoginHandler(),
          fetchImpl as unknown as typeof fetch,
        ),
      ).rejects.toMatchObject({ code: OAuthErrorType.LoginError });
    });
  });
});
