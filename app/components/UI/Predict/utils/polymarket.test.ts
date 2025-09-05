/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { TransactionType } from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { addTransaction } from '../../../../util/transaction-controller';
import {
  AMOY_CONTRACTS,
  ClobAuthDomain,
  EIP712Domain,
  MATIC_CONTRACTS,
  MSG_TO_SIGN,
} from '../constants/polymarket';
import { Market, OrderSummary, Side } from '../types';
import {
  ApiKeyCreds,
  ClobOrderParams,
  L2HeaderArgs,
  OrderData,
  OrderResponse,
  OrderType,
  RoundConfig,
  SignatureType,
  TickSizeResponse,
  UserMarketOrder,
  UtilsSide,
} from '../types/polymarket';
import {
  POLYGON_MAINNET_CHAIN_ID,
  AMOY_TESTNET_CHAIN_ID,
  getPolymarketEndpoints,
  getL1Headers,
  buildPolyHmacSignature,
  getL2Headers,
  deriveApiKey,
  createApiKey,
  getMarket,
  priceValid,
  getTickSize,
  getOrderBook,
  calculateBuyMarketPrice,
  calculateSellMarketPrice,
  decimalPlaces,
  roundNormal,
  roundDown,
  roundUp,
  calculateMarketPrice,
  getMarketOrderRawAmounts,
  generateSalt,
  buildMarketOrderCreationArgs,
  getContractConfig,
  getOrderTypedData,
  encodeApprove,
  approveUSDCAllowance,
  submitClobOrder,
} from './polymarket';

// Mock external dependencies
jest.mock('../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      signTypedMessage: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/transaction-controller', () => ({
  addTransaction: jest.fn(),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    createHmac: jest.fn(),
  } as any,
  writable: true,
});

