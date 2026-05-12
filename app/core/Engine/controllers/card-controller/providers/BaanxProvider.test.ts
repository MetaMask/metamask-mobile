import axios, { isAxiosError } from 'axios';
import { BaanxService } from '../services/BaanxService';
import { CardStatus, CardType } from '../../../../../components/UI/Card/types';
import {
  CardAccountStatus,
  CardAction,
  CardDetails,
  CardFundingAsset,
  FundingAssetStatus,
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
      holderName: 'Test User',
      shippingAddress: null,
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

  describe('buildSupportedTokens', () => {
    const LINEA_CHAIN_ID = 'eip155:59144';
    const BASE_CHAIN_ID = 'eip155:8453';
    const USDC_LINEA_ADDRESS = '0x176211869cA2b568f2A7D4EE941E073a821EE1ff';
    const USDC_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
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

    const cardFeatureFlag = {
      chains: {
        [LINEA_CHAIN_ID]: {
          enabled: true,
          tokens: [
            {
              address: USDC_LINEA_ADDRESS,
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              enabled: true,
            },
          ],
        },
        [BASE_CHAIN_ID]: {
          enabled: true,
          tokens: [
            {
              address: USDC_BASE_ADDRESS,
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              enabled: true,
            },
          ],
        },
      },
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

    it('includes delegation-settings tokens as Inactive when not in fundingAssets', () => {
      const provider = new BaanxProvider({ service: {} as BaanxService });
      const result = buildSupportedTokens(provider, [], delegationSettings);

      const usdcLinea = result.find(
        (a) =>
          a.address?.toLowerCase() === USDC_LINEA_ADDRESS.toLowerCase() &&
          a.chainId === LINEA_CHAIN_ID,
      );
      expect(usdcLinea).toBeDefined();
      expect(usdcLinea?.status).toBe(FundingAssetStatus.Inactive);
    });

    it('preserves the status of an active fundingAsset and does not add a duplicate', () => {
      const activeAsset: CardFundingAsset = {
        symbol: 'USDC',
        name: 'USD Coin',
        address: USDC_LINEA_ADDRESS,
        walletAddress: '0xwallet',
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

      const usdcEntries = result.filter(
        (a) =>
          a.address?.toLowerCase() === USDC_LINEA_ADDRESS.toLowerCase() &&
          a.chainId === LINEA_CHAIN_ID,
      );
      expect(usdcEntries).toHaveLength(1);
      expect(usdcEntries[0].status).toBe(FundingAssetStatus.Active);
    });

    it('shows tokens as Inactive when delegationSettings is empty but cardFeatureFlag lists supported tokens', () => {
      // Simulates on-chain revocation: delegationSettings returns no networks,
      // fundingAssets is also empty, but cardFeatureFlag still lists all supported tokens.
      const provider = new BaanxProvider({
        service: {} as BaanxService,
        cardFeatureFlag,
      });

      const result = buildSupportedTokens(provider, [], { networks: [] });

      const usdcLinea = result.find(
        (a) =>
          a.address?.toLowerCase() === USDC_LINEA_ADDRESS.toLowerCase() &&
          a.chainId === LINEA_CHAIN_ID,
      );
      const usdcBase = result.find(
        (a) =>
          a.address?.toLowerCase() === USDC_BASE_ADDRESS.toLowerCase() &&
          a.chainId === BASE_CHAIN_ID,
      );

      expect(usdcLinea).toBeDefined();
      expect(usdcLinea?.status).toBe(FundingAssetStatus.Inactive);
      expect(usdcBase).toBeDefined();
      expect(usdcBase?.status).toBe(FundingAssetStatus.Inactive);
    });

    it('shows tokens as Inactive when delegationSettings is null', () => {
      const provider = new BaanxProvider({
        service: {} as BaanxService,
        cardFeatureFlag,
      });

      const result = buildSupportedTokens(provider, [], null);

      expect(
        result.find(
          (a) =>
            a.address?.toLowerCase() === USDC_LINEA_ADDRESS.toLowerCase() &&
            a.chainId === LINEA_CHAIN_ID,
        ),
      ).toBeDefined();
    });

    it('attaches delegationContract from settings to feature-flag-sourced tokens', () => {
      // delegationSettings has Linea but feature flag also has Base.
      // Linea tokens from feature flag fallback get the contract; Base gets undefined.
      const provider = new BaanxProvider({
        service: {} as BaanxService,
        cardFeatureFlag,
      });

      // Empty fundingAssets, delegationSettings only has Linea (not Base).
      const result = buildSupportedTokens(provider, [], delegationSettings);

      const usdcBase = result.find(
        (a) =>
          a.address?.toLowerCase() === USDC_BASE_ADDRESS.toLowerCase() &&
          a.chainId === BASE_CHAIN_ID,
      );
      expect(usdcBase).toBeDefined();
      expect(usdcBase?.status).toBe(FundingAssetStatus.Inactive);
      // Base has no entry in delegationSettings so delegationContract is undefined
      expect(usdcBase?.delegationContract).toBeUndefined();
    });

    it('does not add disabled tokens from the feature flag', () => {
      const featureFlagWithDisabled = {
        chains: {
          [LINEA_CHAIN_ID]: {
            enabled: true,
            tokens: [
              {
                address: USDC_LINEA_ADDRESS,
                symbol: 'USDC',
                name: 'USD Coin',
                decimals: 6,
                enabled: false,
              },
            ],
          },
        },
      };

      const provider = new BaanxProvider({
        service: {} as BaanxService,
        cardFeatureFlag: featureFlagWithDisabled,
      });

      const result = buildSupportedTokens(provider, [], { networks: [] });
      expect(result).toHaveLength(0);
    });
  });
});
