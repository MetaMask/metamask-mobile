import { ethers } from 'ethers';
import Logger from '../../../../../util/Logger';
import type { CardFeatureFlag } from '../../../../../selectors/featureFlagController/card';
import { CardApiError } from '../services/BaanxService';
import type { ImmersveService } from '../services/ImmersveService';
import type { ImmersveProviderConfig } from '../services/immersve-config';
import {
  CardProviderError,
  CardProviderErrorCode,
  CardStatus,
  CardType,
  FundingAssetStatus,
  type CardAuthSession,
  type CardAuthTokens,
} from '../provider-types';
import { BASE_SEPOLIA_USDC_TOKEN_ADDRESS } from '../../../../../components/UI/Card/constants';
import { readErc20AllowanceAndBalance } from '../../../../../components/UI/Card/util/onChainAllowance';
import { ImmersveProvider } from './ImmersveProvider';

jest.mock('../../../../../util/Logger');
jest.mock('../../../../../components/UI/Card/util/onChainAllowance', () => ({
  readErc20AllowanceAndBalance: jest.fn(),
}));

const mockReadErc20AllowanceAndBalance =
  readErc20AllowanceAndBalance as jest.MockedFunction<
    typeof readErc20AllowanceAndBalance
  >;

const CONFIG: ImmersveProviderConfig = {
  apiKey: 'test-key',
  baseUrl: 'https://api.test.immersve.com',
  clientApplicationId: 'client-app-1',
  appUrl: 'https://app.immersve.com',
};

const FEATURE_FLAG: CardFeatureFlag = {
  immersve: {
    network: 'base-sepolia',
    cardProgramId: 'program-1',
    partnerAccountId: 'partner-1',
    fundingChannelId: 'base-channel',
  },
  immersveCountries: ['GB'],
};

const FEATURE_FLAG_WITH_SPENDER: CardFeatureFlag = {
  immersve: {
    ...FEATURE_FLAG.immersve,
    spenderAddress: '0x2222222222222222222222222222222222222222',
  },
  immersveCountries: ['GB'],
};

function makeJwt(expMs: number): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(expMs / 1000) }),
  ).toString('base64');
  return `h.${payload}.s`;
}

function createProvider(featureFlag: CardFeatureFlag | null = FEATURE_FLAG) {
  const service = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
  } as unknown as ImmersveService & {
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
  };
  const provider = new ImmersveProvider({
    service,
    config: CONFIG,
    getCardFeatureFlag: () => featureFlag,
  });
  return { provider, service };
}

const FIXED_NOW = new Date('2024-06-01T12:00:00.000Z').getTime();

const TOKENS: CardAuthTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  accessTokenExpiresAt: FIXED_NOW + 60 * 60 * 1000,
  refreshTokenExpiresAt: FIXED_NOW + 30 * 24 * 60 * 60 * 1000,
  location: 'international',
  cardholderAccountId: 'cardholder-1',
  accountAddress: '0xabc',
};