describe('polymarket utils', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockApiKey: ApiKeyCreds = {
    apiKey: 'test-api-key',
    secret: 'test-secret',
    passphrase: 'test-passphrase',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();

    // Setup default mock implementations
    (
      Engine.context.KeyringController.signTypedMessage as jest.Mock
    ).mockResolvedValue('mock-signature');
    (global.crypto as any).createHmac.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mock-digest-base64'),
    });
  });

  describe('getPolymarketEndpoints', () => {
    it('should return production endpoints by default', () => {
      const endpoints = getPolymarketEndpoints();
      expect(endpoints).toEqual({
        GAMMA_API_ENDPOINT: 'https://gamma-api.polymarket.com',
        CLOB_ENDPOINT: 'https://clob.polymarket.com',
        DATA_API_ENDPOINT: 'https://data-api.polymarket.com',
      });
    });

    it('should return staging endpoints when isStaging is true', () => {
      const endpoints = getPolymarketEndpoints({ isStaging: true });
      expect(endpoints).toEqual({
        GAMMA_API_ENDPOINT: 'https://gamma-api-staging.polymarket.com',
        CLOB_ENDPOINT: 'https://clob-staging.polymarket.com',
        DATA_API_ENDPOINT: 'https://data-api-staging.polymarket.com',
      });
    });
  });

  describe('getL1Headers', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should generate correct L1 headers', async () => {
      const expectedHeaders = {
        POLY_ADDRESS: mockAddress,
        POLY_SIGNATURE: 'mock-signature',
        POLY_TIMESTAMP: '1704067200',
        POLY_NONCE: '0',
      };

      const headers = await getL1Headers({ address: mockAddress });

      expect(headers).toEqual(expectedHeaders);
      expect(
        Engine.context.KeyringController.signTypedMessage,
      ).toHaveBeenCalledWith(
        {
          data: {
            domain: {
              name: 'ClobAuthDomain',
              version: '1',
              chainId: POLYGON_MAINNET_CHAIN_ID,
            },
            types: {
              EIP712Domain,
              ...ClobAuthDomain,
            },
            message: {
              address: mockAddress,
              timestamp: '1704067200',
              nonce: 0,
              message: MSG_TO_SIGN,
            },
            primaryType: 'ClobAuth',
          },
          from: mockAddress,
        },
        SignTypedDataVersion.V4,
      );
    });

    it('should handle signing errors', async () => {
      const error = new Error('Signing failed');
      (
        Engine.context.KeyringController.signTypedMessage as jest.Mock
      ).mockRejectedValue(error);

      await expect(getL1Headers({ address: mockAddress })).rejects.toThrow(
        'Signing failed',
      );
    });
  });

  describe('buildPolyHmacSignature', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should build HMAC signature without body', async () => {
      const secret = 'test-secret';
      const timestamp = 1704067200;
      const method = 'GET';
      const requestPath = '/test';

      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test+signature/'),
      };
      (global.crypto as any).createHmac.mockReturnValue(mockHmac);

      const signature = await buildPolyHmacSignature(
        secret,
        timestamp,
        method,
        requestPath,
      );

      expect((global.crypto as any).createHmac).toHaveBeenCalledWith(
        'sha256',
        Buffer.from(secret, 'base64'),
      );
      expect(mockHmac.update).toHaveBeenCalledWith('1704067200GET/test');
      expect(mockHmac.digest).toHaveBeenCalledWith('base64');
      expect(signature).toBe('test-signature_'); // + -> -, / -> _
    });

    it('should build HMAC signature with body', async () => {
      const secret = 'test-secret';
      const timestamp = 1704067200;
      const method = 'POST';
      const requestPath = '/test';
      const body = '{"test": "data"}';

      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test+signature/'),
      };
      (global.crypto as any).createHmac.mockReturnValue(mockHmac);

      const signature = await buildPolyHmacSignature(
        secret,
        timestamp,
        method,
        requestPath,
        body,
      );

      expect(mockHmac.update).toHaveBeenCalledWith(
        '1704067200POST/test{"test": "data"}',
      );
      expect(signature).toBe('test-signature_');
    });

    it('should handle empty secret', async () => {
      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test+signature/'),
      };
      (global.crypto as any).createHmac.mockReturnValue(mockHmac);

      await buildPolyHmacSignature('', 1704067200, 'GET', '/test');

      expect((global.crypto as any).createHmac).toHaveBeenCalledWith(
        'sha256',
        Buffer.from('', 'base64'),
      );
    });
  });

  describe('getL2Headers', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should generate correct L2 headers', async () => {
      const l2HeaderArgs: L2HeaderArgs = {
        method: 'POST',
        requestPath: '/order',
        body: '{"test": "data"}',
      };

      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test+signature/'),
      };
      (global.crypto as any).createHmac.mockReturnValue(mockHmac);

      const headers = await getL2Headers({
        l2HeaderArgs,
        address: mockAddress,
        apiKey: mockApiKey,
      });

      expect(headers).toEqual({
        POLY_ADDRESS: mockAddress,
        POLY_SIGNATURE: 'test-signature_',
        POLY_TIMESTAMP: '1704067200',
        POLY_API_KEY: 'test-api-key',
        POLY_PASSPHRASE: 'test-passphrase',
      });
    });

    it('should use provided timestamp', async () => {
      const l2HeaderArgs: L2HeaderArgs = {
        method: 'GET',
        requestPath: '/markets',
      };
      const customTimestamp = 1704067300;

      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test+signature/'),
      };
      (global.crypto as any).createHmac.mockReturnValue(mockHmac);

      await getL2Headers({
        l2HeaderArgs,
        timestamp: customTimestamp,
        address: mockAddress,
        apiKey: mockApiKey,
      });

      expect(mockHmac.update).toHaveBeenCalledWith(
        `${customTimestamp}GET/markets`,
      );
    });

    it('should handle undefined apiKey gracefully', async () => {
      const l2HeaderArgs: L2HeaderArgs = {
        method: 'GET',
        requestPath: '/markets',
      };

      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test+signature/'),
      };
      (global.crypto as any).createHmac.mockReturnValue(mockHmac);

      await getL2Headers({
        l2HeaderArgs,
        address: mockAddress,
        apiKey: undefined as any,
      });

      expect(mockHmac.update).toHaveBeenCalledWith('1704067200GET/markets');
      expect(mockHmac.digest).toHaveBeenCalledWith('base64');
    });
  });

  describe('deriveApiKey', () => {
    it('should derive API key successfully', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue(mockApiKey),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await deriveApiKey({ address: mockAddress });

      expect(result).toEqual(mockApiKey);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/auth/derive-api-key',
        {
          method: 'GET',
          headers: expect.objectContaining({
            POLY_ADDRESS: mockAddress,
            POLY_SIGNATURE: 'mock-signature',
          }),
        },
      );
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      await expect(deriveApiKey({ address: mockAddress })).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('createApiKey', () => {
    it('should create API key successfully', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue(mockApiKey),
        status: 200,
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await createApiKey({ address: mockAddress });

      expect(result).toEqual(mockApiKey);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/auth/api-key',
        {
          method: 'POST',
          headers: expect.objectContaining({
            POLY_ADDRESS: mockAddress,
          }),
          body: '',
        },
      );
    });

    it('should derive API key when creation returns 400', async () => {
      const createResponse = {
        json: jest.fn().mockResolvedValue({}),
        status: 400,
      };
      const deriveResponse = {
        json: jest.fn().mockResolvedValue(mockApiKey),
      };

      mockFetch
        .mockResolvedValueOnce(createResponse)
        .mockResolvedValueOnce(deriveResponse);

      const result = await createApiKey({ address: mockAddress });

      expect(result).toEqual(mockApiKey);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed');
      mockFetch.mockRejectedValue(error);

      await expect(createApiKey({ address: mockAddress })).rejects.toThrow(
        'Creation failed',
      );
    });
  });

  describe('getMarket', () => {
    it('should fetch market data successfully', async () => {
      const mockMarket: Market = {
        id: 'test-market',
        question: 'Will it rain?',
        outcomes: 'YES,NO',
        image: 'test-image.jpg',
        conditionId: 'test-condition',
        clobTokenIds: 'token1,token2',
        tokenIds: ['token1', 'token2'],
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue(mockMarket),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await getMarket({ conditionId: 'test-condition' });

      expect(result).toEqual(mockMarket);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/markets/test-condition',
      );
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      await expect(
        getMarket({ conditionId: 'test-condition' }),
      ).rejects.toThrow('Network error');
    });
  });

  describe('priceValid', () => {
    it('should return true for valid prices', () => {
      expect(priceValid(0.5, '0.1')).toBe(true);
      expect(priceValid(0.6, '0.01')).toBe(true);
      expect(priceValid(0.05, '0.001')).toBe(true);
      expect(priceValid(0.9, '0.1')).toBe(true); // Upper bound for tickSize 0.1
    });

    it('should return false for invalid prices', () => {
      expect(priceValid(0.05, '0.1')).toBe(false); // Below minimum tick
      expect(priceValid(0.95, '0.1')).toBe(false); // Above 1 - minimum tick (0.9)
      expect(priceValid(1.5, '0.1')).toBe(false); // Above 1
      expect(priceValid(-0.1, '0.1')).toBe(false); // Negative
    });

    it.each([
      ['0.1', 0.6],
      ['0.01', 0.55],
      ['0.001', 0.544],
      ['0.0001', 0.5444],
    ] as const)(
      'should validate tick size %s correctly',
      (tickSize, validPrice) => {
        expect(priceValid(validPrice, tickSize)).toBe(true);
        expect(priceValid(parseFloat(tickSize) - 0.001, tickSize)).toBe(false); // Well below minimum
        expect(priceValid(1 - parseFloat(tickSize) + 0.001, tickSize)).toBe(
          false,
        ); // Well above maximum
      },
    );
  });

  describe('getTickSize', () => {
    it('should fetch tick size successfully', async () => {
      const mockTickSizeResponse: TickSizeResponse = {
        minimum_tick_size: '0.01',
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue(mockTickSizeResponse),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await getTickSize({ tokenId: 'test-token' });

      expect(result).toEqual(mockTickSizeResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/tick-size?token_id=test-token',
        { method: 'GET' },
      );
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      await expect(getTickSize({ tokenId: 'test-token' })).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('getOrderBook', () => {
    it('should fetch order book successfully', async () => {
      const mockOrderBook = {
        bids: [
          { price: '0.4', size: '100' },
          { price: '0.45', size: '200' },
        ],
        asks: [
          { price: '0.6', size: '150' },
          { price: '0.55', size: '100' },
        ],
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue(mockOrderBook),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await getOrderBook({ tokenId: 'test-token' });

      expect(result).toEqual(mockOrderBook);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/book?token_id=test-token',
        { method: 'GET' },
      );
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      await expect(getOrderBook({ tokenId: 'test-token' })).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('calculateBuyMarketPrice', () => {
    const askPositions: OrderSummary[] = [
      { price: '0.6', size: '100' },
      { price: '0.55', size: '100' },
      { price: '0.5', size: '100' },
    ];

    it('should calculate buy market price for exact match', () => {
      const result = calculateBuyMarketPrice(askPositions, 100, OrderType.GTC);
      expect(result).toBe(0.55); // First position that makes sum >= 100
    });

    it('should calculate buy market price for partial match', () => {
      const result = calculateBuyMarketPrice(askPositions, 150, OrderType.GTC);
      expect(result).toBe(0.6); // Highest price makes sum >= 150 (165 >= 150)
    });

    it('should calculate buy market price for full match', () => {
      const result = calculateBuyMarketPrice(askPositions, 300, OrderType.GTC);
      expect(result).toBe(0.6); // Sum never reaches 300 (165 < 300), return first position price
    });

    it('should throw error for no match with FOK', () => {
      expect(() =>
        calculateBuyMarketPrice(askPositions, 400, OrderType.FOK),
      ).toThrow('no match');
    });

    it('should return last position price for no match with GTC', () => {
      const result = calculateBuyMarketPrice(askPositions, 400, OrderType.GTC);
      expect(result).toBe(0.6); // Sum never reaches 400, return first position price
    });

    it('should throw error for empty positions', () => {
      expect(() => calculateBuyMarketPrice([], 100, OrderType.GTC)).toThrow(
        'no match',
      );
    });
  });

  describe('calculateSellMarketPrice', () => {
    const bidPositions: OrderSummary[] = [
      { price: '0.4', size: '100' },
      { price: '0.45', size: '100' },
      { price: '0.5', size: '100' },
    ];

    it('should calculate sell market price for exact match', () => {
      const result = calculateSellMarketPrice(bidPositions, 100, OrderType.GTC);
      expect(result).toBe(0.5); // Highest position that makes sum >= 100
    });

    it('should calculate sell market price for partial match', () => {
      const result = calculateSellMarketPrice(bidPositions, 150, OrderType.GTC);
      expect(result).toBe(0.45); // Second position makes sum >= 150
    });

    it('should calculate sell market price for full match', () => {
      const result = calculateSellMarketPrice(bidPositions, 300, OrderType.GTC);
      expect(result).toBe(0.4); // Total available equals 300, return first position price
    });

    it('should throw error for no match with FOK', () => {
      expect(() =>
        calculateSellMarketPrice(bidPositions, 400, OrderType.FOK),
      ).toThrow('no match');
    });

    it('should return last position price for no match with GTC', () => {
      const result = calculateSellMarketPrice(bidPositions, 400, OrderType.GTC);
      expect(result).toBe(0.4); // Sum never reaches 400, return first position price
    });

    it('should throw error for empty positions', () => {
      expect(() => calculateSellMarketPrice([], 100, OrderType.GTC)).toThrow(
        'no match',
      );
    });
  });

  describe('decimalPlaces', () => {
    it('should return 0 for integers', () => {
      expect(decimalPlaces(5)).toBe(0);
      expect(decimalPlaces(100)).toBe(0);
      expect(decimalPlaces(0)).toBe(0);
    });

    it('should return correct decimal places', () => {
      expect(decimalPlaces(5.1)).toBe(1);
      expect(decimalPlaces(5.123)).toBe(3);
      expect(decimalPlaces(5.123456)).toBe(6);
    });

    it('should handle edge cases', () => {
      expect(decimalPlaces(5.0)).toBe(0); // 5.0 is treated as integer
      expect(decimalPlaces(5.0)).toBe(0); // 5.000 is treated as integer
      expect(decimalPlaces(5.1)).toBe(1); // Actual decimal
      expect(decimalPlaces(5.123)).toBe(3); // Actual decimal
    });
  });

  describe('roundNormal', () => {
    it('should return number when already rounded', () => {
      expect(roundNormal(5.12, 2)).toBe(5.12);
      expect(roundNormal(5.123, 3)).toBe(5.123);
    });

    it('should round up', () => {
      expect(roundNormal(5.125, 2)).toBe(5.13);
      expect(roundNormal(5.123456, 4)).toBe(5.1235);
    });

    it('should round down', () => {
      expect(roundNormal(5.124, 2)).toBe(5.12);
      expect(roundNormal(5.123454, 4)).toBe(5.1235);
    });
  });

  describe('roundDown', () => {
    it('should return number when already rounded', () => {
      expect(roundDown(5.12, 2)).toBe(5.12);
      expect(roundDown(5.123, 3)).toBe(5.123);
    });

    it('should always round down', () => {
      expect(roundDown(5.129, 2)).toBe(5.12);
      expect(roundDown(5.123456, 4)).toBe(5.1234);
      expect(roundDown(5.999, 2)).toBe(5.99);
    });
  });

  describe('roundUp', () => {
    it('should return number when already rounded', () => {
      expect(roundUp(5.12, 2)).toBe(5.12);
      expect(roundUp(5.123, 3)).toBe(5.123);
    });

    it('should always round up', () => {
      expect(roundUp(5.121, 2)).toBe(5.13);
      expect(roundUp(5.123456, 4)).toBe(5.1235);
      expect(roundUp(5.001, 2)).toBe(5.01);
    });
  });

  describe('calculateMarketPrice', () => {
    const mockOrderBook = {
      bids: [
        { price: '0.4', size: '100' },
        { price: '0.45', size: '100' },
      ],
      asks: [
        { price: '0.6', size: '100' },
        { price: '0.55', size: '100' },
      ],
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockOrderBook),
      });
    });

    it('should calculate buy market price', async () => {
      const result = await calculateMarketPrice('test-token', Side.BUY, 100);
      expect(result).toBe(0.6);
    });

    it('should calculate sell market price', async () => {
      const result = await calculateMarketPrice('test-token', Side.SELL, 100);
      expect(result).toBe(0.45); // Price where cumulative size reaches amount
    });

    it('should throw error for missing asks on buy', async () => {
      const orderBookWithoutAsks = { bids: mockOrderBook.bids };
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(orderBookWithoutAsks),
      });

      await expect(
        calculateMarketPrice('test-token', Side.BUY, 100),
      ).rejects.toThrow('no match');
    });

    it('should throw error for missing bids on sell', async () => {
      const orderBookWithoutBids = { asks: mockOrderBook.asks };
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(orderBookWithoutBids),
      });

      await expect(
        calculateMarketPrice('test-token', Side.SELL, 100),
      ).rejects.toThrow('no match');
    });

    it('should throw error for missing orderbook', async () => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(null),
      });

      await expect(
        calculateMarketPrice('test-token', Side.BUY, 100),
      ).rejects.toThrow('no orderbook');
    });

    it('should use default order type', async () => {
      const result = await calculateMarketPrice('test-token', Side.BUY, 100);
      expect(result).toBe(0.6);
    });
  });

  describe('getMarketOrderRawAmounts', () => {
    const roundConfig: RoundConfig = {
      price: 2,
      size: 2,
      amount: 4,
    };

    it('should calculate BUY order amounts correctly', () => {
      const result = getMarketOrderRawAmounts(Side.BUY, 100, 0.5, roundConfig);

      expect(result.side).toBe(UtilsSide.BUY);
      expect(result.rawMakerAmt).toBe(100); // roundDown(100, 2) - amount in dollars
      expect(result.rawTakerAmt).toBe(200); // 100 / 0.5 - shares to receive
    });

    it('should calculate SELL order amounts correctly', () => {
      const result = getMarketOrderRawAmounts(Side.SELL, 100, 0.5, roundConfig);

      expect(result.side).toBe(UtilsSide.SELL);
      expect(result.rawMakerAmt).toBe(100); // roundDown(100, 2)
      expect(result.rawTakerAmt).toBe(50); // 100 * 0.5
    });

    it('should handle decimal precision for BUY orders', () => {
      const result = getMarketOrderRawAmounts(
        Side.BUY,
        100.123456789,
        0.5,
        roundConfig,
      );

      expect(result.rawMakerAmt).toBe(100.12); // roundDown(100.123456789, 2)
      expect(result.rawTakerAmt).toBe(200.24); // roundDown(200.24, 4) after roundUp to 4 decimals
    });

    it('should handle decimal precision for SELL orders', () => {
      const result = getMarketOrderRawAmounts(
        Side.SELL,
        100.123456789,
        0.5,
        roundConfig,
      );

      expect(result.rawMakerAmt).toBe(100.12); // roundDown(100.123456789, 2)
      expect(result.rawTakerAmt).toBe(50.06); // roundDown(50.06, 4) after roundUp to 4 decimals
    });
  });

  describe('generateSalt', () => {
    it('should generate a valid hex salt', () => {
      const salt = generateSalt();
      expect(typeof salt).toBe('string');
      expect(salt.startsWith('0x')).toBe(true);
      expect(salt.length).toBeGreaterThan(2);
      // Should be a valid hex number
      expect(() => parseInt(salt.slice(2), 16)).not.toThrow();
    });

    it('should generate different salts on multiple calls', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('buildMarketOrderCreationArgs', () => {
    const roundConfig: RoundConfig = {
      price: 2,
      size: 2,
      amount: 4,
    };

    const userMarketOrder: UserMarketOrder = {
      tokenID: 'test-token',
      side: Side.BUY,
      amount: 100,
      price: 0.5,
    };

    it('should build order creation args correctly', async () => {
      const result = await buildMarketOrderCreationArgs({
        signer: mockAddress,
        maker: mockAddress,
        signatureType: SignatureType.EOA,
        userMarketOrder,
        roundConfig,
      });

      expect(result).toEqual({
        salt: expect.any(String),
        maker: mockAddress,
        signer: mockAddress,
        taker: '0x0000000000000000000000000000000000000000',
        tokenId: 'test-token',
        makerAmount: '100000000', // parseUnits('100', 6)
        takerAmount: '200000000', // parseUnits('200', 6) - 100 / 0.5 = 200
        expiration: '0',
        nonce: '0',
        feeRateBps: '0',
        side: UtilsSide.BUY,
        signatureType: SignatureType.EOA,
      });
    });

    it('should handle custom taker address', async () => {
      const customTaker = '0x1111111111111111111111111111111111111111';
      const result = await buildMarketOrderCreationArgs({
        signer: mockAddress,
        maker: mockAddress,
        signatureType: SignatureType.EOA,
        userMarketOrder: { ...userMarketOrder, taker: customTaker },
        roundConfig,
      });

      expect(result.taker).toBe(customTaker);
    });

    it('should handle custom fee rate', async () => {
      const result = await buildMarketOrderCreationArgs({
        signer: mockAddress,
        maker: mockAddress,
        signatureType: SignatureType.EOA,
        userMarketOrder: { ...userMarketOrder, feeRateBps: 50 },
        roundConfig,
      });

      expect(result.feeRateBps).toBe('50');
    });

    it('should handle custom nonce', async () => {
      const result = await buildMarketOrderCreationArgs({
        signer: mockAddress,
        maker: mockAddress,
        signatureType: SignatureType.EOA,
        userMarketOrder: { ...userMarketOrder, nonce: 123 },
        roundConfig,
      });

      expect(result.nonce).toBe('123');
    });

    it('should handle undefined price (market order)', async () => {
      const marketOrder = { ...userMarketOrder, price: undefined };
      const result = await buildMarketOrderCreationArgs({
        signer: mockAddress,
        maker: mockAddress,
        signatureType: SignatureType.EOA,
        userMarketOrder: marketOrder,
        roundConfig,
      });

      expect(result.makerAmount).toBe('100000000'); // 100 * 10^6
      expect(result.takerAmount).toBe('100000000'); // 100 * 1 * 10^6 (price defaults to 1)
    });
  });

  describe('getContractConfig', () => {
    it('should return Polygon mainnet contracts', () => {
      const config = getContractConfig(POLYGON_MAINNET_CHAIN_ID);
      expect(config).toEqual(MATIC_CONTRACTS);
    });

    it('should return Amoy testnet contracts', () => {
      const config = getContractConfig(AMOY_TESTNET_CHAIN_ID);
      expect(config).toEqual(AMOY_CONTRACTS);
    });

    it('should throw error for unsupported chain', () => {
      expect(() => getContractConfig(999)).toThrow(
        'MetaMask Predict is only supported on Polygon mainnet and Amoy testnet',
      );
    });
  });

  describe('getOrderTypedData', () => {
    const orderData: OrderData & { salt: string } = {
      salt: '12345',
      maker: mockAddress,
      signer: mockAddress,
      taker: '0x0000000000000000000000000000000000000000',
      tokenId: 'test-token',
      makerAmount: '100000000',
      takerAmount: '50000000',
      expiration: '0',
      nonce: '0',
      feeRateBps: '0',
      side: UtilsSide.BUY,
      signatureType: SignatureType.EOA,
    };

    it('should generate correct typed data structure', () => {
      const result = getOrderTypedData({
        order: orderData,
        chainId: POLYGON_MAINNET_CHAIN_ID,
        verifyingContract: '0x1234567890123456789012345678901234567890',
      });

      expect(result.primaryType).toBe('Order');
      expect(result.domain).toEqual({
        name: 'Polymarket CTF Exchange',
        version: '1',
        chainId: POLYGON_MAINNET_CHAIN_ID,
        verifyingContract: '0x1234567890123456789012345678901234567890',
      });
      expect(result.types).toEqual({
        EIP712Domain: [
          ...EIP712Domain,
          { name: 'verifyingContract', type: 'address' },
        ],
        Order: [
          { name: 'salt', type: 'uint256' },
          { name: 'maker', type: 'address' },
          { name: 'signer', type: 'address' },
          { name: 'taker', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'makerAmount', type: 'uint256' },
          { name: 'takerAmount', type: 'uint256' },
          { name: 'expiration', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'feeRateBps', type: 'uint256' },
          { name: 'side', type: 'uint8' },
          { name: 'signatureType', type: 'uint8' },
        ],
      });
      expect(result.message).toEqual(orderData);
    });
  });

  describe('encodeApprove', () => {
    it('should encode approve function call correctly', () => {
      const spender = '0x1234567890123456789012345678901234567890';
      const amount = BigInt(1000000);

      const result = encodeApprove({ spender, amount });

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
      // Should be a valid hex string
      expect(() => parseInt(result.slice(2), 16)).not.toThrow();
    });

    it('should handle string amounts', () => {
      const spender = '0x1234567890123456789012345678901234567890';
      const amount = '1000000';

      const result = encodeApprove({ spender, amount });

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
    });
  });

  describe('approveUSDCAllowance', () => {
    const mockTransactionMeta = {
      id: 'tx-1',
      hash: '0xabc123',
      status: 'submitted',
    };

    beforeEach(() => {
      (addTransaction as jest.Mock).mockResolvedValue(mockTransactionMeta);
    });

    it('should approve USDC allowance for mainnet', async () => {
      const result = await approveUSDCAllowance({
        address: mockAddress,
        amount: BigInt(1000000),
        negRisk: false,
        networkClientId: 'mainnet',
      });

      expect(result).toEqual(mockTransactionMeta);
      expect(addTransaction).toHaveBeenCalledWith(
        {
          from: mockAddress,
          to: MATIC_CONTRACTS.collateral,
          data: expect.any(String),
          value: '0x0',
        },
        {
          networkClientId: 'mainnet',
          type: TransactionType.tokenMethodApprove,
          requireApproval: true,
        },
      );
    });

    it('should approve USDC allowance for negRisk exchange', async () => {
      const result = await approveUSDCAllowance({
        address: mockAddress,
        amount: BigInt(1000000),
        negRisk: true,
        networkClientId: 'mainnet',
      });

      expect(result).toEqual(mockTransactionMeta);
      expect(addTransaction).toHaveBeenCalledWith(
        {
          from: mockAddress,
          to: MATIC_CONTRACTS.collateral,
          data: expect.any(String),
          value: '0x0',
        },
        {
          networkClientId: 'mainnet',
          type: TransactionType.tokenMethodApprove,
          requireApproval: true,
        },
      );
    });

    it('should handle transaction creation errors', async () => {
      const error = new Error('Transaction failed');
      (addTransaction as jest.Mock).mockRejectedValue(error);

      await expect(
        approveUSDCAllowance({
          address: mockAddress,
          amount: BigInt(1000000),
          negRisk: false,
          networkClientId: 'mainnet',
        }),
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('submitClobOrder', () => {
    const mockClobOrder: ClobOrderParams = {
      owner: mockAddress,
      order: {
        salt: 12345,
        maker: mockAddress,
        signer: mockAddress,
        taker: '0x0000000000000000000000000000000000000000',
        tokenId: 'test-token',
        makerAmount: '100000000',
        takerAmount: '50000000',
        expiration: '0',
        nonce: '0',
        feeRateBps: '0',
        side: Side.BUY,
        signatureType: SignatureType.EOA,
        signature: 'mock-signature',
      },
      orderType: OrderType.GTC,
    };

    const mockOrderResponse: OrderResponse = {
      errorMsg: '',
      makingAmount: '100000000',
      orderID: 'order-123',
      status: 'success',
      success: true,
      takingAmount: '50000000',
      transactionsHashes: [],
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test+signature/'),
      };
      (global.crypto as any).createHmac.mockReturnValue(mockHmac);

      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockOrderResponse),
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should submit CLOB order successfully', async () => {
      const result = await submitClobOrder({
        apiKey: mockApiKey,
        clobOrder: mockClobOrder,
      });

      expect(result).toEqual(mockOrderResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/order',
        {
          method: 'POST',
          headers: expect.objectContaining({
            POLY_ADDRESS: mockAddress,
            POLY_SIGNATURE: 'test-signature_',
            POLY_API_KEY: 'test-api-key',
          }),
          body: JSON.stringify(mockClobOrder),
        },
      );
    });

    it('should handle undefined signer', async () => {
      const orderWithoutSigner = {
        ...mockClobOrder,
        order: { ...mockClobOrder.order, signer: undefined },
      };

      const result = await submitClobOrder({
        apiKey: mockApiKey,
        clobOrder: orderWithoutSigner,
      });

      expect(result).toEqual(mockOrderResponse);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      await expect(
        submitClobOrder({
          apiKey: mockApiKey,
          clobOrder: mockClobOrder,
        }),
      ).rejects.toThrow('Network error');
    });
  });
});
