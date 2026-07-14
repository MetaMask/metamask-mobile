import { CardApiError } from '../services/BaanxService';
import type { ImmersveService } from '../services/ImmersveService';
import type { ImmersveProviderConfig } from '../services/immersve-config';
import type { CardFeatureFlag } from '../../../../../selectors/featureFlagController/card';
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
    fundingChannelId: 'base-channel',
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

const TOKENS: CardAuthTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
  refreshTokenExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  location: 'international',
  cardholderAccountId: 'cardholder-1',
  accountAddress: '0xabc',
};

describe('ImmersveProvider', () => {
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
      expect(session._metadata.address).toBe('0xabc');
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
      const accessJwt = makeJwt(Date.now() + 60 * 60 * 1000);
      const refreshJwt = makeJwt(Date.now() + 30 * 24 * 60 * 60 * 1000);
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
      expect(result.tokenSet?.accessTokenExpiresAt).toBeGreaterThan(Date.now());
      expect(result.tokenSet?.refreshTokenExpiresAt).toBeGreaterThan(
        Date.now(),
      );
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
      const accessJwt = makeJwt(Date.now() + 60 * 60 * 1000);
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
    });

    it('maps a rejected refresh token to InvalidCredentials', async () => {
      const { provider, service } = createProvider();
      service.post.mockRejectedValue(
        new CardApiError(401, '/auth/token', 'nope'),
      );

      await expect(provider.refreshTokens(TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.InvalidCredentials,
      });
    });
  });

  describe('validateTokens', () => {
    it('returns valid when the access token JWT is well within expiry', () => {
      const { provider } = createProvider();
      expect(
        provider.validateTokens({
          ...TOKENS,
          accessToken: makeJwt(Date.now() + 60 * 60 * 1000),
        }),
      ).toBe('valid');
    });

    it('returns needs_refresh when access expired but refresh usable', () => {
      const { provider } = createProvider();
      expect(
        provider.validateTokens({
          ...TOKENS,
          accessToken: makeJwt(Date.now() - 1000),
          refreshToken: makeJwt(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      ).toBe('needs_refresh');
    });

    it('returns expired when there is no refresh token', () => {
      const { provider } = createProvider();
      expect(
        provider.validateTokens({
          ...TOKENS,
          accessToken: makeJwt(Date.now() - 1000),
          refreshToken: undefined,
        }),
      ).toBe('expired');
    });
  });

  describe('onboarding state machine', () => {
    it('createFundingSource posts with the flag fundingChannelId', async () => {
      const { provider, service } = createProvider();
      service.post.mockResolvedValue({
        id: 'fs-1',
        network: 'base-sepolia',
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
      expect(result.id).toBe('fs-1');
    });

    it('createFundingSource throws when fundingChannelId is unconfigured', async () => {
      const { provider } = createProvider({ immersve: { cardProgramId: 'p' } });
      await expect(provider.createFundingSource(TOKENS)).rejects.toBeInstanceOf(
        CardProviderError,
      );
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

    it('getSpendingPrerequisites posts cardProgramId + hardcoded constants', async () => {
      const { provider, service } = createProvider();
      service.post.mockResolvedValue({ prerequisites: [] });

      await provider.getSpendingPrerequisites(
        'fs-1',
        { kycRegion: 'GB' },
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
          kycHiddenSteps: ['region', 'contact-channels'],
        }),
        TOKENS,
      );
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
      await expect(provider.getCardDetails(TOKENS)).rejects.toBeInstanceOf(
        CardProviderError,
      );
    });
  });
});