describe('ImmersveProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
    jest.spyOn(ethers.providers, 'StaticJsonRpcProvider').mockImplementation(
      () =>
        ({
          getBlockNumber: jest.fn().mockResolvedValue(1),
        }) as unknown as ethers.providers.StaticJsonRpcProvider,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('capabilities', () => {
    it('uses SIWE and disables cashback/credit', () => {
      const { provider } = createProvider();
      expect(provider.id).toBe('immersve');
      expect(provider.capabilities.authMethod).toBe('siwe');
      expect(provider.capabilities.supportsCashback).toBe(false);
      expect(provider.capabilities.supportsCredit).toBe(false);
      expect(provider.capabilities.onboarding.type).toBe('webview');
    });
  });

  describe('initiateAuth', () => {
    it('throws when no address is provided', async () => {
      const { provider } = createProvider();
      await expect(provider.initiateAuth('GB')).rejects.toBeInstanceOf(
        CardProviderError,
      );
    });

    it('posts login-init with autoSignup and returns the SIWE step', async () => {
      const { provider, service } = createProvider();
      service.post.mockResolvedValue({
        id: 'login-req-1',
        signingChallenge: { message: 'Immersve wants you to sign in...' },
      });

      const session = await provider.initiateAuth('GB', { address: '0xabc' });

      expect(service.post).toHaveBeenCalledWith(
        '/auth/login-init',
        expect.objectContaining({
          loginMethod: 'siwe',
          network: 'base-sepolia',
          clientApplicationId: 'client-app-1',
          scopes: ['cardholder-partner'],
          address: '0xabc',
          url: 'https://app.immersve.com',
          autoSignup: true,
        }),
      );
      expect(session.id).toBe('login-req-1');
      expect(session.currentStep).toStrictEqual({
        type: 'siwe',
        message: 'Immersve wants you to sign in...',
      });
      expect(session._metadata).toMatchObject({
        address: '0xabc',
        country: 'GB',
        loginRequestId: 'login-req-1',
      });
    });

    it('falls back to base-sepolia when immersve feature flag is null', async () => {
      const { provider, service } = createProvider(null);
      service.post.mockResolvedValue({
        id: 'login-req-1',
        signingChallenge: { message: 'msg' },
      });

      await provider.initiateAuth('GB', { address: '0xabc' });

      expect(service.post).toHaveBeenCalledWith(
        '/auth/login-init',
        expect.objectContaining({ network: 'base-sepolia' }),
      );
    });

    it('prefers the feature-flag clientApplicationId over the env config', async () => {
      const { provider, service } = createProvider({
        immersve: { ...FEATURE_FLAG.immersve, clientApplicationId: 'flag-app' },
        immersveCountries: ['GB'],
      });
      service.post.mockResolvedValue({
        id: 'login-req-1',
        signingChallenge: { message: 'sign in' },
      });

      await provider.initiateAuth('GB', { address: '0xabc' });

      expect(service.post).toHaveBeenCalledWith(
        '/auth/login-init',
        expect.objectContaining({ clientApplicationId: 'flag-app' }),
      );
    });

    it('prefers the feature-flag appUrl over the env config', async () => {
      const { provider, service } = createProvider({
        immersve: { ...FEATURE_FLAG.immersve, appUrl: 'https://flag.app' },
        immersveCountries: ['GB'],
      });
      service.post.mockResolvedValue({
        id: 'login-req-1',
        signingChallenge: { message: 'sign in' },
      });

      await provider.initiateAuth('GB', { address: '0xabc' });

      expect(service.post).toHaveBeenCalledWith(
        '/auth/login-init',
        expect.objectContaining({ url: 'https://flag.app' }),
      );
    });

    it.each([
      [401, CardProviderErrorCode.InvalidCredentials],
      [403, CardProviderErrorCode.Forbidden],
      [404, CardProviderErrorCode.NotFound],
      [409, CardProviderErrorCode.Conflict],
      [408, CardProviderErrorCode.Timeout],
      [500, CardProviderErrorCode.ServerError],
      [0, CardProviderErrorCode.Network],
    ] as const)(
      'maps API status %s to %s',
      async (statusCode, expectedCode) => {
        const { provider, service } = createProvider();
        service.post.mockRejectedValue(
          new CardApiError(statusCode, '/auth/login-init', 'fail'),
        );

        await expect(
          provider.initiateAuth('GB', { address: '0xabc' }),
        ).rejects.toMatchObject({ code: expectedCode, statusCode });
      },
    );

    it('maps non-API errors to Unknown', async () => {
      const { provider, service } = createProvider();
      service.post.mockRejectedValue(new Error('boom'));

      await expect(
        provider.initiateAuth('GB', { address: '0xabc' }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.Unknown,
        message: 'boom',
      });
    });
  });

  describe('submitCredentials', () => {
    const session: CardAuthSession = {
      id: 'login-req-1',
      currentStep: { type: 'siwe', message: 'msg' },
      _metadata: { address: '0xabc' },
    };

    it('rejects non-SIWE credentials', async () => {
      const { provider } = createProvider();
      await expect(
        provider.submitCredentials(session, {
          type: 'email_password',
          email: 'a@b.co',
          password: 'x',
        }),
      ).rejects.toBeInstanceOf(CardProviderError);
    });

    it('completes login and binds cardholderAccountId + address', async () => {
      const { provider, service } = createProvider();
      const accessJwt = makeJwt(FIXED_NOW + 60 * 60 * 1000);
      const refreshJwt = makeJwt(FIXED_NOW + 30 * 24 * 60 * 60 * 1000);
      service.post.mockResolvedValue({
        accessToken: accessJwt,
        refreshToken: refreshJwt,
        cardholderAccountId: 'cardholder-1',
      });

      const result = await provider.submitCredentials(session, {
        type: 'siwe',
        signature: '0xsig',
      });

      expect(service.post).toHaveBeenCalledWith('/auth/login-complete', {
        loginRequestId: 'login-req-1',
        signature: '0xsig',
      });
      expect(result.done).toBe(true);
      expect(result.tokenSet?.accessToken).toBe(accessJwt);
      expect(result.tokenSet?.cardholderAccountId).toBe('cardholder-1');
      expect(result.tokenSet?.accountAddress).toBe('0xabc');
      expect(result.tokenSet?.location).toBe('international');
      expect(result.tokenSet?.accessTokenExpiresAt).toBeGreaterThan(FIXED_NOW);
      expect(result.tokenSet?.refreshTokenExpiresAt).toBeGreaterThan(FIXED_NOW);
    });

    it('omits refreshTokenExpiresAt when login response has no refresh token', async () => {
      const { provider, service } = createProvider();
      service.post.mockResolvedValue({
        accessToken: makeJwt(FIXED_NOW + 60 * 60 * 1000),
        cardholderAccountId: 'cardholder-1',
      });

      const result = await provider.submitCredentials(session, {
        type: 'siwe',
        signature: '0xsig',
      });

      expect(result.tokenSet?.refreshToken).toBeUndefined();
      expect(result.tokenSet?.refreshTokenExpiresAt).toBeUndefined();
    });

    it('uses 0 accessTokenExpiresAt when access JWT cannot be decoded', async () => {
      const { provider, service } = createProvider();
      service.post.mockResolvedValue({
        accessToken: 'not-a-jwt',
        refreshToken: 'also-not-a-jwt',
        cardholderAccountId: 'cardholder-1',
      });

      const result = await provider.submitCredentials(session, {
        type: 'siwe',
        signature: '0xsig',
      });

      expect(result.tokenSet?.accessTokenExpiresAt).toBe(0);
      expect(result.tokenSet?.refreshTokenExpiresAt).toBeUndefined();
    });

    it('maps login-complete API failures through mapApiError', async () => {
      const { provider, service } = createProvider();
      service.post.mockRejectedValue(
        new CardApiError(500, '/auth/login-complete', 'down'),
      );

      await expect(
        provider.submitCredentials(session, {
          type: 'siwe',
          signature: '0xsig',
        }),
      ).rejects.toMatchObject({ code: CardProviderErrorCode.ServerError });
    });
  });

  describe('refreshTokens', () => {
    it('throws without a refresh token', async () => {
      const { provider } = createProvider();
      await expect(
        provider.refreshTokens({ ...TOKENS, refreshToken: undefined }),
      ).rejects.toBeInstanceOf(CardProviderError);
    });

    it('exchanges the refresh token and preserves binding fields', async () => {
      const { provider, service } = createProvider();
      const accessJwt = makeJwt(FIXED_NOW + 60 * 60 * 1000);
      service.post.mockResolvedValue({
        accessToken: accessJwt,
        refreshToken: 'new-rt',
      });

      const refreshed = await provider.refreshTokens(TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/auth/token',
        { refreshToken: 'refresh-token', clientApplicationId: 'client-app-1' },
        undefined,
        { origin: 'https://app.immersve.com' },
      );
      expect(refreshed.accessToken).toBe(accessJwt);
      expect(refreshed.cardholderAccountId).toBe('cardholder-1');
      expect(refreshed.accountAddress).toBe('0xabc');
      expect(refreshed.keyringId).toBe(TOKENS.keyringId);
      expect(refreshed.location).toBe('international');
    });

    it('keeps the previous refresh token when the response omits one', async () => {
      const { provider, service } = createProvider();
      const accessJwt = makeJwt(FIXED_NOW + 60 * 60 * 1000);
      service.post.mockResolvedValue({ accessToken: accessJwt });

      const refreshed = await provider.refreshTokens(TOKENS);

      expect(refreshed.refreshToken).toBe('refresh-token');
    });

    it.each([400, 401, 403])(
      'maps refresh rejection status %s to InvalidCredentials',
      async (statusCode) => {
        const { provider, service } = createProvider();
        service.post.mockRejectedValue(
          new CardApiError(statusCode, '/auth/token', 'nope'),
        );

        await expect(provider.refreshTokens(TOKENS)).rejects.toMatchObject({
          code: CardProviderErrorCode.InvalidCredentials,
          statusCode,
        });
      },
    );

    it('maps non-auth refresh failures through mapApiError', async () => {
      const { provider, service } = createProvider();
      service.post.mockRejectedValue(
        new CardApiError(500, '/auth/token', 'down'),
      );

      await expect(provider.refreshTokens(TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.ServerError,
      });
    });
  });

  describe('validateTokens', () => {
    it('returns valid when the access token JWT is well within expiry', () => {
      const { provider } = createProvider();
      expect(
        provider.validateTokens({
          ...TOKENS,
          accessToken: makeJwt(FIXED_NOW + 60 * 60 * 1000),
        }),
      ).toBe('valid');
    });

    it('returns needs_refresh when access is inside the 5-minute buffer', () => {
      const { provider } = createProvider();
      expect(
        provider.validateTokens({
          ...TOKENS,
          accessToken: makeJwt(FIXED_NOW + 2 * 60 * 1000),
          refreshToken: makeJwt(FIXED_NOW + 30 * 24 * 60 * 60 * 1000),
        }),
      ).toBe('needs_refresh');
    });

    it('returns needs_refresh when access expired but refresh usable', () => {
      const { provider } = createProvider();
      expect(
        provider.validateTokens({
          ...TOKENS,
          accessToken: makeJwt(FIXED_NOW - 1000),
          refreshToken: makeJwt(FIXED_NOW + 30 * 24 * 60 * 60 * 1000),
        }),
      ).toBe('needs_refresh');
    });

    it('returns needs_refresh when refresh JWT cannot be decoded', () => {
      const { provider } = createProvider();
      expect(
        provider.validateTokens({
          ...TOKENS,
          accessToken: makeJwt(FIXED_NOW - 1000),
          refreshToken: 'not-a-jwt',
        }),
      ).toBe('needs_refresh');
    });

    it('returns expired when there is no refresh token', () => {
      const { provider } = createProvider();
      expect(
        provider.validateTokens({
          ...TOKENS,
          accessToken: makeJwt(FIXED_NOW - 1000),
          refreshToken: undefined,
        }),
      ).toBe('expired');
    });

    it('returns expired when refresh is inside the 1-hour buffer', () => {
      const { provider } = createProvider();
      expect(
        provider.validateTokens({
          ...TOKENS,
          accessToken: makeJwt(FIXED_NOW - 1000),
          refreshToken: makeJwt(FIXED_NOW + 30 * 60 * 1000),
        }),
      ).toBe('expired');
    });
  });

  describe('logout', () => {
    it('posts /auth/logout with the token set', async () => {
      const { provider, service } = createProvider();
      service.post.mockResolvedValue({});

      await provider.logout(TOKENS);

      expect(service.post).toHaveBeenCalledWith('/auth/logout', {}, TOKENS);
    });

    it('swallows logout failures and logs them', async () => {
      const { provider, service } = createProvider();
      const error = new Error('logout failed');
      service.post.mockRejectedValue(error);

      await expect(provider.logout(TOKENS)).resolves.toBeUndefined();
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: { feature: 'card', provider: 'immersve' },
          context: expect.objectContaining({
            name: 'ImmersveProvider',
            data: expect.objectContaining({ method: 'logout' }),
          }),
        }),
      );
    });
  });

  describe('onboarding state machine', () => {
    it('createFundingSource posts with the flag fundingChannelId', async () => {
      const { provider, service } = createProvider();
      service.post.mockResolvedValue({
        id: 'fs-1',
        network: 'base-sepolia',
        balance: '10',
        balanceCurrency: 'USD',
      });

      const result = await provider.createFundingSource(TOKENS);

      // No funding-channels lookup — the concrete id comes straight from the flag.
      expect(service.get).not.toHaveBeenCalled();
      expect(service.post).toHaveBeenCalledWith(
        '/api/funding-sources',
        {
          accountId: 'cardholder-1',
          fundingChannelId: 'base-channel',
          fundingAddress: '0xabc',
        },
        TOKENS,
      );
      expect(result).toStrictEqual({
        id: 'fs-1',
        network: 'base-sepolia',
        balance: '10',
        balanceCurrency: 'USD',
      });
    });

    it('createFundingSource throws when fundingChannelId is unconfigured', async () => {
      const { provider } = createProvider({ immersve: { cardProgramId: 'p' } });
      await expect(provider.createFundingSource(TOKENS)).rejects.toBeInstanceOf(
        CardProviderError,
      );
    });

    it('createFundingSource throws when cardholder binding fields are missing', async () => {
      const { provider } = createProvider();

      await expect(
        provider.createFundingSource({
          ...TOKENS,
          cardholderAccountId: undefined,
          accountAddress: undefined,
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.Unknown,
        message:
          'createFundingSource: missing cardholder account id or address',
      });
    });

    it('createFundingSource maps a 403 to Forbidden (not a revoked token) and surfaces the errorCode', async () => {
      const { provider, service } = createProvider();
      service.post.mockRejectedValue(
        new CardApiError(
          403,
          '/api/funding-sources',
          JSON.stringify({
            statusCode: 403,
            errorCode: 'FUNDING_SOURCE_EXISTS',
          }),
        ),
      );

      await expect(provider.createFundingSource(TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.Forbidden,
        statusCode: 403,
        errorCode: 'FUNDING_SOURCE_EXISTS',
      });
    });

    it('createFundingSource maps API failures', async () => {
      const { provider, service } = createProvider();
      service.post.mockRejectedValue(
        new CardApiError(409, '/api/funding-sources', 'exists'),
      );

      await expect(provider.createFundingSource(TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.Conflict,
      });
    });

    it('getFundingSources GETs the account funding-sources and maps items', async () => {
      const { provider, service } = createProvider();
      service.get.mockResolvedValue({
        items: [
          {
            id: 'fs-1',
            network: 'base-sepolia',
            balance: '1000000',
            balanceCurrency: 'USDC',
            fundingChannelId: 'base-channel',
          },
        ],
      });

      const result = await provider.getFundingSources(TOKENS);

      expect(service.get).toHaveBeenCalledWith(
        '/api/accounts/cardholder-1/funding-sources',
        TOKENS,
      );
      expect(result).toStrictEqual([
        {
          id: 'fs-1',
          network: 'base-sepolia',
          balance: '1000000',
          balanceCurrency: 'USDC',
          fundingChannelId: 'base-channel',
        },
      ]);
    });

    it('getFundingSources returns an empty array when there are no items', async () => {
      const { provider, service } = createProvider();
      service.get.mockResolvedValue({});

      await expect(provider.getFundingSources(TOKENS)).resolves.toStrictEqual(
        [],
      );
    });

    it('patchContactDetails PATCHes the account contact-details path', async () => {
      const { provider, service } = createProvider();
      service.patch.mockResolvedValue({});

      await provider.patchContactDetails(
        { email: 'a@b.co', phone: '+441234567890' },
        TOKENS,
      );

      expect(service.patch).toHaveBeenCalledWith(
        '/api/accounts/cardholder-1/contact-details',
        {
          email: { emailAddress: 'a@b.co' },
          phone: { phoneNumber: '+441234567890' },
        },
        TOKENS,
      );
    });

    it('patchContactDetails sends only provided contact fields', async () => {
      const { provider, service } = createProvider();
      service.patch.mockResolvedValue({});

      await provider.patchContactDetails({ email: 'a@b.co' }, TOKENS);

      expect(service.patch).toHaveBeenCalledWith(
        '/api/accounts/cardholder-1/contact-details',
        { email: { emailAddress: 'a@b.co' } },
        TOKENS,
      );
    });

    it('patchContactDetails throws when cardholderAccountId is missing', async () => {
      const { provider } = createProvider();

      await expect(
        provider.patchContactDetails(
          { email: 'a@b.co' },
          { ...TOKENS, cardholderAccountId: undefined },
        ),
      ).rejects.toMatchObject({
        message: 'patchContactDetails: missing cardholder account id',
      });
    });

    it('patchContactDetails maps API failures', async () => {
      const { provider, service } = createProvider();
      service.patch.mockRejectedValue(
        new CardApiError(404, '/api/accounts/x/contact-details', 'missing'),
      );

      await expect(
        provider.patchContactDetails({ email: 'a@b.co' }, TOKENS),
      ).rejects.toMatchObject({ code: CardProviderErrorCode.NotFound });
    });

    it('getSpendingPrerequisites posts cardProgramId + hardcoded constants', async () => {
      const { provider, service } = createProvider();
      service.post.mockResolvedValue({ prerequisites: [] });

      await provider.getSpendingPrerequisites(
        'fs-1',
        { kycRegion: 'GB', kycRedirectUrl: 'https://app/redirect' },
        TOKENS,
      );

      expect(service.post).toHaveBeenCalledWith(
        '/api/spending-prerequisites',
        expect.objectContaining({
          cardProgramId: 'program-1',
          fundingSourceId: 'fs-1',
          spendableAmount: 2199023255551,
          spendableCurrency: 'USD',
          kycType: 'immersve-conducted',
          kycRegion: 'GB',
          kycRedirectUrl: 'https://app/redirect',
          kycHiddenSteps: ['region', 'contact-channels'],
        }),
        TOKENS,
      );
    });

    it('getSpendingPrerequisites uses hardcoded constants when program fields are absent', async () => {
      const { provider, service } = createProvider({
        immersve: { cardProgramId: 'program-1' },
      });
      service.post.mockResolvedValue({ prerequisites: [] });

      await provider.getSpendingPrerequisites('fs-1', {}, TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/api/spending-prerequisites',
        expect.objectContaining({
          spendableAmount: 2199023255551,
          spendableCurrency: 'USD',
          kycType: 'immersve-conducted',
        }),
        TOKENS,
      );
    });

    it('getSpendingPrerequisites throws when cardProgramId is unconfigured', async () => {
      const { provider } = createProvider({ immersve: {} });

      await expect(
        provider.getSpendingPrerequisites('fs-1', {}, TOKENS),
      ).rejects.toMatchObject({
        message: 'Immersve cardProgramId is not configured',
      });
    });

    it('getSpendingPrerequisites maps API failures', async () => {
      const { provider, service } = createProvider();
      service.post.mockRejectedValue(
        new CardApiError(500, '/api/spending-prerequisites', 'down'),
      );

      await expect(
        provider.getSpendingPrerequisites('fs-1', {}, TOKENS),
      ).rejects.toMatchObject({ code: CardProviderErrorCode.ServerError });
    });

    it('createCard posts cardProgramId + fundingSourceId', async () => {
      const { provider, service } = createProvider();
      service.post.mockResolvedValue({ cardId: 'card-1' });

      const result = await provider.createCard('fs-1', TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/api/cards',
        { cardProgramId: 'program-1', fundingSourceId: 'fs-1' },
        TOKENS,
      );
      expect(result.cardId).toBe('card-1');
    });

    it('createCard maps API failures', async () => {
      const { provider, service } = createProvider();
      service.post.mockRejectedValue(
        new CardApiError(500, '/api/cards', 'down'),
      );

      await expect(provider.createCard('fs-1', TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.ServerError,
      });
    });

    it('getResumeCardInfo returns null when the account has no card', async () => {
      const { provider, service } = createProvider();
      service.get.mockResolvedValue({ items: [] });

      await expect(provider.getResumeCardInfo(TOKENS)).resolves.toBeNull();
    });

    it('getResumeCardInfo returns the card program and funding sources', async () => {
      const { provider, service } = createProvider();
      service.get.mockImplementation((path: string) => {
        if (path.includes('/cards?')) {
          return Promise.resolve({
            items: [
              {
                id: 'card-1',
                accountId: 'cardholder-1',
                type: 'virtual',
                createdAt: '2024-01-02T00:00:00.000Z',
                modifiedAt: '2024-01-02T00:00:00.000Z',
                expiresAt: '2029-01-01T00:00:00.000Z',
                isBlocked: false,
                status: 'active',
                fundingSourceIds: ['fs-arbitrum'],
              },
            ],
          });
        }
        if (path === '/api/cards/card-1') {
          return Promise.resolve({
            id: 'card-1',
            cardProgramId: 'program-arbitrum',
            fundingSourceIds: ['fs-arbitrum'],
            status: 'active',
            isBlocked: false,
          });
        }
        return Promise.resolve({});
      });

      await expect(provider.getResumeCardInfo(TOKENS)).resolves.toStrictEqual({
        cardProgramId: 'program-arbitrum',
        fundingSourceIds: ['fs-arbitrum'],
      });
    });

    it('getResumeCardInfo maps API failures', async () => {
      const { provider, service } = createProvider();
      service.get.mockRejectedValue(
        new CardApiError(500, '/api/accounts/cardholder-1/cards', 'down'),
      );

      await expect(provider.getResumeCardInfo(TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.ServerError,
      });
    });
  });

  describe('capabilities (card-read)', () => {
    it('reveals sensitive details inline and hides funding limits', () => {
      const { provider } = createProvider();
      expect(provider.capabilities.supportsSensitiveDetailsView).toBe(true);
      expect(provider.capabilities.supportsFundingLimits).toBe(false);
      expect(provider.capabilities.supportsPinView).toBe(false);
      expect(provider.capabilities.supportsTravel).toBe(false);
    });
  });

  const activeCard = {
    id: 'card-1',
    accountId: 'cardholder-1',
    type: 'virtual',
    createdAt: '2024-01-02T00:00:00.000Z',
    modifiedAt: '2024-01-02T00:00:00.000Z',
    expiresAt: '2029-01-01T00:00:00.000Z',
    isBlocked: false,
    status: 'active',
    fundingSourceIds: ['fs-1'],
    panLast4: '1234',
  };

  const activeCardDetail = {
    ...activeCard,
    cardholderName: 'John Doe',
    unfreezeAllowed: false,
  };

  const fundingSourceDetail = {
    id: 'fs-1',
    accountId: 'cardholder-1',
    balance: '1000000',
    balanceCurrency: 'USDC',
    network: 'base-sepolia',
    externalId: '0xwallet',
    purpose: 'card-funding',
  };

  const routeGet =
    (responses: {
      cards?: unknown;
      cardDetail?: unknown;
      fundingSource?: unknown;
      fundingSources?: unknown;
    }) =>
    (path: string) => {
      if (path.includes('/cards?')) return Promise.resolve(responses.cards);
      if (path.includes('/funding-source/'))
        return Promise.resolve(responses.fundingSource);
      if (path.includes('/funding-sources'))
        return Promise.resolve(responses.fundingSources);
      if (path.startsWith('/api/cards/'))
        return Promise.resolve(responses.cardDetail);
      return Promise.resolve({});
    };

  describe('getCardHomeData', () => {
    it('returns a provisioning alert without creating a card when the account has none', async () => {
      const { provider, service } = createProvider();
      service.get.mockImplementation(
        routeGet({
          cards: { items: [] },
          fundingSources: { items: [fundingSourceDetail] },
        }),
      );

      const data = await provider.getCardHomeData('0xabc', TOKENS);

      // Card creation is not a read-path side effect (gated ImmersveFundingApproval owns it).
      expect(service.post).not.toHaveBeenCalled();
      // No funding-sources lookup either — the read path stays pure.
      expect(service.get).not.toHaveBeenCalledWith(
        '/api/accounts/cardholder-1/funding-sources',
        TOKENS,
      );
      expect(data.card).toBeNull();
      expect(data.alerts).toStrictEqual([
        { type: 'card_provisioning', dismissable: false },
      ]);
    });

    it('returns a provisioning alert for a card that is still being created', async () => {
      const { provider, service } = createProvider();
      service.get.mockImplementation(
        routeGet({
          cards: { items: [{ ...activeCard, status: 'created' }] },
        }),
      );

      const data = await provider.getCardHomeData('0xabc', TOKENS);

      expect(service.post).not.toHaveBeenCalled();
      expect(data.card).toBeNull();
      expect(data.alerts).toStrictEqual([
        { type: 'card_provisioning', dismissable: false },
      ]);
    });

    it('maps an active card with its funding asset and an add_funds action', async () => {
      const { provider, service } = createProvider();
      service.get.mockImplementation(
        routeGet({
          cards: { items: [activeCard] },
          cardDetail: activeCardDetail,
          fundingSource: fundingSourceDetail,
        }),
      );

      const data = await provider.getCardHomeData('0xabc', TOKENS);

      expect(data.card).toStrictEqual({
        id: 'card-1',
        status: CardStatus.ACTIVE,
        type: CardType.VIRTUAL,
        lastFour: '1234',
        holderName: 'John Doe',
        isFreezable: true,
      });
      expect(data.primaryFundingAsset).toStrictEqual({
        symbol: 'USDC',
        name: 'USDC',
        address: BASE_SEPOLIA_USDC_TOKEN_ADDRESS,
        walletAddress: '0xabc',
        decimals: 6,
        chainId: 'eip155:84532',
        spendableBalance: '',
        spendingCap: '',
        priority: 0,
        status: FundingAssetStatus.Active,
        assumeUsdParity: true,
      });
      expect(data.actions).toStrictEqual([
        { type: 'add_funds', enabled: true },
      ]);
    });

    it('swallows non-auth errors and returns empty data', async () => {
      const { provider, service } = createProvider();
      service.get.mockRejectedValue(
        new CardApiError(500, '/api/accounts/cardholder-1/cards', 'boom'),
      );

      const data = await provider.getCardHomeData('0xabc', TOKENS);

      expect(data.card).toBeNull();
      expect(data.fundingAssets).toStrictEqual([]);
    });

    it('populates spendableBalance as min(wallet, allowance) when spender is configured', async () => {
      const fundingAddress = '0x1111111111111111111111111111111111111111';
      const tokensWithAddress: CardAuthTokens = {
        ...TOKENS,
        accountAddress: fundingAddress,
      };
      const { provider, service } = createProvider(FEATURE_FLAG_WITH_SPENDER);
      service.get.mockImplementation(
        routeGet({
          cards: { items: [activeCard] },
          cardDetail: activeCardDetail,
          fundingSource: fundingSourceDetail,
        }),
      );
      mockReadErc20AllowanceAndBalance.mockResolvedValue({
        balance: '30.0',
        allowance: '15.0',
        spendableBalance: '15',
      });

      const data = await provider.getCardHomeData(
        fundingAddress,
        tokensWithAddress,
      );

      expect(mockReadErc20AllowanceAndBalance).toHaveBeenCalledWith(
        expect.anything(),
        BASE_SEPOLIA_USDC_TOKEN_ADDRESS,
        fundingAddress,
        '0x2222222222222222222222222222222222222222',
        6,
      );
      expect(data.primaryFundingAsset).toMatchObject({
        spendableBalance: '15',
        spendingCap: '15.0',
        status: FundingAssetStatus.Active,
        walletAddress: fundingAddress,
      });
    });

    it('uses wallet balance when it is lower than the allowance', async () => {
      const fundingAddress = '0x1111111111111111111111111111111111111111';
      const tokensWithAddress: CardAuthTokens = {
        ...TOKENS,
        accountAddress: fundingAddress,
      };
      const { provider, service } = createProvider(FEATURE_FLAG_WITH_SPENDER);
      service.get.mockImplementation(
        routeGet({
          cards: { items: [activeCard] },
          cardDetail: activeCardDetail,
          fundingSource: fundingSourceDetail,
        }),
      );
      mockReadErc20AllowanceAndBalance.mockResolvedValue({
        balance: '10.0',
        allowance: '100.0',
        spendableBalance: '10',
      });

      const data = await provider.getCardHomeData(
        fundingAddress,
        tokensWithAddress,
      );

      expect(data.primaryFundingAsset).toMatchObject({
        spendableBalance: '10',
        spendingCap: '100.0',
      });
    });

    it('falls back to empty spendableBalance when the on-chain read fails', async () => {
      const fundingAddress = '0x1111111111111111111111111111111111111111';
      const tokensWithAddress: CardAuthTokens = {
        ...TOKENS,
        accountAddress: fundingAddress,
      };
      const { provider, service } = createProvider(FEATURE_FLAG_WITH_SPENDER);
      service.get.mockImplementation(
        routeGet({
          cards: { items: [activeCard] },
          cardDetail: activeCardDetail,
          fundingSource: fundingSourceDetail,
        }),
      );
      mockReadErc20AllowanceAndBalance.mockRejectedValue(
        new Error('rpc unavailable'),
      );

      const data = await provider.getCardHomeData(
        fundingAddress,
        tokensWithAddress,
      );

      expect(data.primaryFundingAsset).toMatchObject({
        spendableBalance: '',
        spendingCap: '',
        status: FundingAssetStatus.Active,
      });
    });

    it('skips the on-chain read when spenderAddress is unset', async () => {
      const { provider, service } = createProvider();
      service.get.mockImplementation(
        routeGet({
          cards: { items: [activeCard] },
          cardDetail: activeCardDetail,
          fundingSource: fundingSourceDetail,
        }),
      );

      const data = await provider.getCardHomeData('0xabc', TOKENS);

      expect(mockReadErc20AllowanceAndBalance).not.toHaveBeenCalled();
      expect(data.primaryFundingAsset).toMatchObject({
        spendableBalance: '',
        spendingCap: '',
      });
    });
  });

  describe('getCardDetails', () => {
    it('throws NoCard when the account has no card', async () => {
      const { provider, service } = createProvider();
      service.get.mockResolvedValue({ items: [] });

      await expect(provider.getCardDetails(TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.NoCard,
      });
    });

    it('maps isBlocked + unfreezeAllowed to FROZEN', async () => {
      const { provider, service } = createProvider();
      service.get.mockImplementation(
        routeGet({
          cards: { items: [activeCard] },
          cardDetail: {
            ...activeCardDetail,
            isBlocked: true,
            unfreezeAllowed: true,
          },
        }),
      );

      const card = await provider.getCardDetails(TOKENS);
      expect(card.status).toBe(CardStatus.FROZEN);
      expect(card.isFreezable).toBe(true);
    });

    it('maps isBlocked without unfreezeAllowed to BLOCKED', async () => {
      const { provider, service } = createProvider();
      service.get.mockImplementation(
        routeGet({
          cards: { items: [activeCard] },
          cardDetail: {
            ...activeCardDetail,
            isBlocked: true,
            unfreezeAllowed: false,
          },
        }),
      );

      const card = await provider.getCardDetails(TOKENS);
      expect(card.status).toBe(CardStatus.BLOCKED);
      expect(card.isFreezable).toBe(false);
    });
  });

  describe('resolveCurrentCard selection', () => {
    it('prefers an active card over a created one and skips cancelled cards', async () => {
      const { provider, service } = createProvider();
      service.get.mockImplementation(
        routeGet({
          cards: {
            items: [
              { ...activeCard, id: 'cancelled', status: 'cancelled' },
              { ...activeCard, id: 'created', status: 'created' },
              { ...activeCard, id: 'active', status: 'active' },
            ],
          },
          cardDetail: { ...activeCardDetail, id: 'active' },
          fundingSource: fundingSourceDetail,
        }),
      );

      await provider.getCardHomeData('0xabc', TOKENS);

      expect(service.get).toHaveBeenCalledWith('/api/cards/active', TOKENS);
    });
  });

  describe('freezeCard / unfreezeCard', () => {
    it('freezeCard posts to the freeze endpoint', async () => {
      const { provider, service } = createProvider();
      service.post.mockResolvedValue({});

      await provider.freezeCard('card-1', TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/api/cards/card-1/freeze',
        {},
        TOKENS,
      );
    });

    it('unfreezeCard posts to the unfreeze endpoint', async () => {
      const { provider, service } = createProvider();
      service.post.mockResolvedValue({});

      await provider.unfreezeCard('card-1', TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/api/cards/card-1/unfreeze',
        {},
        TOKENS,
      );
    });
  });

  describe('getCardSensitiveDetails', () => {
    it('exchanges a pan-token and fetches the callback URL without a bearer token', async () => {
      const { provider, service } = createProvider();
      const callbackUrl =
        'https://api-sec.immersve.com/api/cards/secure?tokenId=abc';
      service.get.mockImplementation((path: string) => {
        if (path.includes('/cards?')) {
          return Promise.resolve({ items: [activeCard] });
        }
        return Promise.resolve({
          pan: '1234123412345678',
          cvv2: '123',
          expiry: '202501',
          embossedName: 'DOE/JOHN',
        });
      });
      service.post.mockResolvedValue({
        tokenId: 'token-1',
        callbackUrl,
      });

      const details = await provider.getCardSensitiveDetails(TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/api/cards/card-1/pan-token',
        {},
        TOKENS,
      );
      expect(service.get).toHaveBeenLastCalledWith(callbackUrl);
      expect(details).toStrictEqual({
        pan: '1234123412345678',
        cvv2: '123',
        expiry: '202501',
        embossedName: 'DOE/JOHN',
      });
    });

    it('throws NoCard when there is no card', async () => {
      const { provider, service } = createProvider();
      service.get.mockResolvedValue({ items: [] });

      await expect(
        provider.getCardSensitiveDetails(TOKENS),
      ).rejects.toMatchObject({ code: CardProviderErrorCode.NoCard });
    });
  });
});
