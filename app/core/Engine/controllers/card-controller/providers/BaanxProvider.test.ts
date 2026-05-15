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
});
