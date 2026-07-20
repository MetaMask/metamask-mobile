import Logger from '../../../../../util/Logger';
import type { CardFeatureFlag } from '../../../../../selectors/featureFlagController/card';
import { CardApiError } from '../services/BaanxService';
import type { ImmersveService } from '../services/ImmersveService';
import type { ImmersveProviderConfig } from '../services/immersve-config';
import {
  CardProviderError,
  CardProviderErrorCode,
  type CardAuthSession,
  type CardAuthTokens,
} from '../provider-types';
import { ImmersveProvider } from './ImmersveProvider';

jest.mock('../../../../../util/Logger');

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
    fundingType: 'base-sepolia-usdc-universal-evm',
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
  });

  afterEach(() => {
    jest.resetAllMocks();
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

    it.each([
      [401, CardProviderErrorCode.InvalidCredentials],
      [403, CardProviderErrorCode.InvalidCredentials],
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
    it('createFundingSource resolves the funding channel by fundingTypeName then posts', async () => {
      const { provider, service } = createProvider();
      service.get.mockResolvedValue({
        items: [
          {
            id: 'arb-channel',
            fundingTypeName: 'arbitrum-sepolia-usdc-universal-evm',
          },
          {
            id: 'base-channel',
            fundingTypeName: 'base-sepolia-usdc-universal-evm',
          },
        ],
      });
      service.post.mockResolvedValue({
        id: 'fs-1',
        network: 'base-sepolia',
        balance: '10',
        balanceCurrency: 'USD',
      });

      const result = await provider.createFundingSource(TOKENS);

      // Funding channels are listed under the partner account (from the flag)...
      expect(service.get).toHaveBeenCalledWith(
        '/api/accounts/partner-1/funding-channels',
        TOKENS,
      );
      // ...but the funding source is still created for the cardholder.
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

    it('createFundingSource throws when partnerAccountId is unconfigured', async () => {
      const { provider } = createProvider({
        immersve: { fundingType: 'base-sepolia-usdc-universal-evm' },
      });
      await expect(provider.createFundingSource(TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.Unknown,
        message: 'Immersve partnerAccountId is not configured',
      });
    });

    it('createFundingSource throws when no channel matches the configured fundingType', async () => {
      const { provider, service } = createProvider();
      service.get.mockResolvedValue({
        items: [
          {
            id: 'arb-channel',
            fundingTypeName: 'arbitrum-sepolia-usdc-universal-evm',
          },
        ],
      });
      await expect(provider.createFundingSource(TOKENS)).rejects.toBeInstanceOf(
        CardProviderError,
      );
    });

    it('createFundingSource throws when fundingType is unconfigured', async () => {
      const { provider } = createProvider({ immersve: { cardProgramId: 'p' } });
      await expect(provider.createFundingSource(TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.Unknown,
        message: 'Immersve fundingType is not configured',
      });
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

    it('createFundingSource maps API failures', async () => {
      const { provider, service } = createProvider();
      service.get.mockResolvedValue({
        items: [
          {
            id: 'base-channel',
            fundingTypeName: 'base-sepolia-usdc-universal-evm',
          },
        ],
      });
      service.post.mockRejectedValue(
        new CardApiError(409, '/api/funding-sources', 'exists'),
      );

      await expect(provider.createFundingSource(TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.Conflict,
      });
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
          spendableAmount: 999999999,
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
          spendableAmount: 999999999,
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
  });

  describe('unimplemented card-read methods', () => {
    it('getCardHomeData returns empty data', async () => {
      const { provider } = createProvider();
      const data = await provider.getCardHomeData('0xabc', TOKENS);
      expect(data.card).toBeNull();
      expect(data.fundingAssets).toStrictEqual([]);
    });

    it('getCardDetails throws until implemented', async () => {
      const { provider } = createProvider();
      await expect(provider.getCardDetails(TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.Unknown,
        message: 'Immersve getCardDetails not implemented yet',
      });
    });

    it('freezeCard throws until implemented', async () => {
      const { provider } = createProvider();
      await expect(provider.freezeCard('card-1', TOKENS)).rejects.toMatchObject(
        {
          message: 'Immersve freezeCard not implemented yet',
        },
      );
    });

    it('unfreezeCard throws until implemented', async () => {
      const { provider } = createProvider();
      await expect(
        provider.unfreezeCard('card-1', TOKENS),
      ).rejects.toMatchObject({
        message: 'Immersve unfreezeCard not implemented yet',
      });
    });
  });
});
