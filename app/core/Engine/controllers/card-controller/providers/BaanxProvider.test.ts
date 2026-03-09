import { BaanxProvider } from './BaanxProvider';
import { CardApiError, type BaanxService } from '../services/BaanxService';
import {
  CardStatus,
  CardType,
  FundingAssetStatus,
  CardProviderErrorCode,
  type CardAuthTokens,
} from '../provider-types';

jest.mock('../../../../../util/Logger');
jest.mock('../../../../../components/UI/Card/util/pkceHelpers', () => ({
  generateState: () => 'mock-state-123',
  generatePKCEPair: () =>
    Promise.resolve({
      codeVerifier: 'mock-verifier',
      codeChallenge: 'mock-challenge',
    }),
}));

const AUTH_TOKENS: CardAuthTokens = {
  accessToken: 'test-access',
  refreshToken: 'test-refresh',
  accessTokenExpiresAt: Date.now() + 3600000,
  refreshTokenExpiresAt: Date.now() + 86400000,
  location: 'us',
};

function createMockService(): jest.Mocked<BaanxService> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    request: jest.fn(),
    setLocation: jest.fn(),
    location: 'international',
    apiKey: 'test-api-key',
  } as unknown as jest.Mocked<BaanxService>;
}

describe('BaanxProvider', () => {
  let service: jest.Mocked<BaanxService>;
  let provider: BaanxProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createMockService();
    provider = new BaanxProvider({ service });
  });

  describe('capabilities', () => {
    it('exposes id as baanx', () => {
      expect(provider.id).toBe('baanx');
    });

    it('declares email_password auth method', () => {
      expect(provider.capabilities.authMethod).toBe('email_password');
    });

    it('supports funding approval on linea and base', () => {
      expect(provider.capabilities.fundingChains).toStrictEqual([
        'eip155:59144',
        'eip155:8453',
      ]);
    });

    it('supports freeze', () => {
      expect(provider.capabilities.supportsFreeze).toBe(true);
    });

    it('supports OTP', () => {
      expect(provider.capabilities.supportsOTP).toBe(true);
    });
  });

  describe('validateTokens', () => {
    it('returns valid when tokens are not expired', () => {
      expect(provider.validateTokens(AUTH_TOKENS)).toBe('valid');
    });

    it('returns needs_refresh when access token is near expiry', () => {
      const nearExpiry = {
        ...AUTH_TOKENS,
        accessTokenExpiresAt: Date.now() + 60_000,
      };

      expect(provider.validateTokens(nearExpiry)).toBe('needs_refresh');
    });

    it('returns expired when access-only token is near expiry', () => {
      const accessOnly = {
        ...AUTH_TOKENS,
        refreshToken: undefined,
        refreshTokenExpiresAt: undefined,
        accessTokenExpiresAt: Date.now() + 60_000,
      };

      expect(provider.validateTokens(accessOnly)).toBe('expired');
    });

    it('returns valid when access token is valid even if refresh is near expiry', () => {
      const refreshNearExpiry = {
        ...AUTH_TOKENS,
        refreshTokenExpiresAt: Date.now() + 30 * 60_000,
      };

      expect(provider.validateTokens(refreshNearExpiry)).toBe('valid');
    });

    it('returns expired when access token needs refresh but refresh token is near expiry', () => {
      const bothNearExpiry = {
        ...AUTH_TOKENS,
        accessTokenExpiresAt: Date.now() + 60_000,
        refreshTokenExpiresAt: Date.now() + 30 * 60_000,
      };

      expect(provider.validateTokens(bothNearExpiry)).toBe('expired');
    });
  });

  describe('getCardHomeData', () => {
    it('returns populated home data with assets and card', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({
            networks: [
              {
                network: 'linea',
                chainId: '59144',
                delegationContract: '0xabc',
                tokens: { USDC: { address: '0x1', decimals: 6 } },
              },
            ],
          });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test User',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            firstName: 'Test',
            lastName: 'User',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '100',
              allowance: '999999999999',
              priority: 1,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USD Coin',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([
            {
              id: 1,
              address: '0xwallet',
              currency: 'USDC',
              network: 'linea',
              priority: 1,
            },
          ]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddress', AUTH_TOKENS);

      expect(result.primaryAsset).not.toBeNull();
      expect(result.primaryAsset?.symbol).toBe('USDC');
      expect(result.primaryAsset?.status).toBe(FundingAssetStatus.Active);
      expect(result.primaryAsset?.allowance).toBe('999999999999');
      expect(result.assets).toHaveLength(1);
      expect(result.card?.id).toBe('card-1');
      expect(result.card?.status).toBe(CardStatus.ACTIVE);
      expect(result.account?.verificationStatus).toBe('VERIFIED');
      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('returns empty home data when all API calls fail', async () => {
      service.get.mockRejectedValue(new Error('Network error'));

      const result = await provider.getCardHomeData('0xaddress', AUTH_TOKENS);

      expect(result.primaryAsset).toBeNull();
      expect(result.assets).toHaveLength(0);
      expect(result.card).toBeNull();
    });

    it('builds kyc_pending alert for pending verification', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'PENDING',
          });
        }
        return Promise.resolve([]);
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.alerts).toContainEqual(
        expect.objectContaining({ type: 'kyc_pending' }),
      );
    });

    it('builds enable_card action when verified but funding inactive', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '0',
              allowance: '0',
              priority: 1,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([
            {
              id: 1,
              address: '0xwallet',
              currency: 'USDC',
              network: 'linea',
              priority: 1,
            },
          ]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.actions).toContainEqual(
        expect.objectContaining({ type: 'enable_card' }),
      );
    });
  });

  describe('getCardDetails', () => {
    it('returns mapped card details', async () => {
      service.get.mockResolvedValue({
        id: 'card-1',
        status: CardStatus.ACTIVE,
        type: CardType.VIRTUAL,
        panLast4: '5678',
        holderName: 'User',
        isFreezable: true,
      });

      const result = await provider.getCardDetails(AUTH_TOKENS);

      expect(result.id).toBe('card-1');
      expect(result.lastFour).toBe('5678');
      expect(result.status).toBe(CardStatus.ACTIVE);
    });

    it('throws NoCard error on 404', async () => {
      service.get.mockRejectedValue(
        new CardApiError(404, '/v1/card/status', 'Not found'),
      );

      await expect(provider.getCardDetails(AUTH_TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.NoCard,
      });
    });

    it('throws Network error on statusCode 0', async () => {
      service.get.mockRejectedValue(new CardApiError(0, '/v1/card/status', ''));

      await expect(provider.getCardDetails(AUTH_TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.Network,
      });
    });
  });

  describe('freezeCard / unfreezeCard', () => {
    it('calls freeze endpoint', async () => {
      service.post.mockResolvedValue({});

      await provider.freezeCard('card-1', AUTH_TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/v1/card/freeze',
        {},
        AUTH_TOKENS,
      );
    });

    it('propagates error when freeze fails', async () => {
      service.post.mockRejectedValue(
        new CardApiError(500, '/v1/card/freeze', 'Internal server error'),
      );

      await expect(
        provider.freezeCard('card-1', AUTH_TOKENS),
      ).rejects.toThrow();
    });

    it('calls unfreeze endpoint', async () => {
      service.post.mockResolvedValue({});

      await provider.unfreezeCard('card-1', AUTH_TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/v1/card/unfreeze',
        {},
        AUTH_TOKENS,
      );
    });

    it('propagates error when unfreeze fails', async () => {
      service.post.mockRejectedValue(
        new CardApiError(500, '/v1/card/unfreeze', 'Internal server error'),
      );

      await expect(
        provider.unfreezeCard('card-1', AUTH_TOKENS),
      ).rejects.toThrow();
    });
  });

  describe('getOnChainAssets', () => {
    it('returns empty home data with add_funds action', async () => {
      const result = await provider.getOnChainAssets('0xaddr');

      expect(result.primaryAsset).toBeNull();
      expect(result.assets).toHaveLength(0);
      expect(result.actions).toContainEqual(
        expect.objectContaining({ type: 'add_funds', enabled: true }),
      );
    });
  });

  describe('initiateAuth', () => {
    it('returns auth session with PKCE params in metadata', async () => {
      service.get.mockResolvedValue({
        token: 'init-token',
        url: 'https://...',
      });

      const session = await provider.initiateAuth('US');

      expect(session.id).toBe('init-token');
      expect(session.currentStep).toStrictEqual({ type: 'email_password' });
      expect(session._metadata).toStrictEqual({
        initiateToken: 'init-token',
        location: 'us',
        state: 'mock-state-123',
        codeVerifier: 'mock-verifier',
      });
    });

    it('sends PKCE challenge and client credentials as query params', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });

      await provider.initiateAuth('US');

      const calledPath = (service.get as jest.Mock).mock.calls[0][0] as string;
      expect(calledPath).toContain('code_challenge=mock-challenge');
      expect(calledPath).toContain('code_challenge_method=S256');
      expect(calledPath).toContain('state=mock-state-123');
      expect(calledPath).toContain('client_id=test-api-key');
      expect(calledPath).toContain('client_secret=test-api-key');
    });
  });

  describe('submitCredentials', () => {
    it('returns onboardingRequired when login response has phase', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockResolvedValue({
        userId: 'user-123',
        phase: 'PHONE_NUMBER',
        isOtpRequired: false,
        phoneNumber: null,
        accessToken: 'login-token',
        verificationState: 'UNVERIFIED',
        isLinked: false,
      });

      const result = await provider.submitCredentials(session, {
        type: 'email_password',
        email: 'test@example.com',
        password: 'pass',
      });

      expect(result.done).toBe(false);
      expect(result.nextStep).toBeUndefined();
      expect(result.onboardingRequired).toStrictEqual({
        sessionId: 'user-123',
        phase: 'PHONE_NUMBER',
      });
    });

    it('completes auth with PKCE code_verifier and validates state', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockResolvedValue({
        userId: 'user-1',
        phase: null,
        isOtpRequired: false,
        phoneNumber: null,
        accessToken: 'login-token',
        verificationState: 'VERIFIED',
        isLinked: true,
      });
      service.request
        .mockResolvedValueOnce({
          state: 'mock-state-123',
          url: '',
          code: 'auth-code',
        })
        .mockResolvedValueOnce({
          access_token: 'final-access',
          refresh_token: 'final-refresh',
          expires_in: 3600,
          refresh_token_expires_in: 86400,
        });

      const result = await provider.submitCredentials(session, {
        type: 'email_password',
        email: 'test@example.com',
        password: 'pass',
      });

      expect(result.done).toBe(true);
      expect(result.tokenSet?.accessToken).toBe('final-access');

      const tokenExchangeCall = service.request.mock.calls[1];
      expect(tokenExchangeCall[1]).toStrictEqual(
        expect.objectContaining({
          body: expect.objectContaining({
            code_verifier: 'mock-verifier',
            redirect_uri: 'https://example.com',
          }),
          headers: expect.objectContaining({
            'x-secret-key': 'test-api-key',
          }),
        }),
      );
    });

    it('returns OTP step with userId stored in session metadata', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockResolvedValueOnce({
        userId: 'user-1',
        phase: null,
        isOtpRequired: true,
        phoneNumber: '+1234',
        accessToken: null,
        verificationState: 'VERIFIED',
        isLinked: true,
      });

      const result = await provider.submitCredentials(session, {
        type: 'email_password',
        email: 'test@example.com',
        password: 'pass',
      });

      expect(result.done).toBe(false);
      expect(result.nextStep).toStrictEqual({
        type: 'otp',
        destination: '+1234',
      });
      expect(session._metadata.otpUserId).toBe('user-1');
    });

    it('completes auth when re-submitting credentials with otpCode', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockResolvedValueOnce({
        userId: 'user-1',
        phase: null,
        isOtpRequired: false,
        phoneNumber: null,
        accessToken: 'login-token-after-otp',
        verificationState: 'VERIFIED',
        isLinked: true,
      });
      service.request
        .mockResolvedValueOnce({
          state: 'mock-state-123',
          url: '',
          code: 'auth-code',
        })
        .mockResolvedValueOnce({
          access_token: 'final-access',
          refresh_token: 'final-refresh',
          expires_in: 3600,
          refresh_token_expires_in: 86400,
        });

      const result = await provider.submitCredentials(session, {
        type: 'email_password',
        email: 'test@example.com',
        password: 'pass',
        otpCode: '123456',
      });

      expect(result.done).toBe(true);
      expect(result.tokenSet?.accessToken).toBe('final-access');

      const loginCall = service.post.mock.calls[0];
      expect(loginCall[1]).toStrictEqual(
        expect.objectContaining({ otpCode: '123456' }),
      );
    });

    it('throws on OAuth state mismatch', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockResolvedValue({
        userId: 'user-1',
        phase: null,
        isOtpRequired: false,
        phoneNumber: null,
        accessToken: 'login-token',
        verificationState: 'VERIFIED',
        isLinked: true,
      });
      service.request.mockResolvedValueOnce({
        state: 'wrong-state',
        url: '',
        code: 'auth-code',
      });

      await expect(
        provider.submitCredentials(session, {
          type: 'email_password',
          email: 'test@example.com',
          password: 'pass',
        }),
      ).rejects.toThrow('OAuth state mismatch');
    });

    it('throws for unsupported credential type', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      await expect(
        provider.submitCredentials(session, {
          type: 'siwe',
          signature: '0x...',
        }),
      ).rejects.toThrow('Unsupported credential type');
    });

    it('throws AccountDisabled when response contains disabled message', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockRejectedValue(
        new CardApiError(
          403,
          '/v1/auth/login',
          'Your account has been disabled',
        ),
      );

      await expect(
        provider.submitCredentials(session, {
          type: 'email_password',
          email: 'test@example.com',
          password: 'pass',
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.AccountDisabled,
      });
    });

    it('throws InvalidOtp on 400 when otpCode is present', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockRejectedValue(
        new CardApiError(400, '/v1/auth/login', 'Bad request'),
      );

      await expect(
        provider.submitCredentials(session, {
          type: 'email_password',
          email: 'test@example.com',
          password: 'pass',
          otpCode: '123456',
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.InvalidOtp,
      });
    });

    it('throws InvalidCredentials on 401', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockRejectedValue(
        new CardApiError(401, '/v1/auth/login', 'Unauthorized'),
      );

      await expect(
        provider.submitCredentials(session, {
          type: 'email_password',
          email: 'test@example.com',
          password: 'pass',
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.InvalidCredentials,
      });
    });

    it('throws ServerError on 500', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockRejectedValue(
        new CardApiError(500, '/v1/auth/login', 'Internal server error'),
      );

      await expect(
        provider.submitCredentials(session, {
          type: 'email_password',
          email: 'test@example.com',
          password: 'pass',
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.ServerError,
      });
    });
  });

  describe('sendOtp', () => {
    it('posts userId to the OTP trigger endpoint', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      session._metadata.otpUserId = 'user-1';
      service.post.mockResolvedValue({});

      await provider.sendOtp(session);

      expect(service.post).toHaveBeenCalledWith('/v1/auth/login/otp', {
        userId: 'user-1',
      });
    });

    it('throws when no userId in session metadata', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      await expect(provider.sendOtp(session)).rejects.toThrow(
        'No userId in session',
      );
    });
  });

  describe('logout', () => {
    it('calls logout endpoint', async () => {
      service.post.mockResolvedValue({});

      await provider.logout(AUTH_TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/v1/auth/logout',
        {},
        AUTH_TOKENS,
      );
    });

    it('propagates error when logout fails', async () => {
      service.post.mockRejectedValue(
        new CardApiError(500, '/v1/auth/logout', 'Internal server error'),
      );

      await expect(provider.logout(AUTH_TOKENS)).rejects.toThrow();
    });
  });

  describe('refreshTokens', () => {
    it('returns new token set from refresh endpoint', async () => {
      service.request.mockResolvedValue({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 7200,
        refresh_token_expires_in: 172800,
      });

      const result = await provider.refreshTokens(AUTH_TOKENS);

      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
      expect(result.location).toBe('us');
      expect(service.request).toHaveBeenCalledWith(
        '/v1/auth/oauth/token',
        expect.objectContaining({
          method: 'POST',
          body: {
            grant_type: 'refresh_token',
            refresh_token: 'test-refresh',
          },
          headers: { 'x-secret-key': 'test-api-key' },
        }),
      );
    });

    it('throws when no refresh token is available', async () => {
      const accessOnly = { ...AUTH_TOKENS, refreshToken: undefined };

      await expect(provider.refreshTokens(accessOnly)).rejects.toThrow(
        'No refresh token available',
      );
    });
  });

  describe('getCardSecureView', () => {
    it('returns url and token from the details endpoint', async () => {
      service.post.mockResolvedValue({
        url: 'https://secure.view/card',
        token: 'view-token-123',
      });

      const result = await provider.getCardSecureView(AUTH_TOKENS, {
        customCss: '.card { color: red }',
      });

      expect(result.url).toBe('https://secure.view/card');
      expect(result.token).toBe('view-token-123');
      expect(service.post).toHaveBeenCalledWith(
        '/v1/card/details/token',
        { customCss: '.card { color: red }' },
        AUTH_TOKENS,
      );
    });

    it('propagates error when secure view request fails', async () => {
      service.post.mockRejectedValue(
        new CardApiError(500, '/v1/card/details/token', 'Server error'),
      );

      await expect(
        provider.getCardSecureView(AUTH_TOKENS, {}),
      ).rejects.toThrow();
    });
  });

  describe('updateAssetPriority', () => {
    it('sends priority mapping with selected asset as priority 1', async () => {
      service.put.mockResolvedValue({});

      const assets = [
        {
          symbol: 'USDC',
          name: 'USDC',
          address: '0x1',
          decimals: 6,
          chainId: 'eip155:59144' as const,
          balance: '100',
          allowance: '999999999999',
          priority: 1,
          status: FundingAssetStatus.Active,
        },
        {
          symbol: 'mUSD',
          name: 'mUSD',
          address: '0x2',
          decimals: 6,
          chainId: 'eip155:8453' as const,
          balance: '50',
          allowance: '999999999999',
          priority: 2,
          status: FundingAssetStatus.Active,
        },
      ];

      await provider.updateAssetPriority(assets[1], assets, AUTH_TOKENS);

      expect(service.put).toHaveBeenCalledWith(
        '/v1/wallet/external/priority',
        [
          { address: '0x1', currency: 'USDC', network: 'linea', priority: 2 },
          { address: '0x2', currency: 'mUSD', network: 'base', priority: 1 },
        ],
        AUTH_TOKENS,
      );
    });

    it('produces contiguous priorities when first of three assets is selected', async () => {
      service.put.mockResolvedValue({});

      const assets = [
        {
          symbol: 'USDC',
          name: 'USDC',
          address: '0x1',
          decimals: 6,
          chainId: 'eip155:59144' as const,
          balance: '100',
          allowance: '999999999999',
          priority: 2,
          status: FundingAssetStatus.Active,
        },
        {
          symbol: 'mUSD',
          name: 'mUSD',
          address: '0x2',
          decimals: 6,
          chainId: 'eip155:8453' as const,
          balance: '50',
          allowance: '999999999999',
          priority: 1,
          status: FundingAssetStatus.Active,
        },
        {
          symbol: 'USDT',
          name: 'USDT',
          address: '0x3',
          decimals: 6,
          chainId: 'eip155:59144' as const,
          balance: '25',
          allowance: '999999999999',
          priority: 3,
          status: FundingAssetStatus.Active,
        },
      ];

      await provider.updateAssetPriority(assets[0], assets, AUTH_TOKENS);

      expect(service.put).toHaveBeenCalledWith(
        '/v1/wallet/external/priority',
        [
          { address: '0x1', currency: 'USDC', network: 'linea', priority: 1 },
          { address: '0x2', currency: 'mUSD', network: 'base', priority: 2 },
          { address: '0x3', currency: 'USDT', network: 'linea', priority: 3 },
        ],
        AUTH_TOKENS,
      );
    });
  });

  describe('approveFunding', () => {
    it('posts funding approval to the delegation endpoint', async () => {
      service.post.mockResolvedValue({});

      await provider.approveFunding(
        {
          address: '0xwallet',
          amount: '1000',
          currency: 'USDC',
          network: 'linea',
          faucet: true,
        },
        AUTH_TOKENS,
        {} as never,
      );

      expect(service.post).toHaveBeenCalledWith(
        '/v1/delegation/evm/post-approval',
        {
          walletAddress: '0xwallet',
          amount: '1000',
          currency: 'USDC',
          network: 'linea',
          faucet: true,
        },
        AUTH_TOKENS,
      );
    });

    it('defaults faucet to false when not provided', async () => {
      service.post.mockResolvedValue({});

      await provider.approveFunding(
        {
          address: '0xwallet',
          amount: '500',
          currency: 'mUSD',
          network: 'base',
        },
        AUTH_TOKENS,
        {} as never,
      );

      expect(service.post).toHaveBeenCalledWith(
        '/v1/delegation/evm/post-approval',
        expect.objectContaining({ faucet: false }),
        AUTH_TOKENS,
      );
    });

    it('propagates error when funding approval fails', async () => {
      service.post.mockRejectedValue(
        new CardApiError(
          500,
          '/v1/delegation/evm/post-approval',
          'Server error',
        ),
      );

      await expect(
        provider.approveFunding(
          {
            address: '0xwallet',
            amount: '1000',
            currency: 'USDC',
            network: 'linea',
          },
          AUTH_TOKENS,
          {} as never,
        ),
      ).rejects.toThrow();
    });
  });

  describe('getRegistrationSettings', () => {
    it('sets location and returns mapped country list', async () => {
      service.get.mockResolvedValue({
        countries: [
          { iso3166alpha2: 'US', name: 'United States' },
          { iso3166alpha2: 'GB', name: 'United Kingdom' },
        ],
      });

      const result = await provider.getRegistrationSettings('US');

      expect(service.setLocation).toHaveBeenCalledWith('us');
      expect(result.countries).toStrictEqual(['US', 'GB']);
      expect(result.data).toBeDefined();
    });

    it('sets international location for non-US country', async () => {
      service.get.mockResolvedValue({ countries: [] });

      await provider.getRegistrationSettings('DE');

      expect(service.setLocation).toHaveBeenCalledWith('international');
    });

    it('propagates error when settings request fails', async () => {
      service.get.mockRejectedValue(
        new CardApiError(500, '/v1/auth/register/settings', 'Server error'),
      );

      await expect(provider.getRegistrationSettings('US')).rejects.toThrow();
    });
  });

  describe('getRegistrationStatus', () => {
    it('returns status from registration endpoint', async () => {
      service.get.mockResolvedValue({
        verificationState: 'VERIFIED',
        firstName: 'Test',
      });

      const result = await provider.getRegistrationStatus('session-1', 'GB');

      expect(service.setLocation).toHaveBeenCalledWith('international');
      expect(service.get).toHaveBeenCalledWith(
        '/v1/auth/register/status/session-1',
      );
      expect(result.status).toBe('VERIFIED');
      expect(result.verificationState).toBe('VERIFIED');
    });

    it('returns UNKNOWN when verificationState is absent', async () => {
      service.get.mockResolvedValue({});

      const result = await provider.getRegistrationStatus('session-2', 'US');

      expect(result.status).toBe('UNKNOWN');
      expect(result.verificationState).toBeUndefined();
    });

    it('propagates error when status request fails', async () => {
      service.get.mockRejectedValue(
        new CardApiError(500, '/v1/auth/register/status/s1', 'Server error'),
      );

      await expect(
        provider.getRegistrationStatus('s1', 'US'),
      ).rejects.toThrow();
    });
  });

  describe('submitOnboardingStep', () => {
    it('posts to the mapped endpoint for a known step type', async () => {
      service.post.mockResolvedValue({ id: 'result-1' });

      const result = await provider.submitOnboardingStep({
        type: 'email_verification',
        data: { email: 'test@example.com' },
        country: 'US',
      });

      expect(service.setLocation).toHaveBeenCalledWith('us');
      expect(service.post).toHaveBeenCalledWith(
        '/v1/auth/register/email/send',
        { email: 'test@example.com' },
      );
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({ id: 'result-1' });
    });

    it('falls back to generic endpoint for unknown step type', async () => {
      service.post.mockResolvedValue({});

      await provider.submitOnboardingStep({
        type: 'custom_step',
        data: {},
        country: 'GB',
      });

      expect(service.post).toHaveBeenCalledWith(
        '/v1/auth/register/custom_step',
        {},
      );
    });

    it('returns error result when the request fails', async () => {
      service.post.mockRejectedValue(new Error('Network failure'));

      const result = await provider.submitOnboardingStep({
        type: 'phone_verification',
        data: { phone: '+1234' },
        country: 'US',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
    });
  });

  describe('getCardHomeData edge cases', () => {
    it('builds close_to_spending_limit alert for Limited asset', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '50',
              allowance: '100',
              priority: 1,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.alerts).toContainEqual(
        expect.objectContaining({ type: 'close_to_spending_limit' }),
      );
    });

    it('suppresses non-kyc alerts when card is frozen', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.FROZEN,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '50',
              allowance: '100',
              priority: 1,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.alerts).not.toContainEqual(
        expect.objectContaining({ type: 'close_to_spending_limit' }),
      );
    });

    it('returns no actions when card is null', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.reject(new Error('no card'));
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'VERIFIED',
          });
        }
        return Promise.resolve([]);
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.card).toBeNull();
      expect(result.actions).toHaveLength(0);
    });

    it('falls back to next priority asset when user priority has no balance', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({
            networks: [
              { network: 'linea', chainId: '59144', tokens: { USDC: {} } },
            ],
          });
        }
        if (path === '/v1/card/status') {
          return Promise.reject(new Error('no card'));
        }
        if (path === '/v1/user') {
          return Promise.reject(new Error('no user'));
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'mUSD',
              balance: '0',
              allowance: '999999999999',
              priority: 0,
              tokenDetails: {
                address: '0x2',
                decimals: 6,
                symbol: 'mUSD',
                name: 'mUSD',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
            {
              id: 2,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '50',
              allowance: '999999999999',
              priority: 0,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([
            {
              id: 1,
              address: '0xwallet',
              currency: 'mUSD',
              network: 'linea',
              priority: 1,
            },
            {
              id: 2,
              address: '0xwallet',
              currency: 'USDC',
              network: 'linea',
              priority: 2,
            },
          ]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.assets).toHaveLength(2);
      expect(result.assets[0].symbol).toBe('mUSD');
      expect(result.assets[1].symbol).toBe('USDC');
      expect(result.primaryAsset?.symbol).toBe('USDC');
    });

    it('uses user priority asset when no other asset has balance', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({
            networks: [
              { network: 'linea', chainId: '59144', tokens: { USDC: {} } },
            ],
          });
        }
        if (path === '/v1/card/status') {
          return Promise.reject(new Error('no card'));
        }
        if (path === '/v1/user') {
          return Promise.reject(new Error('no user'));
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'mUSD',
              balance: '0',
              allowance: '999999999999',
              priority: 0,
              tokenDetails: {
                address: '0x2',
                decimals: 6,
                symbol: 'mUSD',
                name: 'mUSD',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
            {
              id: 2,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '0',
              allowance: '999999999999',
              priority: 0,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([
            {
              id: 1,
              address: '0xwallet',
              currency: 'mUSD',
              network: 'linea',
              priority: 1,
            },
            {
              id: 2,
              address: '0xwallet',
              currency: 'USDC',
              network: 'linea',
              priority: 2,
            },
          ]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.primaryAsset?.symbol).toBe('mUSD');
    });
  });

  describe('getFundingConfig', () => {
    it('returns all tokens from all supported networks', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'production',
            delegationContract: '0xdel1',
            tokens: {
              USDC: { symbol: 'USDC', decimals: 6, address: '0xusdc-linea' },
              mUSD: { symbol: 'mUSD', decimals: 18, address: '0xmusd-linea' },
            },
          },
          {
            network: 'base',
            chainId: '8453',
            environment: 'production',
            delegationContract: '0xdel2',
            tokens: {
              USDT: { symbol: 'USDT', decimals: 6, address: '0xusdt-base' },
            },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(config.maxLimit).toBe('2199023255551');
      expect(config.supportedChains).toStrictEqual([
        'eip155:59144',
        'eip155:8453',
      ]);
      expect(config.fundingOptions).toHaveLength(3);
      expect(config.fundingOptions).toStrictEqual([
        expect.objectContaining({
          symbol: 'USDC',
          asset: expect.objectContaining({
            address: '0xusdc-linea',
            decimals: 6,
            chainId: 'eip155:59144',
          }),
        }),
        expect.objectContaining({
          symbol: 'mUSD',
          asset: expect.objectContaining({
            address: '0xmusd-linea',
            decimals: 18,
            chainId: 'eip155:59144',
          }),
        }),
        expect.objectContaining({
          symbol: 'USDT',
          asset: expect.objectContaining({
            address: '0xusdt-base',
            decimals: 6,
            chainId: 'eip155:8453',
          }),
        }),
      ]);
    });

    it('deduplicates tokens by address and chainId', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'production',
            delegationContract: '0xdel1',
            tokens: {
              USDC: { symbol: 'USDC', decimals: 6, address: '0xusdc' },
              USDC_v2: { symbol: 'USDC', decimals: 6, address: '0xusdc' },
            },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(config.fundingOptions).toHaveLength(1);
    });

    it('skips tokens without an address', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'production',
            delegationContract: '0xdel1',
            tokens: {
              USDC: { symbol: 'USDC', decimals: 6, address: '0xusdc' },
              BAD: { symbol: 'BAD', decimals: 6, address: '' },
            },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(config.fundingOptions).toHaveLength(1);
      expect(config.fundingOptions[0].symbol).toBe('USDC');
    });

    it('excludes unsupported networks', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'production',
            delegationContract: '0xdel1',
            tokens: {
              USDC: { symbol: 'USDC', decimals: 6, address: '0xusdc' },
            },
          },
          {
            network: 'polygon',
            chainId: '137',
            environment: 'production',
            delegationContract: '0xdel2',
            tokens: {
              DAI: { symbol: 'DAI', decimals: 18, address: '0xdai' },
            },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(config.supportedChains).toStrictEqual(['eip155:59144']);
      expect(config.fundingOptions).toHaveLength(1);
      expect(config.fundingOptions[0].symbol).toBe('USDC');
    });

    it('sets stagingTokenAddress for non-production environments', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'staging',
            delegationContract: '0xdel1',
            tokens: {
              USDC: { symbol: 'USDC', decimals: 6, address: '0xstaging-usdc' },
            },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(config.fundingOptions).toHaveLength(1);
      expect(config.fundingOptions[0].asset?.stagingTokenAddress).toBe(
        '0xstaging-usdc',
      );
    });

    it('omits stagingTokenAddress for production environments', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'production',
            delegationContract: '0xdel1',
            tokens: {
              USDC: { symbol: 'USDC', decimals: 6, address: '0xprod-usdc' },
            },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(
        config.fundingOptions[0].asset?.stagingTokenAddress,
      ).toBeUndefined();
    });

    it('propagates error when delegation config fails', async () => {
      service.get.mockRejectedValue(
        new CardApiError(500, '/v1/delegation/chain/config', 'Server error'),
      );

      await expect(provider.getFundingConfig(AUTH_TOKENS)).rejects.toThrow();
    });
  });

  describe('mapLoginError edge cases', () => {
    it('returns Unknown for a plain Error (non-CardApiError)', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockRejectedValue(new Error('Network failure'));

      await expect(
        provider.submitCredentials(session, {
          type: 'email_password',
          email: 'test@example.com',
          password: 'pass',
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.Unknown,
      });
    });

    it('returns Unknown on 400 without otpCode', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockRejectedValue(
        new CardApiError(400, '/v1/auth/login', 'Bad request'),
      );

      await expect(
        provider.submitCredentials(session, {
          type: 'email_password',
          email: 'test@example.com',
          password: 'pass',
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.Unknown,
      });
    });

    it('returns Timeout on 408', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockRejectedValue(
        new CardApiError(408, '/v1/auth/login', 'Request Timeout'),
      );

      await expect(
        provider.submitCredentials(session, {
          type: 'email_password',
          email: 'test@example.com',
          password: 'pass',
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.Timeout,
      });
    });

    it('returns Network on statusCode 0 (no HTTP response)', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });
      const session = await provider.initiateAuth('US');

      service.post.mockRejectedValue(new CardApiError(0, '/v1/auth/login', ''));

      await expect(
        provider.submitCredentials(session, {
          type: 'email_password',
          email: 'test@example.com',
          password: 'pass',
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.Network,
      });
    });
  });

  describe('completeAuth metadata validation', () => {
    it('throws when session metadata is missing required fields', async () => {
      const session = {
        id: 'test',
        currentStep: { type: 'email_password' as const },
        _metadata: {},
      };

      service.post.mockResolvedValue({
        userId: 'user-1',
        phase: null,
        isOtpRequired: false,
        phoneNumber: null,
        accessToken: 'login-token',
        verificationState: 'VERIFIED',
        isLinked: true,
      });

      await expect(
        provider.submitCredentials(session, {
          type: 'email_password',
          email: 'test@example.com',
          password: 'pass',
        }),
      ).rejects.toThrow('Invalid auth session');
    });
  });
});
