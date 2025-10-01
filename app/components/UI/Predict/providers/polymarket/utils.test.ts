/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import Engine from '../../../../../core/Engine';
import { PredictCategory, PredictPositionStatus, Side } from '../../types';
import {
  ClobAuthDomain,
  EIP712Domain,
  HASH_ZERO_BYTES32,
  MATIC_CONTRACTS,
  MSG_TO_SIGN,
  POLYGON_MAINNET_CHAIN_ID,
} from './constants';
import {
  ApiKeyCreds,
  ClobHeaders,
  ClobOrderObject,
  L2HeaderArgs,
  OrderData,
  OrderResponse,
  OrderSummary,
  OrderType,
  PolymarketApiEvent,
  PolymarketApiMarket,
  PolymarketPosition,
  RoundConfig,
  SignatureType,
  TickSizeResponse,
  UserMarketOrder,
  UtilsSide,
} from './types';
import { GetMarketsParams } from '../types';
import {
  buildMarketOrderCreationArgs,
  buildPolyHmacSignature,
  calculateBuyMarketPrice,
  calculateFeeAmount,
  calculateMarketPrice,
  calculateSellMarketPrice,
  createApiKey,
  decimalPlaces,
  deriveApiKey,
  encodeApprove,
  encodeClaim,
  encodeRedeemNegRiskPositions,
  encodeRedeemPositions,
  generateSalt,
  getContractConfig,
  getL1Headers,
  getL2Headers,
  getMarketsFromPolymarketApi,
  getMarketOrderRawAmounts,
  getParsedMarketsFromPolymarketApi,
  getOrderBook,
  getOrderTypedData,
  getPolymarketEndpoints,
  getPredictPositionStatus,
  getTickSize,
  parsePolymarketEvents,
  parsePolymarketPositions,
  priceValid,
  roundDown,
  roundNormal,
  roundUp,
  submitClobOrder,
} from './utils';

