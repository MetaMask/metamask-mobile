import axios, { isAxiosError } from 'axios';
import { BaanxService, CardApiError } from '../services/BaanxService';
import { CardStatus, CardType } from '../../../../../components/UI/Card/types';
import {
  CardAccountStatus,
  CardAction,
  CardDetails,
  CardFundingAsset,
  CardProviderErrorCode,
  FundingAssetStatus,
  isCardAuthTokenError,
  type CardAuthTokens,
} from '../provider-types';
import { BaanxProvider } from './BaanxProvider';

jest.mock('axios');
jest.mock('../../../../../util/Logger');

const mockAxiosCreate = axios.create as jest.Mock;
const mockRequest = jest.fn();

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
        accessTokenExpiresAt: Date.now() + 3600000,
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
        accessTokenExpiresAt: Date.now() + 3_600_000,
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
      const request = jest.fn().mockResolvedValue({
        access_token: 'new-at',
        refresh_token: 'new-rt',
        expires_in: 60,
        refresh_token_expires_in: 120,
      });

      const result = await buildProvider(request).refreshTokens(tokens);

      expect(result).toMatchObject({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
        location: 'international',
      });
      expect(result.accessTokenExpiresAt).toBeGreaterThan(Date.now());
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

    it('propagates a 403 from a sub-request as an auth token error', async () => {
      const get = jest.fn().mockImplementation((path: string) => {
        if (path === '/v1/user') {
          return Promise.reject(new CardApiError(403, path, ''));
        }
        return Promise.resolve(null);
      });

      const promise = buildProvider(get).getCardHomeData('0xabc', tokens);

      await expect(promise).rejects.toMatchObject({
        code: CardProviderErrorCode.InvalidCredentials,
        statusCode: 403,
      });
      await expect(promise.catch((e) => isCardAuthTokenError(e))).resolves.toBe(
        true,
      );
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
