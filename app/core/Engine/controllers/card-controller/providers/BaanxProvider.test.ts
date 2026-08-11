import axios, { isAxiosError } from 'axios';
import { ethers } from 'ethers';
import { BaanxService, CardApiError } from '../services/BaanxService';
import { CardStatus, CardType } from '../../../../../components/UI/Card/types';
import {
  CardAccountStatus,
  CardAction,
  CardDetails,
  CardFundingAsset,
  CardMerchantCategory,
  CardProviderErrorCode,
  CardProviderIds,
  CardTransactionStatus,
  CardTransactionType,
  FundingAssetStatus,
  isCardAuthTokenError,
  type CardAuthTokens,
} from '../provider-types';
import { encodeCardCursor } from '../utils/transactionCursor';
import { BaanxProvider } from './BaanxProvider';
import type { CardFeatureFlag } from '../../../../../selectors/featureFlagController/card';

jest.mock('axios');
jest.mock('../../../../../util/Logger');
jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      providers: {
        ...actual.ethers.providers,
        StaticJsonRpcProvider: jest.fn(),
      },
    },
  };
});

const mockAxiosCreate = axios.create as jest.Mock;
const mockRequest = jest.fn();
const FIXED_NOW = new Date('2024-06-01T12:00:00.000Z').getTime();

beforeEach(() => {
  jest.clearAllMocks();
  mockAxiosCreate.mockReturnValue({ request: mockRequest });
});

const createService = () =>
  new BaanxService({ apiKey: 'test-api-key', baseUrl: 'https://api.test.com' });

describe('BaanxService', () => {
  describe('constructor', () => {
    it('creates axios instance with baseURL and default headers', () => {
      createService();

      expect(mockAxiosCreate).toHaveBeenCalledWith({
        baseURL: 'https://api.test.com',
        timeout: 15_000,
        headers: {
          'Content-Type': 'application/json',
          'x-client-key': 'test-api-key',
        },
      });
    });
  });

  describe('request', () => {
    it('sends GET request with x-us-env header', async () => {
      mockRequest.mockResolvedValue({ data: { result: 'ok' } });
      const service = createService();

      const result = await service.get('/v1/test');

      expect(result).toStrictEqual({ result: 'ok' });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/v1/test',
          method: 'GET',
          headers: expect.objectContaining({ 'x-us-env': 'false' }),
        }),
      );
    });

    it('sets x-us-env to true when location is us', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();

      service.setLocation('us');
      await service.get('/v1/test');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });

    it('adds Authorization header when tokenSet is provided', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();

      await service.get('/v1/test', {
        accessToken: 'test-token',
        accessTokenExpiresAt: FIXED_NOW + 3_600_000,
        location: 'us',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('sends POST request with body data', async () => {
      mockRequest.mockResolvedValue({ data: { id: '123' } });
      const service = createService();

      const result = await service.post('/v1/create', { name: 'test' });

      expect(result).toStrictEqual({ id: '123' });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/v1/create',
          method: 'POST',
          data: { name: 'test' },
        }),
      );
    });

    it('sends PUT request', async () => {
      mockRequest.mockResolvedValue({ data: { updated: true } });
      const service = createService();

      const result = await service.put('/v1/update', { id: '1' });

      expect(result).toStrictEqual({ updated: true });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    it('throws CardApiError with status, path, and body on HTTP error', async () => {
      const axiosError = new Error('Request failed') as Error & {
        isAxiosError: boolean;
        response: { status: number; data: string };
      };
      axiosError.isAxiosError = true;
      axiosError.response = { status: 401, data: 'Unauthorized' };

      mockRequest.mockRejectedValue(axiosError);
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      await expect(service.get('/v1/test')).rejects.toMatchObject({
        statusCode: 401,
        path: '/v1/test',
        responseBody: 'Unauthorized',
      });
    });

    it('throws CardApiError with 408 on timeout', async () => {
      const axiosError = new Error('timeout') as Error & {
        isAxiosError: boolean;
        code: string;
        response: undefined;
      };
      axiosError.isAxiosError = true;
      axiosError.code = 'ECONNABORTED';
      axiosError.response = undefined;

      mockRequest.mockRejectedValue(axiosError);
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      await expect(service.get('/v1/slow')).rejects.toMatchObject({
        statusCode: 408,
        responseBody: '',
      });
    });

    it('re-throws non-axios errors', async () => {
      mockRequest.mockRejectedValue(new TypeError('Network failure'));
      (isAxiosError as unknown as jest.Mock).mockReturnValue(false);
      const service = createService();

      await expect(service.get('/v1/test')).rejects.toThrow(TypeError);
    });
  });

  describe('location', () => {
    it('defaults to international', () => {
      const service = createService();

      expect(service.location).toBe('international');
    });

    it('updates via setLocation', () => {
      const service = createService();

      service.setLocation('us');

      expect(service.location).toBe('us');
    });
  });

  describe('per-request location override', () => {
    it('uses x-us-env:true when location:us is passed to get(), regardless of currentLocation', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();
      // currentLocation is 'international' (default)

      await service.get('/v1/test', undefined, 'us');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });

    it('uses x-us-env:false when location:international is passed to get(), even after setLocation(us)', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();
      service.setLocation('us');

      await service.get('/v1/test', undefined, 'international');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'false' }),
        }),
      );
    });

    it('falls back to currentLocation when no per-request location is given', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();
      service.setLocation('us');

      await service.get('/v1/test');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });

    it('post() threads per-request location through correctly', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();

      await service.post('/v1/test', {}, undefined, 'us');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });

    it('put() threads per-request location through correctly', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();

      await service.put('/v1/test', {}, undefined, 'us');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });

    it('uses token-embedded location (us) over currentLocation (international) when no explicit location arg', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();
      // currentLocation defaults to 'international'

      // Pass a tokenSet with location:'us' but no explicit location arg
      await service.get('/v1/test', {
        accessToken: 'tok',
        accessTokenExpiresAt: FIXED_NOW + 3_600_000,
        location: 'us',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });
  });
});