// Mock external dependencies
jest.mock('../../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      signTypedMessage: jest.fn(),
    },
  },
}));

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
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
    it('return production endpoints', () => {
      const endpoints = getPolymarketEndpoints();
      expect(endpoints).toEqual({
        GAMMA_API_ENDPOINT: 'https://gamma-api.polymarket.com',
        CLOB_ENDPOINT: 'https://clob.polymarket.com',
        DATA_API_ENDPOINT: 'https://data-api.polymarket.com',
        GEOBLOCK_API_ENDPOINT: 'https://polymarket.com/api/geoblock',
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

    it('generate correct L1 headers', async () => {
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

    it('handle signing errors', async () => {
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

    it('build HMAC signature without body', async () => {
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

    it('build HMAC signature with body', async () => {
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

    it('handle empty secret', async () => {
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

    it('generate correct L2 headers', async () => {
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

    it('use provided timestamp', async () => {
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

    it('handle undefined apiKey gracefully', async () => {
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
    it('derive API key successfully', async () => {
      const mockResponse = {
        ok: true,
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

    it('handle fetch errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      await expect(deriveApiKey({ address: mockAddress })).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('createApiKey', () => {
    it('create API key successfully', async () => {
      const mockResponse = {
        ok: true,
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

    it('derive API key when creation returns 400', async () => {
      const createResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({}),
        status: 400,
      };
      const deriveResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiKey),
      };

      mockFetch
        .mockResolvedValueOnce(createResponse)
        .mockResolvedValueOnce(deriveResponse);

      const result = await createApiKey({ address: mockAddress });

      expect(result).toEqual(mockApiKey);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('handle creation errors', async () => {
      const error = new Error('Creation failed');
      mockFetch.mockRejectedValue(error);

      await expect(createApiKey({ address: mockAddress })).rejects.toThrow(
        'Creation failed',
      );
    });
  });

  describe('priceValid', () => {
    it('return true for valid prices', () => {
      expect(priceValid(0.5, '0.1')).toBe(true);
      expect(priceValid(0.6, '0.01')).toBe(true);
      expect(priceValid(0.05, '0.001')).toBe(true);
      expect(priceValid(0.9, '0.1')).toBe(true); // Upper bound for tickSize 0.1
    });

    it('return false for invalid prices', () => {
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
    it('fetch tick size successfully', async () => {
      const mockTickSizeResponse: TickSizeResponse = {
        minimum_tick_size: '0.01',
      };

      const mockResponse = {
        ok: true,
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

    it('handle fetch errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      await expect(getTickSize({ tokenId: 'test-token' })).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('getOrderBook', () => {
    it('fetch order book successfully', async () => {
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
        ok: true,
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

    it('handle fetch errors', async () => {
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

    it('calculate buy market price for exact match', () => {
      const result = calculateBuyMarketPrice(askPositions, 100, OrderType.GTC);
      expect(result).toBe(0.55); // First position that makes sum >= 100
    });

    it('calculate buy market price for partial match', () => {
      const result = calculateBuyMarketPrice(askPositions, 150, OrderType.GTC);
      expect(result).toBe(0.6); // Highest price makes sum >= 150 (165 >= 150)
    });

    it('calculate buy market price for full match', () => {
      const result = calculateBuyMarketPrice(askPositions, 300, OrderType.GTC);
      expect(result).toBe(0.6); // Sum never reaches 300 (165 < 300), return first position price
    });

    it('throw error for no match with FOK', () => {
      expect(() =>
        calculateBuyMarketPrice(askPositions, 400, OrderType.FOK),
      ).toThrow('no match');
    });

    it('return last position price for no match with GTC', () => {
      const result = calculateBuyMarketPrice(askPositions, 400, OrderType.GTC);
      expect(result).toBe(0.6); // Sum never reaches 400, return first position price
    });

    it('throw error for empty positions', () => {
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

    it('calculate sell market price for exact match', () => {
      const result = calculateSellMarketPrice(bidPositions, 100, OrderType.GTC);
      expect(result).toBe(0.5); // Highest position that makes sum >= 100
    });

    it('calculate sell market price for partial match', () => {
      const result = calculateSellMarketPrice(bidPositions, 150, OrderType.GTC);
      expect(result).toBe(0.45); // Second position makes sum >= 150
    });

    it('calculate sell market price for full match', () => {
      const result = calculateSellMarketPrice(bidPositions, 300, OrderType.GTC);
      expect(result).toBe(0.4); // Total available equals 300, return first position price
    });

    it('throw error for no match with FOK', () => {
      expect(() =>
        calculateSellMarketPrice(bidPositions, 400, OrderType.FOK),
      ).toThrow('no match');
    });

    it('return last position price for no match with GTC', () => {
      const result = calculateSellMarketPrice(bidPositions, 400, OrderType.GTC);
      expect(result).toBe(0.4); // Sum never reaches 400, return first position price
    });

    it('throw error for empty positions', () => {
      expect(() => calculateSellMarketPrice([], 100, OrderType.GTC)).toThrow(
        'no match',
      );
    });
  });

  describe('decimalPlaces', () => {
    it('return 0 for integers', () => {
      expect(decimalPlaces(5)).toBe(0);
      expect(decimalPlaces(100)).toBe(0);
      expect(decimalPlaces(0)).toBe(0);
    });

    it('return correct decimal places', () => {
      expect(decimalPlaces(5.1)).toBe(1);
      expect(decimalPlaces(5.123)).toBe(3);
      expect(decimalPlaces(5.123456)).toBe(6);
    });

    it('handle edge cases', () => {
      expect(decimalPlaces(5.0)).toBe(0); // 5.0 is treated as integer
      expect(decimalPlaces(5.0)).toBe(0); // 5.000 is treated as integer
      expect(decimalPlaces(5.1)).toBe(1); // Actual decimal
      expect(decimalPlaces(5.123)).toBe(3); // Actual decimal
    });
  });

  describe('roundNormal', () => {
    it('return number when already rounded', () => {
      expect(roundNormal(5.12, 2)).toBe(5.12);
      expect(roundNormal(5.123, 3)).toBe(5.123);
    });

    it('round up', () => {
      expect(roundNormal(5.125, 2)).toBe(5.13);
      expect(roundNormal(5.123456, 4)).toBe(5.1235);
    });

    it('round down', () => {
      expect(roundNormal(5.124, 2)).toBe(5.12);
      expect(roundNormal(5.123454, 4)).toBe(5.1235);
    });
  });

  describe('roundDown', () => {
    it('return number when already rounded', () => {
      expect(roundDown(5.12, 2)).toBe(5.12);
      expect(roundDown(5.123, 3)).toBe(5.123);
    });

    it('always round down', () => {
      expect(roundDown(5.129, 2)).toBe(5.12);
      expect(roundDown(5.123456, 4)).toBe(5.1234);
      expect(roundDown(5.999, 2)).toBe(5.99);
    });
  });

  describe('roundUp', () => {
    it('return number when already rounded', () => {
      expect(roundUp(5.12, 2)).toBe(5.12);
      expect(roundUp(5.123, 3)).toBe(5.123);
    });

    it('always round up', () => {
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
        ok: true,
        json: jest.fn().mockResolvedValue(mockOrderBook),
      });
    });

    it('calculate buy market price', async () => {
      const result = await calculateMarketPrice('test-token', Side.BUY, 100);
      expect(result).toBe(0.6);
    });

    it('calculate sell market price', async () => {
      const result = await calculateMarketPrice('test-token', Side.SELL, 100);
      expect(result).toBe(0.45); // Price where cumulative size reaches amount
    });

    it('throw error for missing asks on buy', async () => {
      const orderBookWithoutAsks = { bids: mockOrderBook.bids };
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(orderBookWithoutAsks),
      });

      await expect(
        calculateMarketPrice('test-token', Side.BUY, 100),
      ).rejects.toThrow('no match');
    });

    it('throw error for missing bids on sell', async () => {
      const orderBookWithoutBids = { asks: mockOrderBook.asks };
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(orderBookWithoutBids),
      });

      await expect(
        calculateMarketPrice('test-token', Side.SELL, 100),
      ).rejects.toThrow('no match');
    });

    it('throw error for missing orderbook', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(null),
      });

      await expect(
        calculateMarketPrice('test-token', Side.BUY, 100),
      ).rejects.toThrow('no orderbook');
    });

    it('use default order type', async () => {
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

    it('calculate BUY order amounts correctly', () => {
      const result = getMarketOrderRawAmounts(Side.BUY, 100, 0.5, roundConfig);

      expect(result.side).toBe(UtilsSide.BUY);
      expect(result.rawMakerAmt).toBe(100); // roundDown(100, 2) - amount in dollars
      expect(result.rawTakerAmt).toBe(200); // 100 / 0.5 - shares to receive
    });

    it('calculate SELL order amounts correctly', () => {
      const result = getMarketOrderRawAmounts(Side.SELL, 100, 0.5, roundConfig);

      expect(result.side).toBe(UtilsSide.SELL);
      expect(result.rawMakerAmt).toBe(100); // roundDown(100, 2)
      expect(result.rawTakerAmt).toBe(50); // 100 * 0.5
    });

    it('handle decimal precision for BUY orders', () => {
      const result = getMarketOrderRawAmounts(
        Side.BUY,
        100.123456789,
        0.5,
        roundConfig,
      );

      expect(result.rawMakerAmt).toBe(100.12); // roundDown(100.123456789, 2)
      expect(result.rawTakerAmt).toBe(200.24); // roundDown(200.24, 4) after roundUp to 4 decimals
    });

    it('handle decimal precision for SELL orders', () => {
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
    it('generate a valid hex salt', () => {
      const salt = generateSalt();
      expect(typeof salt).toBe('string');
      expect(salt.startsWith('0x')).toBe(true);
      expect(salt.length).toBeGreaterThan(2);
      // Should be a valid hex number
      expect(() => parseInt(salt.slice(2), 16)).not.toThrow();
    });

    it('generate different salts on multiple calls', () => {
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
      size: 100,
      price: 0.5,
    };

    it('build order creation args correctly', async () => {
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

    it('handle custom taker address', async () => {
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

    it('handle custom fee rate', async () => {
      const result = await buildMarketOrderCreationArgs({
        signer: mockAddress,
        maker: mockAddress,
        signatureType: SignatureType.EOA,
        userMarketOrder: { ...userMarketOrder, feeRateBps: 50 },
        roundConfig,
      });

      expect(result.feeRateBps).toBe('50');
    });

    it('handle custom nonce', async () => {
      const result = await buildMarketOrderCreationArgs({
        signer: mockAddress,
        maker: mockAddress,
        signatureType: SignatureType.EOA,
        userMarketOrder: { ...userMarketOrder, nonce: 123 },
        roundConfig,
      });

      expect(result.nonce).toBe('123');
    });

    it('handle undefined price (market order)', async () => {
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
    it('return Polygon mainnet contracts', () => {
      const config = getContractConfig(POLYGON_MAINNET_CHAIN_ID);
      expect(config).toEqual(MATIC_CONTRACTS);
    });

    it('throw error for unsupported chain', () => {
      expect(() => getContractConfig(999)).toThrow(
        'MetaMask Predict is only supported on Polygon mainnet',
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

    it('generate correct typed data structure', () => {
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
    it('encode approve function call correctly', () => {
      const spender = '0x1234567890123456789012345678901234567890';
      const amount = BigInt(1000000);

      const result = encodeApprove({ spender, amount });

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
      // Should be a valid hex string
      expect(() => parseInt(result.slice(2), 16)).not.toThrow();
    });

    it('handle string amounts', () => {
      const spender = '0x1234567890123456789012345678901234567890';
      const amount = '1000000';

      const result = encodeApprove({ spender, amount });

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
    });
  });

  describe('submitClobOrder', () => {
    const mockHeaders: ClobHeaders = {
      POLY_ADDRESS: mockAddress,
      POLY_SIGNATURE: 'test-signature_',
      POLY_TIMESTAMP: '1704067200',
      POLY_API_KEY: 'test-api-key',
      POLY_PASSPHRASE: 'test-passphrase',
    };

    const mockClobOrder: ClobOrderObject = {
      order: {
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
        salt: 12345,
      },
      owner: mockAddress,
      orderType: OrderType.FOK,
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
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockOrderResponse),
      });
    });

    it('submit CLOB order successfully', async () => {
      const result = await submitClobOrder({
        headers: mockHeaders,
        clobOrder: mockClobOrder,
      });

      expect(result).toEqual({
        success: true,
        response: mockOrderResponse,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/order',
        {
          method: 'POST',
          headers: mockHeaders,
          body: JSON.stringify(mockClobOrder),
        },
      );
    });

    it('handle fetch errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      await expect(
        submitClobOrder({
          headers: mockHeaders,
          clobOrder: mockClobOrder,
        }),
      ).rejects.toThrow('Network error');
    });

    it('includes feeAuthorization in request body when provided', async () => {
      const feeAuthorization = {
        type: 'safe-transaction' as const,
        authorization: {
          tx: {
            to: '0xCollateralAddress',
            operation: 0,
            data: '0xdata',
            value: '0',
          },
          sig: '0xsig',
        },
      };

      await submitClobOrder({
        headers: mockHeaders,
        clobOrder: mockClobOrder,
        feeAuthorization,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/order',
        {
          method: 'POST',
          headers: mockHeaders,
          body: JSON.stringify({ ...mockClobOrder, feeAuthorization }),
        },
      );
    });

    it('omits feeAuthorization when undefined', async () => {
      await submitClobOrder({
        headers: mockHeaders,
        clobOrder: mockClobOrder,
        feeAuthorization: undefined,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://clob.polymarket.com/order',
        {
          method: 'POST',
          headers: mockHeaders,
          body: JSON.stringify({
            ...mockClobOrder,
            feeAuthorization: undefined,
          }),
        },
      );
    });

    it('serializes feeAuthorization correctly to JSON', async () => {
      const feeAuthorization = {
        type: 'safe-transaction' as const,
        authorization: {
          tx: {
            to: '0x1234567890123456789012345678901234567890',
            operation: 0,
            data: '0xabcdef',
            value: '100',
          },
          sig: '0xdeadbeef',
        },
      };

      await submitClobOrder({
        headers: mockHeaders,
        clobOrder: mockClobOrder,
        feeAuthorization,
      });

      const callArgs = mockFetch.mock.calls[0];
      const bodyString = callArgs[1].body;
      const parsedBody = JSON.parse(bodyString);

      expect(parsedBody).toHaveProperty('feeAuthorization');
      expect(parsedBody.feeAuthorization).toEqual(feeAuthorization);
    });
  });

  describe('parsePolymarketEvents', () => {
    const mockCategory: PredictCategory = 'trending';

    const mockEvent: PolymarketApiEvent = {
      id: 'event-1',
      slug: 'test-event',
      title: 'Test Event',
      description: 'A test event',
      icon: 'https://example.com/icon.png',
      closed: false,
      series: [{ recurrence: 'daily' }],
      markets: [
        {
          conditionId: 'market-1',
          question: 'Will it rain?',
          description: 'Weather prediction',
          icon: 'https://example.com/market-icon.png',
          image: 'https://example.com/market-image.png',
          groupItemTitle: 'Weather',
          closed: false,
          volumeNum: 1000,
          clobTokenIds: '["token-1", "token-2"]',
          outcomes: '["Yes", "No"]',
          outcomePrices: '["0.6", "0.4"]',
          negRisk: true,
          orderPriceMinTickSize: 0.01,
          status: 'open',
          active: true,
          resolvedBy: '0x0000000000000000000000000000000000000000',
        },
      ],
    };

    it('parse events correctly', () => {
      const result = parsePolymarketEvents([mockEvent], mockCategory);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'event-1',
        slug: 'test-event',
        providerId: 'polymarket',
        title: 'Test Event',
        description: 'A test event',
        image: 'https://example.com/icon.png',
        status: 'open',
        recurrence: 'daily',
        endDate: undefined,
        categories: [mockCategory],
        outcomes: [
          {
            id: 'market-1',
            marketId: 'event-1',
            title: 'Will it rain?',
            description: 'Weather prediction',
            image: 'https://example.com/market-icon.png',
            groupItemTitle: 'Weather',
            status: 'open',
            volume: 1000,
            tokens: [
              {
                id: 'token-1',
                title: 'Yes',
                price: 0.6,
              },
              {
                id: 'token-2',
                title: 'No',
                price: 0.4,
              },
            ],
            negRisk: true,
            tickSize: '0.01',
            resolvedBy: '0x0000000000000000000000000000000000000000',
          },
        ],
      });
    });

    it('handle closed events', () => {
      const closedEvent = {
        ...mockEvent,
        closed: true,
        markets: [
          {
            ...mockEvent.markets[0],
            closed: true,
          },
        ],
      };
      const result = parsePolymarketEvents([closedEvent], mockCategory);

      expect(result[0].status).toBe('closed');
      expect(result[0].outcomes[0].status).toBe('closed');
    });

    it('handle null clobTokenIds', () => {
      const eventWithNullTokens = {
        ...mockEvent,
        markets: [
          {
            ...mockEvent.markets[0],
            clobTokenIds: '[]',
            outcomes: '[]',
            outcomePrices: '[]',
          },
        ],
      };

      const result = parsePolymarketEvents([eventWithNullTokens], mockCategory);

      expect(result[0].outcomes[0].tokens).toEqual([]);
    });

    it('use market image when icon is not available', () => {
      const eventWithoutIcon = {
        ...mockEvent,
        markets: [
          {
            ...mockEvent.markets[0],
            icon: '',
          },
        ],
      };

      const result = parsePolymarketEvents([eventWithoutIcon], mockCategory);

      expect(result[0].outcomes[0].image).toBe('');
    });

    it('filter out inactive markets', () => {
      const eventWithInactiveMarkets = {
        ...mockEvent,
        markets: [
          {
            ...mockEvent.markets[0],
            conditionId: 'market-1',
            active: true,
          },
          {
            ...mockEvent.markets[0],
            conditionId: 'market-2',
            active: false,
          },
          {
            ...mockEvent.markets[0],
            conditionId: 'market-3',
          },
        ],
      };

      const result = parsePolymarketEvents(
        [eventWithInactiveMarkets],
        mockCategory,
      );

      expect(result[0].outcomes).toHaveLength(2);
      expect(result[0].outcomes.map((outcome) => outcome.id)).toEqual([
        'market-1',
        'market-3',
      ]);
    });

    it('sort markets by price in descending order', () => {
      const eventWithMultipleMarkets = {
        ...mockEvent,
        markets: [
          {
            ...mockEvent.markets[0],
            conditionId: 'market-low-price',
            outcomePrices: '["0.3", "0.7"]',
          },
          {
            ...mockEvent.markets[0],
            conditionId: 'market-high-price',
            outcomePrices: '["0.8", "0.2"]',
          },
          {
            ...mockEvent.markets[0],
            conditionId: 'market-medium-price',
            outcomePrices: '["0.5", "0.5"]',
          },
        ],
      };

      const result = parsePolymarketEvents(
        [eventWithMultipleMarkets],
        mockCategory,
      );

      expect(result[0].outcomes).toHaveLength(3);
      expect(result[0].outcomes.map((outcome) => outcome.id)).toEqual([
        'market-high-price',
        'market-medium-price',
        'market-low-price',
      ]);
    });

    it('handle markets with null outcomePrices in sorting', () => {
      const eventWithNullPrices = {
        ...mockEvent,
        markets: [
          {
            ...mockEvent.markets[0],
            conditionId: 'market-with-price',
            outcomePrices: '["0.6", "0.4"]',
          },
          {
            ...mockEvent.markets[0],
            conditionId: 'market-without-price',
            outcomePrices: null as any,
          },
        ],
      };

      const result = parsePolymarketEvents([eventWithNullPrices], mockCategory);

      expect(result[0].outcomes).toHaveLength(2);
      // Market with price should come first (0.6 > 0)
      expect(result[0].outcomes[0].id).toBe('market-with-price');
      expect(result[0].outcomes[1].id).toBe('market-without-price');
    });

    it('handle markets with undefined outcomePrices in sorting', () => {
      const eventWithUndefinedPrices = {
        ...mockEvent,
        markets: [
          {
            ...mockEvent.markets[0],
            conditionId: 'market-with-price',
            outcomePrices: '["0.3", "0.7"]',
          },
          {
            ...mockEvent.markets[0],
            conditionId: 'market-without-price',
            outcomePrices: undefined as any,
          },
        ],
      };

      const result = parsePolymarketEvents(
        [eventWithUndefinedPrices],
        mockCategory,
      );

      expect(result[0].outcomes).toHaveLength(2);
      // Market with price should come first (0.3 > 0)
      expect(result[0].outcomes[0].id).toBe('market-with-price');
      expect(result[0].outcomes[1].id).toBe('market-without-price');
    });

    it('handle markets with empty outcomePrices string in sorting', () => {
      const eventWithEmptyPrices = {
        ...mockEvent,
        markets: [
          {
            ...mockEvent.markets[0],
            conditionId: 'market-with-price',
            outcomePrices: '["0.4", "0.6"]',
          },
          {
            ...mockEvent.markets[0],
            conditionId: 'market-with-empty-price',
            outcomePrices: '',
          },
        ],
      };

      const result = parsePolymarketEvents(
        [eventWithEmptyPrices],
        mockCategory,
      );

      expect(result[0].outcomes).toHaveLength(2);
      // Market with price should come first (0.4 > 0)
      expect(result[0].outcomes[0].id).toBe('market-with-price');
      expect(result[0].outcomes[1].id).toBe('market-with-empty-price');
    });

    it('include resolvedBy field in outcome', () => {
      const eventWithResolvedBy = {
        ...mockEvent,
        markets: [
          {
            ...mockEvent.markets[0],
            resolvedBy: '0x1234567890123456789012345678901234567890',
          },
        ],
      };

      const result = parsePolymarketEvents([eventWithResolvedBy], mockCategory);

      expect(result[0].outcomes[0].resolvedBy).toBe(
        '0x1234567890123456789012345678901234567890',
      );
    });

    it('handle undefined resolvedBy field', () => {
      const eventWithoutResolvedBy = {
        ...mockEvent,
        markets: [
          {
            ...mockEvent.markets[0],
            resolvedBy: undefined as any,
          },
        ],
      };

      const result = parsePolymarketEvents(
        [eventWithoutResolvedBy],
        mockCategory,
      );

      expect(result[0].outcomes[0].resolvedBy).toBeUndefined();
    });

    it('handle complex sorting with mixed price scenarios', () => {
      const eventWithComplexPrices = {
        ...mockEvent,
        markets: [
          {
            ...mockEvent.markets[0],
            conditionId: 'market-zero',
            outcomePrices: '["0", "1"]',
          },
          {
            ...mockEvent.markets[0],
            conditionId: 'market-high',
            outcomePrices: '["0.9", "0.1"]',
          },
          {
            ...mockEvent.markets[0],
            conditionId: 'market-medium',
            outcomePrices: '["0.5", "0.5"]',
          },
          {
            ...mockEvent.markets[0],
            conditionId: 'market-null',
            outcomePrices: null as any,
          },
        ],
      };

      const result = parsePolymarketEvents(
        [eventWithComplexPrices],
        mockCategory,
      );

      expect(result[0].outcomes).toHaveLength(4);
      expect(result[0].outcomes.map((outcome) => outcome.id)).toEqual([
        'market-high', // 0.9
        'market-medium', // 0.5
        'market-zero', // 0
        'market-null', // 0 (default)
      ]);
    });
  });

  describe('parsePolymarketPositions', () => {
    const createPosition = (
      id: string,
      index: number,
      props: Partial<PolymarketPosition>,
    ): PolymarketPosition => ({
      asset: `position-${id}`,
      conditionId: 'condition-1',
      icon: `https://example.com/icon${id}.png`,
      title: `Position ${id}`,
      slug: `position-${id}`,
      size: 100,
      outcome: 'Yes',
      outcomeIndex: index,
      cashPnl: 10,
      curPrice: 0.6,
      currentValue: 60,
      percentPnl: 5,
      realizedPnl: 0,
      initialValue: 50,
      avgPrice: 0.5,
      redeemable: false,
      negativeRisk: false,
      endDate: '2024-12-31',
      ...props,
    });

    const mockPositions: PolymarketPosition[] = [
      createPosition('1', 0, {}),
      createPosition('2', 1, {
        size: 50,
        outcome: 'No',
        cashPnl: -5,
        curPrice: 0.4,
        currentValue: 20,
        percentPnl: -10,
        initialValue: 25,
        redeemable: true,
      }),
      createPosition('3', 2, {
        size: 75,
        outcome: 'Maybe',
        cashPnl: 15,
        curPrice: 0.8,
        percentPnl: 20,
        avgPrice: 0.67,
        redeemable: true,
      }),
    ];

    const mockMarketResponse: Partial<PolymarketApiMarket>[] = [
      {
        conditionId: 'condition-1',
        events: [
          {
            id: 'event-1',
            slug: 'slug-1',
            title: 'Mock Event',
            description: 'Mock Description',
            icon: 'mock-icon.png',
            closed: false,
            series: [],
            markets: [],
          },
        ],
      },
    ];

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockMarketResponse),
      });
    });

    it('parse positions correctly and enrich with market data', async () => {
      const result = await parsePolymarketPositions({
        positions: mockPositions,
      });

      expect(result[0]).toEqual({
        id: 'position-1',
        providerId: 'polymarket',
        marketId: 'event-1',
        outcomeId: 'condition-1',
        outcome: 'Yes',
        outcomeTokenId: 'position-1',
        outcomeIndex: 0,
        negRisk: false,
        amount: 100,
        price: 0.6,
        status: 'open',
        realizedPnl: 0,
        percentPnl: 5,
        cashPnl: 10,
        initialValue: 50,
        avgPrice: 0.5,
        endDate: '2024-12-31',
        title: 'Position 1',
        icon: 'https://example.com/icon1.png',
        size: 100,
        claimable: false,
        currentValue: 60,
      });

      expect(result[1]).toEqual({
        id: 'position-2',
        providerId: 'polymarket',
        marketId: 'event-1',
        outcomeId: 'condition-1',
        outcome: 'No',
        outcomeTokenId: 'position-2',
        outcomeIndex: 1,
        negRisk: false,
        amount: 50,
        price: 0.4,
        status: 'lost',
        realizedPnl: 0,
        percentPnl: -10,
        cashPnl: -5,
        initialValue: 25,
        avgPrice: 0.5,
        endDate: '2024-12-31',
        title: 'Position 2',
        icon: 'https://example.com/icon2.png',
        size: 50,
        claimable: true,
        currentValue: 20,
      });

      expect(result[2]).toEqual({
        id: 'position-3',
        providerId: 'polymarket',
        marketId: 'event-1',
        outcomeId: 'condition-1',
        outcome: 'Maybe',
        outcomeTokenId: 'position-3',
        outcomeIndex: 2,
        negRisk: false,
        amount: 75,
        price: 0.8,
        status: 'won',
        realizedPnl: 0,
        percentPnl: 20,
        cashPnl: 15,
        initialValue: 50,
        avgPrice: 0.67,
        endDate: '2024-12-31',
        title: 'Position 3',
        icon: 'https://example.com/icon3.png',
        size: 75,
        claimable: true,
        currentValue: 60,
      });
    });

    it('handle empty positions array', async () => {
      const result = await parsePolymarketPositions({ positions: [] });
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('getPredictPositionStatus', () => {
    it.each([
      { claimable: false, cashPnl: 10, expected: PredictPositionStatus.OPEN },
      { claimable: false, cashPnl: -5, expected: PredictPositionStatus.OPEN },
      { claimable: true, cashPnl: 15, expected: PredictPositionStatus.WON },
      { claimable: true, cashPnl: 0, expected: PredictPositionStatus.LOST },
      { claimable: true, cashPnl: -5, expected: PredictPositionStatus.LOST },
    ])(
      'returns $expected when claimable=$claimable and cashPnl=$cashPnl',
      ({ claimable, cashPnl, expected }) => {
        const result = getPredictPositionStatus({ claimable, cashPnl });
        expect(result).toBe(expected);
      },
    );
  });

  describe('getMarketsFromPolymarketApi', () => {
    const mockEvent: PolymarketApiEvent = {
      id: 'event-1',
      slug: 'test-event',
      title: 'Test Event',
      description: 'A test event',
      icon: 'https://example.com/icon.png',
      closed: false,
      series: [{ recurrence: 'daily' }],
      markets: [
        {
          conditionId: 'market-1',
          question: 'Will it rain?',
          description: 'Weather prediction',
          icon: 'https://example.com/market-icon.png',
          image: 'https://example.com/market-image.png',
          groupItemTitle: 'Weather',
          closed: false,
          volumeNum: 1000,
          clobTokenIds: '["token-1", "token-2"]',
          outcomes: '["Yes", "No"]',
          outcomePrices: '["0.6", "0.4"]',
          negRisk: true,
          orderPriceMinTickSize: 0.01,
          status: 'open',
          active: true,
          resolvedBy: '0x0000000000000000000000000000000000000000',
        },
      ],
    };

    it('fetch markets without search parameters', async () => {
      const mockResponse = {
        data: [mockEvent],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await getParsedMarketsFromPolymarketApi();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('event-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/events/pagination?limit=20&active=true&archived=false&closed=false&ascending=false&offset=0&exclude_tag_id=100639&order=volume24hr',
      );
    });

    it('fetch markets with search query', async () => {
      const mockResponse = {
        events: [mockEvent],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: GetMarketsParams = {
        providerId: 'polymarket',
        q: 'weather',
        limit: 10,
        offset: 5,
      };

      const result = await getParsedMarketsFromPolymarketApi(params);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('event-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/public-search?q=weather&limit_per_type=10&page=1&ascending=false',
      );
    });

    it('handle different categories', async () => {
      const mockResponse = {
        data: [mockEvent],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const params: GetMarketsParams = {
        providerId: 'polymarket',
        category: 'crypto',
        limit: 5,
      };

      await getParsedMarketsFromPolymarketApi(params);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/events/pagination?limit=5&active=true&archived=false&closed=false&ascending=false&offset=0&tag_slug=crypto&order=volume24hr',
      );
    });

    it('return empty array for invalid response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      const result = await getParsedMarketsFromPolymarketApi();

      expect(result).toEqual([]);
    });

    it('handle fetch errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      await expect(getParsedMarketsFromPolymarketApi()).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('getMarketFromPolymarketApi', () => {
    const mockMarket: PolymarketApiMarket = {
      conditionId: 'market-1',
      question: 'Will it rain?',
      description: 'Weather prediction',
      icon: 'https://example.com/market-icon.png',
      image: 'https://example.com/market-image.png',
      groupItemTitle: 'Weather',
      closed: false,
      volumeNum: 1000,
      clobTokenIds: '["token-1", "token-2"]',
      outcomes: '["Yes", "No"]',
      outcomePrices: '["0.6", "0.4"]',
      negRisk: true,
      orderPriceMinTickSize: 0.01,
      status: 'open',
      active: true,
      resolvedBy: '0x0000000000000000000000000000000000000000',
    };

    it('fetch single market successfully', async () => {
      const mockResponse = [mockMarket];

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await getMarketsFromPolymarketApi({
        conditionIds: ['market-1'],
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/markets?condition_ids=market-1',
      );
    });

    it('handle fetch errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      await expect(
        getMarketsFromPolymarketApi({ conditionIds: ['market-1'] }),
      ).rejects.toThrow('Network error');
    });
  });

  describe('encodeRedeemPositions', () => {
    it('encode redeem positions function call correctly', () => {
      const collateralToken = '0x1234567890123456789012345678901234567890';
      const parentCollectionId = HASH_ZERO_BYTES32;
      const conditionId =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const indexSets = [1, 2];

      const result = encodeRedeemPositions({
        collateralToken,
        parentCollectionId,
        conditionId,
        indexSets,
      });

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
      // Should be a valid hex string
      expect(() => parseInt(result.slice(2), 16)).not.toThrow();
    });

    it('handle different index sets', () => {
      const collateralToken = '0x1234567890123456789012345678901234567890';
      const parentCollectionId = HASH_ZERO_BYTES32;
      const conditionId =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const indexSets = [1, 2, 3, 4];

      const result = encodeRedeemPositions({
        collateralToken,
        parentCollectionId,
        conditionId,
        indexSets,
      });

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
    });

    it('handle bigint amounts', () => {
      const collateralToken = '0x1234567890123456789012345678901234567890';
      const parentCollectionId = HASH_ZERO_BYTES32;
      const conditionId =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const indexSets = [BigInt(1), BigInt(2)];

      const result = encodeRedeemPositions({
        collateralToken,
        parentCollectionId,
        conditionId,
        indexSets,
      });

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
    });
  });

  describe('encodeRedeemNegRiskPositions', () => {
    it('encode redeem neg risk positions function call correctly', () => {
      const conditionId =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const amounts = [100, 200];

      const result = encodeRedeemNegRiskPositions({
        conditionId,
        amounts,
      });

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
      // Should be a valid hex string
      expect(() => parseInt(result.slice(2), 16)).not.toThrow();
    });

    it('handle bigint amounts', () => {
      const conditionId =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const amounts = [BigInt(100), BigInt(200)];

      const result = encodeRedeemNegRiskPositions({
        conditionId,
        amounts,
      });

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
    });

    it('handle string amounts', () => {
      const conditionId =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const amounts = ['100', '200'];

      const result = encodeRedeemNegRiskPositions({
        conditionId,
        amounts,
      });

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
    });
  });

  describe('encodeClaim', () => {
    it('encode claim for non-negRisk positions', () => {
      const conditionId =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const negRisk = false;

      const result = encodeClaim(conditionId, negRisk);

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
      // Should be a valid hex string
      expect(() => parseInt(result.slice(2), 16)).not.toThrow();
    });

    it('encode claim for negRisk positions with amounts', () => {
      const conditionId =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const negRisk = true;
      const amounts = [100, 200];

      const result = encodeClaim(conditionId, negRisk, amounts);

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
    });

    it('throw error for negRisk positions without amounts', () => {
      const conditionId =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const negRisk = true;

      expect(() => encodeClaim(conditionId, negRisk)).toThrow(
        'amounts parameter is required when negRisk is true',
      );
    });

    it('handle bigint amounts for negRisk positions', () => {
      const conditionId =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const negRisk = true;
      const amounts = [BigInt(100), BigInt(200)];

      const result = encodeClaim(conditionId, negRisk, amounts);

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
    });

    it('handle string amounts for negRisk positions', () => {
      const conditionId =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const negRisk = true;
      const amounts = ['100', '200'];

      const result = encodeClaim(conditionId, negRisk, amounts);

      expect(typeof result).toBe('string');
      expect(result.startsWith('0x')).toBe(true);
    });
  });

  describe('calculateFeeAmount', () => {
    it('calculates 4% fee for BUY orders', () => {
      const order: OrderData = {
        maker: '0x1234567890123456789012345678901234567890',
        signer: '0x1234567890123456789012345678901234567890',
        taker: '0x0000000000000000000000000000000000000000',
        tokenId: '123',
        makerAmount: '1000000',
        takerAmount: '500000',
        expiration: '0',
        nonce: '0',
        feeRateBps: '0',
        side: UtilsSide.BUY,
        signatureType: SignatureType.EOA,
      };

      const feeAmount = calculateFeeAmount(order);

      expect(feeAmount).toBe(BigInt(40000));
    });

    it('returns zero fee for SELL orders', () => {
      const order: OrderData = {
        maker: '0x1234567890123456789012345678901234567890',
        signer: '0x1234567890123456789012345678901234567890',
        taker: '0x0000000000000000000000000000000000000000',
        tokenId: '123',
        makerAmount: '1000000',
        takerAmount: '500000',
        expiration: '0',
        nonce: '0',
        feeRateBps: '0',
        side: UtilsSide.SELL,
        signatureType: SignatureType.EOA,
      };

      const feeAmount = calculateFeeAmount(order);

      expect(feeAmount).toBe(BigInt(0));
    });

    it('handles large maker amounts correctly', () => {
      const order: OrderData = {
        maker: '0x1234567890123456789012345678901234567890',
        signer: '0x1234567890123456789012345678901234567890',
        taker: '0x0000000000000000000000000000000000000000',
        tokenId: '123',
        makerAmount: '100000000000',
        takerAmount: '50000000000',
        expiration: '0',
        nonce: '0',
        feeRateBps: '0',
        side: UtilsSide.BUY,
        signatureType: SignatureType.EOA,
      };

      const feeAmount = calculateFeeAmount(order);

      expect(feeAmount).toBe(BigInt(4000000000));
    });

    it('returns bigint type', () => {
      const order: OrderData = {
        maker: '0x1234567890123456789012345678901234567890',
        signer: '0x1234567890123456789012345678901234567890',
        taker: '0x0000000000000000000000000000000000000000',
        tokenId: '123',
        makerAmount: '250000',
        takerAmount: '125000',
        expiration: '0',
        nonce: '0',
        feeRateBps: '0',
        side: UtilsSide.BUY,
        signatureType: SignatureType.EOA,
      };

      const feeAmount = calculateFeeAmount(order);

      expect(typeof feeAmount).toBe('bigint');
      expect(feeAmount).toBe(BigInt(10000));
    });
  });

  describe('submitClobOrder error handling', () => {
    const mockHeaders: ClobHeaders = {
      POLY_ADDRESS: mockAddress,
      POLY_SIGNATURE: 'test-signature_',
      POLY_TIMESTAMP: '1704067200',
      POLY_API_KEY: 'test-api-key',
      POLY_PASSPHRASE: 'test-passphrase',
    };

    const mockClobOrder: ClobOrderObject = {
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
      salt: 12345,
    };

    it('handle 403 geoblock response with specific error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const result = await submitClobOrder({
        headers: mockHeaders,
        clobOrder: mockClobOrder,
      });

      expect(result).toEqual({
        success: false,
        error: 'You are unable to access this provider.',
        errorCode: 403,
      });
    });

    it('handle non-403 error with JSON error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({
          error: 'Invalid order parameters',
        }),
      });

      const result = await submitClobOrder({
        headers: mockHeaders,
        clobOrder: mockClobOrder,
      });

      expect(result).toEqual({
        success: false,
        error: 'Invalid order parameters',
      });
    });

    it('handle non-403 error without JSON error field, use statusText', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({}),
      });

      const result = await submitClobOrder({
        headers: mockHeaders,
        clobOrder: mockClobOrder,
      });

      expect(result).toEqual({
        success: false,
        error: 'Internal Server Error',
      });
    });
  });
});
