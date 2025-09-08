import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { Side, type OrderParams, type Position } from '../types';
import {
  approveUSDCAllowance,
  buildMarketOrderCreationArgs,
  calculateMarketPrice,
  createApiKey,
  getContractConfig,
  getMarket,
  getOrderTypedData,
  getPolymarketEndpoints,
  getTickSize,
  priceValid,
} from '../utils/polymarket';
import { PolymarketProvider } from './PolymarketProvider';

// Mock external dependencies
jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
    KeyringController: {
      signTypedMessage: jest.fn(),
    },
  },
}));

jest.mock('../utils/polymarket', () => ({
  getPolymarketEndpoints: jest.fn(() => ({
    DATA_API_ENDPOINT: 'https://data.polymarket.com',
  })),
  getMarket: jest.fn(),
  getTickSize: jest.fn(),
  calculateMarketPrice: jest.fn(),
  buildMarketOrderCreationArgs: jest.fn(),
  approveUSDCAllowance: jest.fn(),
  getContractConfig: jest.fn(),
  getOrderTypedData: jest.fn(),
  priceValid: jest.fn(),
  createApiKey: jest.fn(),
  POLYGON_MAINNET_CHAIN_ID: 137,
}));

const mockFindNetworkClientIdByChainId = Engine.context.NetworkController
  .findNetworkClientIdByChainId as jest.Mock;
const mockSignTypedMessage = Engine.context.KeyringController
  .signTypedMessage as jest.Mock;
const mockGetMarket = getMarket as jest.Mock;
const mockGetTickSize = getTickSize as jest.Mock;
const mockCalculateMarketPrice = calculateMarketPrice as jest.Mock;
const mockBuildMarketOrderCreationArgs =
  buildMarketOrderCreationArgs as jest.Mock;
const mockApproveUSDCAllowance = approveUSDCAllowance as jest.Mock;
const mockGetContractConfig = getContractConfig as jest.Mock;
const mockGetOrderTypedData = getOrderTypedData as jest.Mock;
const mockPriceValid = priceValid as jest.Mock;
const mockCreateApiKey = createApiKey as jest.Mock;

