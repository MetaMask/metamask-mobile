import { CardApiError } from '../services/BaanxService';
import type { ImmersveService } from '../services/ImmersveService';
import type { ImmersveProviderConfig } from '../services/immersve-config';
import type { CardFeatureFlag } from '../../../../../selectors/featureFlagController/card';
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