describe('BaanxProvider', () => {
  describe('buildActions', () => {
    const provider = new BaanxProvider({ service: {} as BaanxService });
    const buildActions = (
      asset: CardFundingAsset | null,
      card: CardDetails | null,
      account: CardAccountStatus | null,
    ) =>
      (
        provider as unknown as {
          buildActions: (
            asset: CardFundingAsset | null,
            card: CardDetails | null,
            account: CardAccountStatus | null,
          ) => CardAction[];
        }
      ).buildActions(asset, card, account);

    const asset: CardFundingAsset = {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xusdc',
      walletAddress: '0xwallet',
      decimals: 6,
      chainId: 'eip155:59144',
      spendableBalance: '100',
      spendingCap: '100',
      priority: 1,
      status: FundingAssetStatus.Active,
    };

    const account: CardAccountStatus = {
      verificationStatus: 'VERIFIED',
      provisioningEligible: true,
      countryOfResidence: 'US',
      holderName: 'Test User',
      shippingAddress: null,
      usState: 'CA',
    };

    const card: CardDetails = {
      id: 'card-1',
      status: CardStatus.ACTIVE,
      type: CardType.VIRTUAL,
      lastFour: '1234',
      isFreezable: true,
    };

    it('keeps add funds available when the card is frozen', () => {
      expect(
        buildActions(asset, { ...card, status: CardStatus.FROZEN }, account),
      ).toStrictEqual([{ type: 'add_funds', enabled: true }]);
    });

    it('does not show add funds when the card is blocked', () => {
      expect(
        buildActions(asset, { ...card, status: CardStatus.BLOCKED }, account),
      ).toStrictEqual([]);
    });
  });

  describe('generateCardDelegationSignatureMessage', () => {
    const provider = new BaanxProvider({ service: {} as BaanxService });
    const ADDRESS = '0x000000000000000000000000000000000000dEaD';
    const NONCE = 'nonce-xyz';

    it('builds the EVM SIWE message with chain id parsed from CAIP and an Expiration Time', () => {
      const message = provider.generateCardDelegationSignatureMessage({
        network: 'monad',
        address: ADDRESS,
        nonce: NONCE,
        caipChainId: 'eip155:143',
      });

      expect(message).toContain('sign in with your Ethereum account');
      expect(message).toContain(ADDRESS);
      expect(message).toContain('Chain ID: 143');
      expect(message).toContain(`Nonce: ${NONCE}`);
      expect(message).toMatch(/Issued At: \S+/);
      expect(message).toMatch(/Expiration Time: \S+/);
    });

    it('falls back to Linea (59144) when caipChainId has no numeric segment for EVM', () => {
      const message = provider.generateCardDelegationSignatureMessage({
        network: 'linea',
        address: ADDRESS,
        nonce: NONCE,
        caipChainId: 'eip155',
      });

      expect(message).toContain('Chain ID: 59144');
    });

    it('builds the Solana SIWE message with chain id 1, no Expiration Time, and Solana wording', () => {
      const message = provider.generateCardDelegationSignatureMessage({
        network: 'solana',
        address: ADDRESS,
        nonce: NONCE,
      });

      expect(message).toContain('sign in with your Solana account');
      expect(message).toContain(ADDRESS);
      expect(message).toContain('Chain ID: 1');
      expect(message).toContain(`Nonce: ${NONCE}`);
      expect(message).toMatch(/Issued At: \S+/);
      expect(message).not.toContain('Expiration Time');
    });
  });

  describe('buildSupportedTokens', () => {
    const LINEA_CHAIN_ID = 'eip155:59144';
    const USDC_LINEA_ADDRESS = '0x176211869cA2b568f2A7D4EE941E073a821EE1ff';
    const WETH_LINEA_ADDRESS = '0xweth';
    const DELEGATION_CONTRACT = '0xdelegation';

    const delegationSettings = {
      networks: [
        {
          network: 'linea',
          chainId: '0xe708',
          environment: 'production',
          delegationContract: DELEGATION_CONTRACT,
          tokens: {
            usdc: {
              symbol: 'USDC',
              address: USDC_LINEA_ADDRESS,
              decimals: 6,
            },
          },
        },
      ],
    };

    const buildSupportedTokens = (
      provider: BaanxProvider,
      fundingAssets: CardFundingAsset[],
      settings: typeof delegationSettings | null,
    ) =>
      (
        provider as unknown as {
          buildSupportedTokens: (
            assets: CardFundingAsset[],
            settings: typeof delegationSettings | null,
          ) => CardFundingAsset[];
        }
      ).buildSupportedTokens(fundingAssets, settings);

    it('does not synthesize Inactive placeholders (handled by selectCardAvailableTokens)', () => {
      const provider = new BaanxProvider({ service: {} as BaanxService });
      const result = buildSupportedTokens(provider, [], delegationSettings);
      expect(result).toHaveLength(0);
    });

    it('preserves Active funding assets and does not duplicate them', () => {
      const activeAsset: CardFundingAsset = {
        symbol: 'USDC',
        name: 'USD Coin',
        address: USDC_LINEA_ADDRESS,
        walletAddress: '0xwalletA',
        decimals: 6,
        chainId: LINEA_CHAIN_ID,
        spendableBalance: '100',
        spendingCap: '1000',
        priority: 1,
        status: FundingAssetStatus.Active,
      };

      const provider = new BaanxProvider({ service: {} as BaanxService });
      const result = buildSupportedTokens(
        provider,
        [activeAsset],
        delegationSettings,
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(FundingAssetStatus.Active);
    });

    it('returns fundingAssets unchanged when delegationSettings is null', () => {
      const provider = new BaanxProvider({ service: {} as BaanxService });
      const asset: CardFundingAsset = {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        address: WETH_LINEA_ADDRESS,
        walletAddress: '0xwalletA',
        decimals: 18,
        chainId: LINEA_CHAIN_ID,
        spendableBalance: '1',
        spendingCap: '10',
        priority: 1,
        status: FundingAssetStatus.Active,
      };

      const result = buildSupportedTokens(provider, [asset], null);

      expect(result).toHaveLength(1);
      expect(result[0]).toStrictEqual(asset);
    });

    it('returns empty array when delegationSettings has no networks and no fundingAssets', () => {
      const provider = new BaanxProvider({ service: {} as BaanxService });
      const result = buildSupportedTokens(provider, [], { networks: [] });
      expect(result).toHaveLength(0);
    });

    it('enriches existing assets with delegationContract from matching network', () => {
      const assetWithoutContract: CardFundingAsset = {
        symbol: 'USDC',
        name: 'USD Coin',
        address: USDC_LINEA_ADDRESS,
        walletAddress: '0xwalletA',
        decimals: 6,
        chainId: LINEA_CHAIN_ID,
        spendableBalance: '100',
        spendingCap: '1000',
        priority: 1,
        status: FundingAssetStatus.Active,
      };

      const provider = new BaanxProvider({ service: {} as BaanxService });
      const result = buildSupportedTokens(
        provider,
        [assetWithoutContract],
        delegationSettings,
      );

      const usdc = result.find((a) => a.walletAddress === '0xwalletA');
      expect(usdc?.delegationContract).toBe(DELEGATION_CONTRACT);
    });
  });

  describe('refreshTokens', () => {
    const tokens: CardAuthTokens = {
      accessToken: 'at',
      refreshToken: 'rt',
      accessTokenExpiresAt: 1,
      refreshTokenExpiresAt: 2,
      location: 'international',
      providerUserId: 'baanx-user-1',
    };

    const buildProvider = (request: jest.Mock) =>
      new BaanxProvider({
        service: { request, apiKey: 'k' } as unknown as BaanxService,
      });

    it.each([400, 401, 403])(
      'maps a %i refresh rejection to InvalidCredentials',
      async (status) => {
        const request = jest
          .fn()
          .mockRejectedValue(
            new CardApiError(status, '/v1/auth/oauth/token', 'invalid_grant'),
          );

        await expect(
          buildProvider(request).refreshTokens(tokens),
        ).rejects.toMatchObject({
          name: 'CardProviderError',
          code: CardProviderErrorCode.InvalidCredentials,
          statusCode: status,
        });
      },
    );

    it('maps a network failure to a transient error, not InvalidCredentials', async () => {
      const request = jest
        .fn()
        .mockRejectedValue(new CardApiError(0, '/v1/auth/oauth/token', ''));

      await expect(
        buildProvider(request).refreshTokens(tokens),
      ).rejects.toMatchObject({
        name: 'CardProviderError',
        code: CardProviderErrorCode.Network,
      });
    });

    it('maps a 500 to a transient ServerError', async () => {
      const request = jest
        .fn()
        .mockRejectedValue(new CardApiError(500, '/v1/auth/oauth/token', ''));

      await expect(
        buildProvider(request).refreshTokens(tokens),
      ).rejects.toMatchObject({
        name: 'CardProviderError',
        code: CardProviderErrorCode.ServerError,
      });
    });

    it('throws InvalidCredentials without a request when there is no refresh token', async () => {
      const request = jest.fn();

      await expect(
        buildProvider(request).refreshTokens({
          ...tokens,
          refreshToken: undefined,
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.InvalidCredentials,
        statusCode: 401,
      });
      expect(request).not.toHaveBeenCalled();
    });

    it('returns a mapped token set on success', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
      const request = jest.fn().mockResolvedValue({
        access_token: 'new-at',
        refresh_token: 'new-rt',
        expires_in: 60,
        refresh_token_expires_in: 120,
      });

      try {
        const result = await buildProvider(request).refreshTokens(tokens);

        expect(result).toMatchObject({
          accessToken: 'new-at',
          refreshToken: 'new-rt',
          location: 'international',
          providerUserId: 'baanx-user-1',
          accessTokenExpiresAt: Date.now() + 60_000,
          refreshTokenExpiresAt: Date.now() + 120_000,
        });
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('getCardHomeData auth propagation', () => {
    const tokens: CardAuthTokens = {
      accessToken: 'at',
      refreshToken: 'rt',
      accessTokenExpiresAt: 1,
      refreshTokenExpiresAt: 2,
      location: 'international',
    };

    const buildProvider = (get: jest.Mock) =>
      new BaanxProvider({
        service: { get, apiKey: 'k' } as unknown as BaanxService,
      });

    it('propagates a 401 from a sub-request as an auth token error', async () => {
      const get = jest.fn().mockImplementation((path: string) => {
        if (path === '/v1/user') {
          return Promise.reject(new CardApiError(401, path, ''));
        }
        return Promise.resolve(null);
      });

      const promise = buildProvider(get).getCardHomeData('0xabc', tokens);

      await expect(promise).rejects.toMatchObject({
        code: CardProviderErrorCode.InvalidCredentials,
        statusCode: 401,
      });
      await expect(promise.catch((e) => isCardAuthTokenError(e))).resolves.toBe(
        true,
      );
    });

    it('does not treat a 403 sub-request as an auth error (degrades gracefully)', async () => {
      // 403 is a business-rule rejection, not a revoked token, so it is
      // swallowed like other transient failures rather than forcing re-auth.
      const get = jest.fn().mockImplementation((path: string) => {
        if (path === '/v1/user') {
          return Promise.reject(new CardApiError(403, path, ''));
        }
        return Promise.resolve(null);
      });

      const result = await buildProvider(get).getCardHomeData('0xabc', tokens);

      expect(result.account).toBeNull();
      expect(result.card).toBeNull();
      expect(isCardAuthTokenError(new CardApiError(403, '/v1/user', ''))).toBe(
        false,
      );
    });

    it('rejects on a 429 from a sub-request instead of degrading to null card', async () => {
      const get = jest.fn().mockImplementation((path: string) => {
        if (path === '/v1/card/status') {
          return Promise.reject(new CardApiError(429, path, ''));
        }
        return Promise.resolve(null);
      });

      await expect(
        buildProvider(get).getCardHomeData('0xabc', tokens),
      ).rejects.toMatchObject({
        statusCode: 429,
      });
    });

    it('degrades to a partial payload when a sub-request fails transiently', async () => {
      const get = jest.fn().mockImplementation((path: string) => {
        if (path === '/v1/user') {
          return Promise.reject(new CardApiError(500, path, ''));
        }
        return Promise.resolve(null);
      });

      const result = await buildProvider(get).getCardHomeData('0xabc', tokens);

      expect(result.account).toBeNull();
      expect(result.card).toBeNull();
    });

    it('maps countryOfResidence from the user payload onto account status', async () => {
      const get = jest.fn().mockImplementation((path: string) => {
        if (path === '/v1/user') {
          return Promise.resolve({
            verificationState: 'VERIFIED',
            firstName: 'Jane',
            countryOfResidence: 'gb',
          });
        }
        return Promise.resolve(null);
      });

      const result = await buildProvider(get).getCardHomeData('0xabc', tokens);

      expect(result.account).toMatchObject({
        countryOfResidence: 'GB',
        usState: null,
        verificationStatus: 'VERIFIED',
        holderName: 'Jane',
      } satisfies Partial<CardAccountStatus>);
    });

    it('maps usState from the user payload onto account status', async () => {
      const get = jest.fn().mockImplementation((path: string) => {
        if (path === '/v1/user') {
          return Promise.resolve({
            verificationState: 'VERIFIED',
            countryOfResidence: 'US',
            usState: 'ca',
          });
        }
        return Promise.resolve(null);
      });

      const result = await buildProvider(get).getCardHomeData('0xabc', tokens);

      expect(result.account).toMatchObject({
        countryOfResidence: 'US',
        usState: 'CA',
      } satisfies Partial<CardAccountStatus>);
    });

    it('propagates a 401 from the wallet details fetch', async () => {
      const get = jest.fn().mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/wallet/external') {
          return Promise.reject(new CardApiError(401, path, ''));
        }
        return Promise.resolve(null);
      });

      await expect(
        buildProvider(get).getCardHomeData('0xabc', tokens),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.InvalidCredentials,
        statusCode: 401,
      });
    });
  });
});

describe('BaanxProvider — getOnChainAssets (unauthenticated on-chain path)', () => {
  const MockStaticJsonRpcProvider = ethers.providers
    .StaticJsonRpcProvider as jest.MockedClass<
    typeof ethers.providers.StaticJsonRpcProvider
  >;

  const OWNER = '0x1234567890abcdef1234567890abcdef12345678';

  const lineaChainId = 'eip155:59144';

  const baseCardFeatureFlag: CardFeatureFlag = {
    chains: {
      [lineaChainId]: {
        enabled: true,
        balanceScannerAddress: '0xScannerAddress',
        foxConnectAddresses: {
          global: '0xGlobalFoxConnect',
          us: '0xUSFoxConnect',
        },
        tokens: [
          {
            address: '0xTokenAddress',
            symbol: 'USDC',
            decimals: 6,
            enabled: true,
          },
        ],
      },
    },
  };

  const buildProvider = (flag: CardFeatureFlag = baseCardFeatureFlag) =>
    new BaanxProvider({
      service: {
        get: jest.fn(),
        apiKey: 'k',
      } as unknown as BaanxService,
      cardFeatureFlag: flag,
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses StaticJsonRpcProvider with Linea chain ID 59144 to avoid auto-detection calls', async () => {
    // Simulate a provider that throws so we short-circuit without needing full
    // contract call mocks — we only care about how the provider was constructed.
    MockStaticJsonRpcProvider.mockImplementation(() => {
      throw new Error('provider error');
    });

    const provider = buildProvider();
    const result = await provider.getOnChainAssets(OWNER);

    expect(MockStaticJsonRpcProvider).toHaveBeenCalledWith(
      {
        url: expect.stringContaining('linea-mainnet.infura.io'),
        skipFetchSetup: true,
      },
      { chainId: 59144, name: 'linea' },
    );
    expect(result.card).toBeNull();
    expect(result.account).toBeNull();
    expect(result.actions).toContainEqual({ type: 'add_funds', enabled: true });
  });

  it('returns the fallback when the feature flag has no Linea chain config', async () => {
    const provider = buildProvider({ chains: {} });

    const result = await provider.getOnChainAssets(OWNER);

    expect(MockStaticJsonRpcProvider).not.toHaveBeenCalled();
    expect(result.card).toBeNull();
    expect(result.fundingAssets).toHaveLength(0);
    expect(result.actions).toContainEqual({ type: 'add_funds', enabled: true });
  });

  it('returns the fallback when Linea tokens list is empty', async () => {
    const provider = buildProvider({
      chains: {
        [lineaChainId]: {
          ...(baseCardFeatureFlag.chains?.[lineaChainId] ?? {}),
          tokens: [],
        },
      },
    });

    const result = await provider.getOnChainAssets(OWNER);

    expect(MockStaticJsonRpcProvider).not.toHaveBeenCalled();
    expect(result.fundingAssets).toHaveLength(0);
  });

  it('returns the fallback when foxConnectAddresses are missing', async () => {
    const provider = buildProvider({
      chains: {
        [lineaChainId]: {
          ...(baseCardFeatureFlag.chains?.[lineaChainId] ?? {}),
          foxConnectAddresses: undefined,
        },
      },
    });

    const result = await provider.getOnChainAssets(OWNER);

    expect(MockStaticJsonRpcProvider).not.toHaveBeenCalled();
    expect(result.card).toBeNull();
  });

  it('returns the fallback when balanceScannerAddress is missing', async () => {
    const provider = buildProvider({
      chains: {
        [lineaChainId]: {
          ...(baseCardFeatureFlag.chains?.[lineaChainId] ?? {}),
          balanceScannerAddress: undefined,
        },
      },
    });

    const result = await provider.getOnChainAssets(OWNER);

    expect(MockStaticJsonRpcProvider).not.toHaveBeenCalled();
    expect(result.card).toBeNull();
  });

  it('surfaces feature-flag Linea tokens and logs when an on-chain call throws', async () => {
    MockStaticJsonRpcProvider.mockImplementation(() => {
      throw new Error('network failure');
    });

    const provider = buildProvider();
    const result = await provider.getOnChainAssets(OWNER);

    expect(result.card).toBeNull();
    expect(result.account).toBeNull();
    expect(result.fundingAssets).toHaveLength(1);
    expect(result.fundingAssets[0]?.symbol).toBe('USDC');
    expect(result.fundingAssets[0]?.spendableBalance).toBe('');
  });

  describe('#fetchOnChainAllowances — batched calls', () => {
    const TOKEN_ADDRESS = '0x176211869ca2b568f2a7d4ee941e073a821ee1ff';
    const GLOBAL_SPENDER = '0x9dd23A4a0845f10d65D293776B792af1131c7B30';
    const US_SPENDER = '0xA90b298d05C2667dDC64e2A4e17111357c215dD2';
    const SCANNER_ADDRESS = '0xScannerAddress';

    const singleTokenFlag: CardFeatureFlag = {
      chains: {
        'eip155:59144': {
          enabled: true,
          balanceScannerAddress: SCANNER_ADDRESS,
          foxConnectAddresses: {
            global: GLOBAL_SPENDER,
            us: US_SPENDER,
          },
          tokens: [
            {
              address: TOKEN_ADDRESS,
              symbol: 'USDC',
              decimals: 6,
              enabled: true,
            },
          ],
        },
      },
    };

    // ABI-encode a uint256 the same way the on-chain scanner returns it
    const encodeBalance = (value: number) =>
      ethers.utils.defaultAbiCoder.encode(['uint256'], [value]);

    let contractSpy: jest.SpyInstance;
    let spendersAllowancesForTokens: jest.Mock;
    let tokensBalance: jest.Mock;

    beforeEach(() => {
      MockStaticJsonRpcProvider.mockImplementation(
        () =>
          ({
            getBlockNumber: jest.fn().mockResolvedValue(1),
          }) as unknown as ethers.providers.StaticJsonRpcProvider,
      );

      spendersAllowancesForTokens = jest.fn();
      tokensBalance = jest.fn();

      // Spy on the real ethers.Contract so we can control what it returns
      // without replacing the whole class (which would break BigNumber utils).
      contractSpy = jest
        .spyOn(ethers, 'Contract')
        .mockImplementation(
          () => ({ spendersAllowancesForTokens, tokensBalance }) as never,
        );
    });

    afterEach(() => {
      contractSpy.mockRestore();
    });

    it('calls tokensBalance (not individual balanceOf) and fires both scanner calls in parallel', async () => {
      const allowance = ethers.BigNumber.from(1_000_000);
      spendersAllowancesForTokens.mockResolvedValue([
        [
          [true, ethers.utils.defaultAbiCoder.encode(['uint256'], [allowance])],
          [true, ethers.utils.defaultAbiCoder.encode(['uint256'], [0])],
        ],
      ]);
      tokensBalance.mockResolvedValue([
        { success: true, data: encodeBalance(500_000) },
      ]);

      const provider = buildProvider(singleTokenFlag);
      await provider.getOnChainAssets(OWNER);

      expect(spendersAllowancesForTokens).toHaveBeenCalledTimes(1);
      expect(tokensBalance).toHaveBeenCalledTimes(1);
      expect(tokensBalance).toHaveBeenCalledWith(OWNER, [TOKEN_ADDRESS]);
    });

    it('maps decoded balance into spendableBalance on the funding asset', async () => {
      const allowanceRaw = 1_000_000; // 1 USDC (6 decimals)
      const balanceRaw = 500_000; // 0.5 USDC — spendable = min(0.5, 1) = 0.5

      spendersAllowancesForTokens.mockResolvedValue([
        [
          [
            true,
            ethers.utils.defaultAbiCoder.encode(['uint256'], [allowanceRaw]),
          ],
          [true, ethers.utils.defaultAbiCoder.encode(['uint256'], [0])],
        ],
      ]);
      tokensBalance.mockResolvedValue([
        { success: true, data: encodeBalance(balanceRaw) },
      ]);

      const provider = buildProvider(singleTokenFlag);
      const result = await provider.getOnChainAssets(OWNER);

      expect(result.fundingAssets).toHaveLength(1);
      // spendableBalance = min(balance, allowance) formatted to human units
      expect(result.fundingAssets[0]?.spendableBalance).toBe('0.5');
    });

    it('returns zero spendableBalance when tokensBalance result has success: false', async () => {
      const allowanceRaw = 1_000_000;

      spendersAllowancesForTokens.mockResolvedValue([
        [
          [
            true,
            ethers.utils.defaultAbiCoder.encode(['uint256'], [allowanceRaw]),
          ],
          [true, ethers.utils.defaultAbiCoder.encode(['uint256'], [0])],
        ],
      ]);
      // success: false → walletBalance = 0 → spendableBalance = min(0, 1) = 0
      tokensBalance.mockResolvedValue([{ success: false, data: '0x' }]);

      const provider = buildProvider(singleTokenFlag);
      const result = await provider.getOnChainAssets(OWNER);

      expect(result.fundingAssets[0]?.spendableBalance).toBe('0');
    });

    it('returns zero spendableBalance when tokensBalance result data is empty (0x)', async () => {
      const allowanceRaw = 1_000_000;

      spendersAllowancesForTokens.mockResolvedValue([
        [
          [
            true,
            ethers.utils.defaultAbiCoder.encode(['uint256'], [allowanceRaw]),
          ],
          [true, ethers.utils.defaultAbiCoder.encode(['uint256'], [0])],
        ],
      ]);
      tokensBalance.mockResolvedValue([{ success: true, data: '0x' }]);

      const provider = buildProvider(singleTokenFlag);
      const result = await provider.getOnChainAssets(OWNER);

      expect(result.fundingAssets[0]?.spendableBalance).toBe('0');
    });
  });
});

describe('BaanxProvider — listTransactions', () => {
  const tokens: CardAuthTokens = {
    accessToken: 'at',
    accessTokenExpiresAt: FIXED_NOW + 3_600_000,
    location: 'international',
  };

  const buildProvider = (get: jest.Mock) =>
    new BaanxProvider({
      service: { get, apiKey: 'k' } as unknown as BaanxService,
    });

  const buildRawTransaction = (overrides: Record<string, unknown> = {}) => ({
    id: 'tx-1',
    cardId: 'card-1',
    panLast4: '9189',
    transactionId: '1122334477422',
    dateTime: '2024-10-14T10:44:36.276Z',
    sign: 'DEBIT',
    merchantNameLocation: 'WWW.ALIEXPRESS.COM, LONDON',
    merchantType: 'OutOfWalletOnline',
    mcc: 5964,
    mccCategory: 'MISC',
    transactionCurrency: 'EUR',
    amountInTransactionCurrency: '0.79',
    feesInTransactionCurrency: '0',
    originalCurrency: 'USD',
    amountInOriginalCurrency: '0.85',
    billingConversionRate: '0.9294117647058824',
    status: 'CONFIRMED',
    declineReason: '',
    fundingSources: [
      {
        id: 'fs-1',
        address: '0x3a11a86cf218c448be519728cd3ac5c741fb3424',
        network: 'linea',
        txHash: '0xb92de09d893e8162b0861c0f7321f68df022',
        currency: 'usdc',
        amount: '0.104201',
        fees: '0',
        swapFee: '0.00208',
      },
    ],
    ...overrides,
  });

  it('maps a confirmed purchase with merchant, amounts, and funding sources', async () => {
    const get = jest.fn().mockResolvedValue([buildRawTransaction()]);

    const result = await buildProvider(get).listTransactions({}, tokens);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'tx-1',
      providerId: 'baanx',
      timestamp: new Date('2024-10-14T10:44:36.276Z').getTime(),
      status: CardTransactionStatus.Completed,
      type: CardTransactionType.Purchase,
      isDebit: true,
      billingAmount: { value: '0.79', currency: 'EUR' },
      originalAmount: { value: '0.85', currency: 'USD' },
      conversionRate: '0.9294117647058824',
      merchant: {
        name: 'WWW.ALIEXPRESS.COM',
        city: 'LONDON',
        mcc: '5964',
        category: CardMerchantCategory.Misc,
      },
      description: 'WWW.ALIEXPRESS.COM, LONDON',
      reference: '1122334477422',
      cardLastFour: '9189',
      fundingSources: [
        {
          txHash: '0xb92de09d893e8162b0861c0f7321f68df022',
          address: '0x3a11a86cf218c448be519728cd3ac5c741fb3424',
          network: 'linea',
          chainId: 'eip155:59144',
          amount: '0.104201',
          currency: 'usdc',
          fees: '0',
          swapFee: '0.00208',
        },
      ],
    });
    // Empty declineReason and zero fee are dropped rather than mapped.
    expect(result.items[0].declineReason).toBeUndefined();
    expect(result.items[0].feeAmount).toBeUndefined();
  });

  it('maps a declined transaction to Failed with its decline reason', async () => {
    const get = jest.fn().mockResolvedValue([
      buildRawTransaction({
        status: 'DECLINED',
        declineReason: 'Insufficient funds',
        fundingSources: [],
      }),
    ]);

    const result = await buildProvider(get).listTransactions({}, tokens);

    expect(result.items[0]).toMatchObject({
      status: CardTransactionStatus.Failed,
      declineReason: { message: 'Insufficient funds' },
      fundingSources: [],
    });
  });

  it('maps an unknown runtime status conservatively to Pending', async () => {
    const get = jest
      .fn()
      .mockResolvedValue([buildRawTransaction({ status: 'NEW_API_STATUS' })]);

    const result = await buildProvider(get).listTransactions({}, tokens);

    expect(result.items[0].status).toBe(CardTransactionStatus.Pending);
  });

  it('maps CREDIT to a refund and REVERTED to Reversed', async () => {
    const get = jest
      .fn()
      .mockResolvedValue([
        buildRawTransaction({ sign: 'CREDIT', status: 'REVERTED' }),
      ]);

    const result = await buildProvider(get).listTransactions({}, tokens);

    expect(result.items[0]).toMatchObject({
      type: CardTransactionType.Refund,
      status: CardTransactionStatus.Reversed,
      isDebit: false,
    });
  });

  it('maps ATM debits to withdrawals', async () => {
    const get = jest
      .fn()
      .mockResolvedValue([buildRawTransaction({ mccCategory: 'ATM' })]);

    const result = await buildProvider(get).listTransactions({}, tokens);

    expect(result.items[0]).toMatchObject({
      type: CardTransactionType.Withdrawal,
      merchant: expect.objectContaining({
        category: CardMerchantCategory.Atm,
      }),
    });
  });

  it('omits merchant when the name field is absent', async () => {
    const get = jest
      .fn()
      .mockResolvedValue([
        buildRawTransaction({ merchantNameLocation: undefined }),
      ]);

    const result = await buildProvider(get).listTransactions({}, tokens);

    expect(result.items[0].merchant).toBeUndefined();
  });

  it('keeps commas inside merchant names, splitting city on the last comma only', async () => {
    const get = jest.fn().mockResolvedValue([
      buildRawTransaction({
        merchantNameLocation: 'BEN, JERRY AND CO, NEW YORK',
      }),
    ]);

    const result = await buildProvider(get).listTransactions({}, tokens);

    expect(result.items[0].merchant).toMatchObject({
      name: 'BEN, JERRY AND CO',
      city: 'NEW YORK',
    });
  });

  it('omits originalAmount when it matches the billing currency', async () => {
    const get = jest.fn().mockResolvedValue([
      buildRawTransaction({
        originalCurrency: 'EUR',
        amountInOriginalCurrency: '0.79',
      }),
    ]);

    const result = await buildProvider(get).listTransactions({}, tokens);

    expect(result.items[0].originalAmount).toBeUndefined();
  });

  it('requests page 0 without filters by default', async () => {
    const get = jest.fn().mockResolvedValue([]);

    await buildProvider(get).listTransactions({}, tokens);

    expect(get).toHaveBeenCalledWith('/v1/card/transactions?page=0', tokens);
  });

  it('passes searchQuery as searchKey', async () => {
    const get = jest.fn().mockResolvedValue([]);

    await buildProvider(get).listTransactions(
      { searchQuery: 'uber eats' },
      tokens,
    );

    expect(get).toHaveBeenCalledWith(
      '/v1/card/transactions?page=0&searchKey=uber+eats',
      tokens,
    );
  });

  it('sends dateFrom/dateTo only as a pair (API rejects a lone bound)', async () => {
    const get = jest.fn().mockResolvedValue([]);
    const provider = buildProvider(get);

    await provider.listTransactions(
      {
        fromDate: new Date('2024-10-01T00:00:00Z').getTime(),
        toDate: new Date('2024-10-31T12:00:00Z').getTime(),
      },
      tokens,
    );
    await provider.listTransactions(
      { fromDate: new Date('2024-10-01T00:00:00Z').getTime() },
      tokens,
    );

    expect(get).toHaveBeenNthCalledWith(
      1,
      '/v1/card/transactions?page=0&dateFrom=2024-10-01&dateTo=2024-10-31',
      tokens,
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/v1/card/transactions?page=0',
      tokens,
    );
  });

  it('returns a nextCursor after a full page and requests page 1 with it', async () => {
    const fullPage = Array.from({ length: 20 }, (_, i) =>
      buildRawTransaction({ id: `tx-${i}` }),
    );
    const get = jest.fn().mockResolvedValue(fullPage);
    const provider = buildProvider(get);

    const firstPage = await provider.listTransactions({}, tokens);
    expect(firstPage.nextCursor).toBeDefined();

    await provider.listTransactions({ cursor: firstPage.nextCursor }, tokens);

    expect(get).toHaveBeenNthCalledWith(
      2,
      '/v1/card/transactions?page=1',
      tokens,
    );
  });

  it('omits nextCursor for a short (final) page', async () => {
    const get = jest
      .fn()
      .mockResolvedValue([buildRawTransaction(), buildRawTransaction()]);

    const result = await buildProvider(get).listTransactions({}, tokens);

    expect(result.nextCursor).toBeUndefined();
  });

  it('terminates when an out-of-range page wraps back to page 0', async () => {
    const fullPage = Array.from({ length: 20 }, (_, i) =>
      buildRawTransaction({ id: `tx-${i}` }),
    );
    // Baanx returns page 0 again for pages past the end.
    const get = jest.fn().mockResolvedValue(fullPage);
    const provider = buildProvider(get);

    const firstPage = await provider.listTransactions({}, tokens);
    const secondPage = await provider.listTransactions(
      { cursor: firstPage.nextCursor },
      tokens,
    );

    expect(secondPage.items).toHaveLength(0);
    expect(secondPage.nextCursor).toBeUndefined();
  });

  it('detects a wrapped page even when a newer transaction changes its first row', async () => {
    const firstPageRows = Array.from({ length: 20 }, (_, i) =>
      buildRawTransaction({ id: `tx-${i}` }),
    );
    const wrappedRows = [
      buildRawTransaction({ id: 'new-tx' }),
      ...firstPageRows.slice(0, 19),
    ];
    const get = jest
      .fn()
      .mockResolvedValueOnce(firstPageRows)
      .mockResolvedValueOnce(wrappedRows);
    const provider = buildProvider(get);

    const firstPage = await provider.listTransactions({}, tokens);
    const secondPage = await provider.listTransactions(
      { cursor: firstPage.nextCursor },
      tokens,
    );

    expect(secondPage).toStrictEqual({ items: [] });
  });

  it('does not treat a single shifted boundary row as page wraparound', async () => {
    const firstPageRows = Array.from({ length: 20 }, (_, i) =>
      buildRawTransaction({ id: `tx-${i}` }),
    );
    const secondPageRows = [
      buildRawTransaction({ id: 'tx-19' }),
      ...Array.from({ length: 19 }, (_, i) =>
        buildRawTransaction({ id: `older-tx-${i}` }),
      ),
    ];
    const get = jest
      .fn()
      .mockResolvedValueOnce(firstPageRows)
      .mockResolvedValueOnce(secondPageRows);
    const provider = buildProvider(get);

    const firstPage = await provider.listTransactions({}, tokens);
    const secondPage = await provider.listTransactions(
      { cursor: firstPage.nextCursor },
      tokens,
    );

    expect(secondPage.items).toHaveLength(20);
    expect(secondPage.items[0].id).toBe('tx-19');
    expect(secondPage.nextCursor).toBeDefined();
  });

  it('does not treat a half-page shift from new transactions as wraparound', async () => {
    const firstPageRows = Array.from({ length: 20 }, (_, i) =>
      buildRawTransaction({ id: `tx-${i}` }),
    );
    const secondPageRows = [
      ...firstPageRows.slice(10),
      ...Array.from({ length: 10 }, (_, i) =>
        buildRawTransaction({ id: `older-tx-${i}` }),
      ),
    ];
    const get = jest
      .fn()
      .mockResolvedValueOnce(firstPageRows)
      .mockResolvedValueOnce(secondPageRows);
    const provider = buildProvider(get);

    const firstPage = await provider.listTransactions({}, tokens);
    const secondPage = await provider.listTransactions(
      { cursor: firstPage.nextCursor },
      tokens,
    );

    expect(secondPage.items).toHaveLength(20);
    expect(secondPage.items.map(({ id }) => id)).toStrictEqual(
      secondPageRows.map(({ id }) => id),
    );
    expect(secondPage.nextCursor).toBeDefined();
  });

  it('rejects a cursor issued by a different provider', async () => {
    const get = jest.fn().mockResolvedValue([]);
    const foreignCursor = encodeCardCursor(CardProviderIds.Immersve, {
      pg: 7,
    });

    await expect(
      buildProvider(get).listTransactions({ cursor: foreignCursor }, tokens),
    ).rejects.toThrow('Invalid transaction pagination cursor');

    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    { pg: 1 },
    { pg: 0, i: ['tx-1'] },
    { pg: Number.MAX_SAFE_INTEGER + 1, i: ['tx-1'] },
  ])('rejects malformed cursor payload $pg', async (payload) => {
    const get = jest.fn().mockResolvedValue([]);
    const malformedCursor = encodeCardCursor(CardProviderIds.Baanx, payload);

    await expect(
      buildProvider(get).listTransactions({ cursor: malformedCursor }, tokens),
    ).rejects.toThrow('Invalid transaction pagination cursor');

    expect(get).not.toHaveBeenCalled();
  });

  it('returns an empty page for a non-array response body', async () => {
    const get = jest.fn().mockResolvedValue({ unexpected: true });

    const result = await buildProvider(get).listTransactions({}, tokens);

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeUndefined();
  });

  it('maps a 401 to an auth token error', async () => {
    const get = jest
      .fn()
      .mockRejectedValue(new CardApiError(401, '/v1/card/transactions', ''));

    await expect(
      buildProvider(get).listTransactions({}, tokens),
    ).rejects.toMatchObject({
      name: 'CardProviderError',
      code: CardProviderErrorCode.InvalidCredentials,
      statusCode: 401,
    });
  });
});
