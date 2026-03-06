import { BaanxProvider } from './BaanxProvider';
import type { BaanxService } from '../services/BaanxService';
import {
  CardStatus,
  CardType,
  FundingAssetStatus,
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

    it('returns expired when refresh token is near expiry', () => {
      const refreshNearExpiry = {
        ...AUTH_TOKENS,
        refreshTokenExpiresAt: Date.now() + 30 * 60_000,
      };

      expect(provider.validateTokens(refreshNearExpiry)).toBe('expired');
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
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddress', AUTH_TOKENS);

      expect(result.primaryAsset).not.toBeNull();
      expect(result.primaryAsset?.symbol).toBe('USDC');
      expect(result.primaryAsset?.status).toBe(FundingAssetStatus.Active);
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

    it('calls unfreeze endpoint', async () => {
      service.post.mockResolvedValue({});

      await provider.unfreezeCard('card-1', AUTH_TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/v1/card/unfreeze',
        {},
        AUTH_TOKENS,
      );
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

    it('maps non-US country to international location', async () => {
      service.get.mockResolvedValue({ token: 'init-token', url: '' });

      await provider.initiateAuth('GB');

      expect(service.setLocation).toHaveBeenCalledWith('international');
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
  });

  describe('getFundingConfig', () => {
    it('returns config with max limit and supported chains', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            tokens: { USDC: {}, mUSD: {} },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(config.maxLimit).toBe('2199023255551');
      expect(config.supportedChains).toContain('eip155:59144');
      expect(config.fundingOptions.length).toBeGreaterThan(0);
    });
  });
});
