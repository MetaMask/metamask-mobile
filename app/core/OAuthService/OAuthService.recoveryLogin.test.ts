import { Platform } from 'react-native';
import OAuthService from './OAuthService';
import { AuthConnection, AuthResponse } from './OAuthInterface';
import { createLoginHandler } from './OAuthLoginHandlers';

const mockSeedlessState: { authConnection?: string } = {
  authConnection: 'google',
};
const mockSeedlessAuthenticate = jest.fn();

jest.mock('../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SeedlessOnboardingController: {
        get state() {
          return mockSeedlessState;
        },
        authenticate: (args: unknown) => mockSeedlessAuthenticate(args),
      },
    },
  },
}));

jest.mock('./OAuthLoginHandlers', () => ({
  createLoginHandler: jest.fn(),
}));

jest.mock('../../util/analytics/whenEngineReady', () => ({
  whenEngineReady: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const AUTH_RESPONSE = {
  id_token: 'auth-server-id-token',
  access_token: 'access-token',
  metadata_access_token: 'metadata-access-token',
  refresh_token: 'refresh-token',
  revoke_token: 'revoke-token',
  account_name: 'user@example.com',
  indexes: [],
  endpoints: {},
} as AuthResponse;

const buildHandler = (overrides: { authResponse?: AuthResponse } = {}) => ({
  login: jest.fn().mockResolvedValue({
    authConnection: AuthConnection.Google,
    code: 'provider-code',
    clientId: 'client-id',
  }),
  getAuthTokens: jest
    .fn()
    .mockResolvedValue(overrides.authResponse ?? AUTH_RESPONSE),
  getUserInfo: jest.fn().mockReturnValue({
    userId: 'google-user',
    accountName: 'user@example.com',
  }),
});

describe('OAuthService recovery login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSeedlessState.authConnection = 'google';
  });

  describe('loginForRecovery', () => {
    it('returns the login result in memory without touching OAuth or seedless state', async () => {
      const handler = buildHandler();
      (createLoginHandler as jest.Mock).mockReturnValue(handler);
      const stateBefore = { ...OAuthService.localState };
      const handleSeedlessSpy = jest.spyOn(
        OAuthService,
        'handleSeedlessAuthenticate',
      );

      const login = await OAuthService.loginForRecovery();

      expect(createLoginHandler).toHaveBeenCalledWith(
        Platform.OS,
        AuthConnection.Google,
        false,
      );
      expect(login).toStrictEqual({
        authConnection: AuthConnection.Google,
        clientId: 'client-id',
        data: AUTH_RESPONSE,
        userId: 'google-user',
        accountName: 'user@example.com',
      });
      expect(OAuthService.localState).toEqual(stateBefore);
      expect(handleSeedlessSpy).not.toHaveBeenCalled();
      expect(mockSeedlessAuthenticate).not.toHaveBeenCalled();
      handleSeedlessSpy.mockRestore();
    });

    it('rejects an unsupported connection without starting a login', async () => {
      mockSeedlessState.authConnection = 'telegram';

      await expect(OAuthService.loginForRecovery()).rejects.toMatchObject({
        code: 'unsupported_social_login',
      });
      expect(createLoginHandler).not.toHaveBeenCalled();
    });
  });

  describe('authenticateSeedlessForRecovery', () => {
    it('authenticates seedless with the in-memory login values', async () => {
      const login = {
        authConnection: AuthConnection.Google,
        clientId: 'client-id',
        data: AUTH_RESPONSE,
        userId: 'google-user',
        accountName: 'user@example.com',
      };
      mockSeedlessAuthenticate.mockResolvedValue({ isNewUser: false });
      const stateBefore = { ...OAuthService.localState };

      await OAuthService.authenticateSeedlessForRecovery(login);

      expect(mockSeedlessAuthenticate).toHaveBeenCalledWith(
        expect.objectContaining({
          idTokens: ['auth-server-id-token'],
          userId: 'google-user',
          socialLoginEmail: 'user@example.com',
          refreshToken: 'refresh-token',
          revokeToken: 'revoke-token',
          accessToken: 'access-token',
          metadataAccessToken: 'metadata-access-token',
        }),
      );
      expect(OAuthService.localState).toEqual(stateBefore);
    });

    it('rejects when the login has no refresh token', async () => {
      const login = {
        authConnection: AuthConnection.Google,
        clientId: 'client-id',
        data: { ...AUTH_RESPONSE, refresh_token: undefined } as AuthResponse,
        userId: 'google-user',
      };

      await expect(
        OAuthService.authenticateSeedlessForRecovery(login),
      ).rejects.toThrow('No refresh token found');
      expect(mockSeedlessAuthenticate).not.toHaveBeenCalled();
    });

    it('rejects when the login has no user id', async () => {
      const login = {
        authConnection: AuthConnection.Google,
        clientId: 'client-id',
        data: AUTH_RESPONSE,
        userId: '',
      };

      await expect(
        OAuthService.authenticateSeedlessForRecovery(login),
      ).rejects.toThrow('No user id found');
      expect(mockSeedlessAuthenticate).not.toHaveBeenCalled();
    });
  });
});