describe('PolymarketProvider', () => {
  const createProvider = (overrides?: { isTestnet?: boolean }) =>
    new PolymarketProvider({
      isTestnet: overrides?.isTestnet,
    });

  const makeApiPosition = (overrides?: Partial<Position>): Position => ({
    providerId: 'external',
    conditionId: 'cond-1',
    icon: 'https://example.com/icon.png',
    title: 'Some Market',
    slug: 'some-market',
    size: 2,
    outcome: 'Yes',
    outcomeIndex: 0,
    cashPnl: 1.23,
    curPrice: 0.45,
    currentValue: 0.9,
    percentPnl: 10,
    initialValue: 0.82,
    avgPrice: 0.41,
    redeemable: false,
    negativeRisk: false,
    endDate: '2025-01-01T00:00:00Z',
    ...overrides,
  });

  it('exposes the correct providerId', () => {
    const provider = createProvider();
    expect(provider.providerId).toBe('polymarket');
  });

  it.skip('connect resolves', async () => {
    const provider = createProvider();
    const result = await provider.getApiKey({
      address: '0x0000000000000000000000000000000000000000',
    });
    // Verify that createApiKey was called
    expect(mockCreateApiKey).toHaveBeenCalledWith({
      address: '0x0000000000000000000000000000000000000000',
    });
    // Verify result is a string (JSON)
    expect(typeof result).toBe('string');
    // Parse and verify structure
    const parsedResult = JSON.parse(result);
    expect(parsedResult).toMatchObject({
      apiKey: 'test-api-key',
      secret: 'test-secret',
      passphrase: 'test-passphrase',
    });
  });

  // it('disconnect resolves', async () => {
  //   const provider = createProvider();
  //   await expect(provider.disconnect()).resolves.toBeUndefined();
  // });

  // it('getMarkets returns an array with some length', async () => {
  //   const provider = createProvider();
  //   const markets = await provider.getMarkets();
  //   expect(Array.isArray(markets)).toBe(true);
  //   expect(markets.length).toBeGreaterThan(0);
  // });

  it('getPositions returns an empty array when API returns none', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue({
        json: jest.fn().mockResolvedValue([]),
      });

    await expect(
      provider.getPositions({
        address: '0x0000000000000000000000000000000000000000',
      }),
    ).resolves.toEqual([]);

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions maps providerId to polymarket on each returned position', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue({
        json: jest
          .fn()
          .mockResolvedValue([
            makeApiPosition({ conditionId: 'c-1', providerId: 'other' }),
            makeApiPosition({ conditionId: 'c-2' }),
          ]),
      });

    const result = await provider.getPositions({
      address: '0x0000000000000000000000000000000000000000',
    });

    expect(result).toHaveLength(2);
    expect(result[0].providerId).toBe('polymarket');
    expect(result[1].providerId).toBe('polymarket');
    expect(result[0].conditionId).toBe('c-1');
    expect(result[1].conditionId).toBe('c-2');

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions uses default pagination and correct query params', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    const mockFetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });
    (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;

    const userAddress = '0x1111111111111111111111111111111111111111';
    await provider.getPositions({ address: userAddress });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledWithUrl = mockFetch.mock.calls[0][0] as string;
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();
    expect(calledWithUrl.startsWith(`${DATA_API_ENDPOINT}/positions?`)).toBe(
      true,
    );
    expect(calledWithUrl).toContain('limit=10');
    expect(calledWithUrl).toContain('offset=0');
    expect(calledWithUrl).toContain(`user=${userAddress}`);

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions applies custom limit and offset in the request', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    const mockFetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });
    (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;

    const userAddress = '0x2222222222222222222222222222222222222222';
    await provider.getPositions({ address: userAddress, limit: 5, offset: 15 });

    const calledWithUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledWithUrl).toContain('limit=5');
    expect(calledWithUrl).toContain('offset=15');
    expect(calledWithUrl).toContain(`user=${userAddress}`);

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions rejects when the network request fails', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockRejectedValue(new Error('network failure'));

    await expect(
      provider.getPositions({
        address: '0x3333333333333333333333333333333333333333',
      }),
    ).rejects.toThrow('network failure');

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  describe.skip('processOrder', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockTransactionMeta: TransactionMeta = {
      id: 'tx-123',
      status: TransactionStatus.unapproved,
      time: Date.now(),
      txParams: {
        from: mockAddress,
        to: '0x0000000000000000000000000000000000000000',
        value: '0x0',
      },
      origin: 'predict',
      chainId: '0x89',
      networkClientId: 'polygon',
    };

    beforeEach(() => {
      jest.clearAllMocks();

      // Setup default mocks
      mockFindNetworkClientIdByChainId.mockReturnValue('polygon');
      mockSignTypedMessage.mockResolvedValue('0xsignature');
      mockCreateApiKey.mockResolvedValue({
        apiKey: 'test-api-key',
        secret: 'test-secret',
        passphrase: 'test-passphrase',
      });

      mockGetMarket.mockResolvedValue({
        neg_risk: false,
        conditionId: 'cond-123',
      });

      mockGetTickSize.mockResolvedValue({
        minimum_tick_size: '0.01',
      });

      mockCalculateMarketPrice.mockResolvedValue(0.5);
      mockPriceValid.mockReturnValue(true);

      mockBuildMarketOrderCreationArgs.mockReturnValue({
        makerAmount: '1000000',
        signature: '',
        salt: '12345',
        maker: mockAddress,
        taker: '0x0000000000000000000000000000000000000000',
        price: '500000000000000000',
        amount: '1000000',
        side: 0,
        orderType: 'FOK',
      });

      mockApproveUSDCAllowance.mockResolvedValue({
        transactionMeta: mockTransactionMeta,
      });

      mockGetContractConfig.mockReturnValue({
        exchange: '0x1234567890123456789012345678901234567890',
        negRiskExchange: '0x0987654321098765432109876543210987654321',
      });

      mockGetOrderTypedData.mockReturnValue({
        types: {},
        primaryType: 'Order',
        domain: {},
        message: {},
      });
    });

    it('successfully places an order and returns correct result', async () => {
      const provider = createProvider();
      const orderParams: OrderParams = {
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        side: Side.BUY,
        amount: 1,
      };

      const result = await provider.processOrder({
        address: mockAddress,
        orderParams,
      });

      expect(result).toMatchObject({
        providerId: 'polymarket',
        orderBody: expect.any(String),
        allowanceTxMeta: mockTransactionMeta,
      });

      // Verify the order body contains expected structure
      const orderBody = JSON.parse(result.orderBody);
      expect(orderBody).toHaveProperty('order');
      expect(orderBody.order).toHaveProperty('signature');
      expect(orderBody.order).toHaveProperty('salt');
      expect(orderBody.order).toHaveProperty('side', Side.BUY);
      expect(orderBody).toHaveProperty('orderType', 'FOK');
    });

    it('calls all required utility functions with correct parameters', async () => {
      const provider = createProvider();
      const orderParams: OrderParams = {
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        side: Side.SELL,
        amount: 2,
      };

      await provider.processOrder({ address: mockAddress, orderParams });

      expect(mockGetMarket).toHaveBeenCalledWith({ conditionId: 'market-123' });
      expect(mockGetTickSize).toHaveBeenCalledWith({ tokenId: 'outcome-456' });
      expect(mockCalculateMarketPrice).toHaveBeenCalledWith(
        'outcome-456',
        Side.SELL,
        2,
        'FOK',
      );
      expect(mockPriceValid).toHaveBeenCalledWith(0.5, '0.01');
      expect(mockBuildMarketOrderCreationArgs).toHaveBeenCalledWith({
        signer: mockAddress,
        maker: mockAddress,
        signatureType: 0,
        userMarketOrder: {
          tokenID: 'outcome-456',
          price: 0.5,
          amount: 2,
          side: Side.SELL,
          orderType: 'FOK',
        },
        roundConfig: expect.any(Object),
      });

      expect(mockSignTypedMessage).toHaveBeenCalledWith(
        { data: expect.any(Object), from: mockAddress },
        'V4',
      );
    });

    it('uses negative risk exchange when market has neg_risk', async () => {
      mockGetMarket.mockResolvedValue({
        neg_risk: true,
        conditionId: 'cond-123',
      });

      const provider = createProvider();
      const orderParams: OrderParams = {
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        side: Side.BUY,
        amount: 1,
      };

      await provider.processOrder({ address: mockAddress, orderParams });

      expect(mockGetOrderTypedData).toHaveBeenCalledWith({
        order: expect.any(Object),
        chainId: 137, // POLYGON_MAINNET_CHAIN_ID
        verifyingContract: '0x0987654321098765432109876543210987654321', // negRiskExchange
      });
    });

    it('throws error when price is invalid', async () => {
      mockPriceValid.mockReturnValue(false);

      const provider = createProvider();
      const orderParams: OrderParams = {
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        side: Side.BUY,
        amount: 1,
      };

      await expect(
        provider.processOrder({ address: mockAddress, orderParams }),
      ).rejects.toThrow('invalid price (0.5), min: 0.01 - max: 0.99');
    });

    it('throws error when getMarket fails', async () => {
      const error = new Error('Market not found');
      mockGetMarket.mockRejectedValue(error);

      const provider = createProvider();
      const orderParams: OrderParams = {
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        side: Side.BUY,
        amount: 1,
      };

      await expect(
        provider.processOrder({ address: mockAddress, orderParams }),
      ).rejects.toThrow('Market not found');
    });

    it('throws error when getTickSize fails', async () => {
      const error = new Error('Tick size error');
      mockGetTickSize.mockRejectedValue(error);

      const provider = createProvider();
      const orderParams: OrderParams = {
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        side: Side.BUY,
        amount: 1,
      };

      await expect(
        provider.processOrder({ address: mockAddress, orderParams }),
      ).rejects.toThrow('Tick size error');
    });

    it('throws error when calculateMarketPrice fails', async () => {
      const error = new Error('Price calculation error');
      mockCalculateMarketPrice.mockRejectedValue(error);

      const provider = createProvider();
      const orderParams: OrderParams = {
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        side: Side.BUY,
        amount: 1,
      };

      await expect(
        provider.processOrder({ address: mockAddress, orderParams }),
      ).rejects.toThrow('Price calculation error');
    });

    it('throws error when buildMarketOrderCreationArgs fails', async () => {
      const error = new Error('Order creation error');
      mockBuildMarketOrderCreationArgs.mockRejectedValue(error);

      const provider = createProvider();
      const orderParams: OrderParams = {
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        side: Side.BUY,
        amount: 1,
      };

      await expect(
        provider.processOrder({ address: mockAddress, orderParams }),
      ).rejects.toThrow('Order creation error');
    });

    it('throws error when approveUSDCAllowance fails', async () => {
      const error = new Error('Allowance approval failed');
      mockApproveUSDCAllowance.mockRejectedValue(error);

      const provider = createProvider();
      const orderParams: OrderParams = {
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        side: Side.BUY,
        amount: 1,
      };

      await expect(
        provider.processOrder({ address: mockAddress, orderParams }),
      ).rejects.toThrow('Allowance approval failed');
    });

    it('throws error when signTypedMessage fails', async () => {
      const error = new Error('Signing failed');
      mockSignTypedMessage.mockRejectedValue(error);

      const provider = createProvider();
      const orderParams: OrderParams = {
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        side: Side.BUY,
        amount: 1,
      };

      await expect(
        provider.processOrder({ address: mockAddress, orderParams }),
      ).rejects.toThrow('Signing failed');
    });

    it('handles testnet configuration', async () => {
      const provider = createProvider({ isTestnet: true });

      const orderParams: OrderParams = {
        marketId: 'market-123',
        outcomeId: 'outcome-456',
        side: Side.BUY,
        amount: 1,
      };

      await provider.processOrder({ address: mockAddress, orderParams });

      // Verify that the provider was created with testnet flag
      expect(provider.providerId).toBe('polymarket');
    });
  });
});
