import {
  adaptAccountStateFromSDK,
  adaptHyperLiquidLedgerUpdateToUserHistoryItem,
  adaptOrderToSDK,
  RawHyperLiquidLedgerUpdate,
} from './hyperLiquidAdapter';
import type { OrderParams } from '../controllers/types';
import type {
  AssetPosition,
  SpotBalance,
  ClearinghouseStateResponse,
  SpotClearinghouseStateResponse,
} from '../types/hyperliquid-types';

// Helper functions for test data creation
const createTestLedgerUpdate = (
  overrides: Partial<RawHyperLiquidLedgerUpdate> = {},
): RawHyperLiquidLedgerUpdate => ({
  hash: '0x123',
  time: 1640995200000,
  delta: {
    type: 'deposit',
    usdc: '100.50',
  },
  ...overrides,
});

const createTestOrder = (
  overrides: Partial<OrderParams> = {},
): OrderParams => ({
  coin: 'BTC',
  isBuy: true,
  size: '0.1',
  orderType: 'market',
  ...overrides,
});

const createTestPerpsState = (
  overrides: Partial<ClearinghouseStateResponse> = {},
): ClearinghouseStateResponse => ({
  crossMarginSummary: {
    accountValue: '1000.50',
    totalMarginUsed: '300.25',
    totalNtlPos: '1000.50',
    totalRawUsd: '1000.50',
  },
  marginSummary: {
    accountValue: '1000.50',
    totalNtlPos: '1000.50',
    totalRawUsd: '1000.50',
    totalMarginUsed: '300.25',
  },
  crossMaintenanceMarginUsed: '100.0',
  time: Date.now(),
  withdrawable: '700.25',
  assetPositions: [],
  ...overrides,
});

const createTestSpotState = (
  overrides: Partial<SpotClearinghouseStateResponse> = {},
): SpotClearinghouseStateResponse => ({
  balances: [],
  ...overrides,
});

describe('hyperLiquidAdapter', () => {
  let coinToAssetId: Map<string, number>;

  beforeEach(() => {
    coinToAssetId = new Map([
      ['BTC', 0],
      ['ETH', 1],
      ['SOL', 2],
    ]);
    jest.clearAllMocks();
  });

  describe('adaptHyperLiquidLedgerUpdateToUserHistoryItem', () => {
    it('transforms deposit updates to history items', () => {
      const rawUpdates = [
        createTestLedgerUpdate({
          hash: '0x123',
          delta: { type: 'deposit', usdc: '100.50' },
        }),
      ];

      const result = adaptHyperLiquidLedgerUpdateToUserHistoryItem(rawUpdates);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'history-0x123',
        timestamp: 1640995200000,
        amount: '100.5',
        asset: 'USDC',
        txHash: '0x123',
        status: 'completed',
        type: 'deposit',
        details: {
          source: '',
          bridgeContract: undefined,
          recipient: undefined,
          blockNumber: undefined,
          chainId: undefined,
          synthetic: undefined,
        },
      });
    });

    it('transforms withdrawal updates to history items', () => {
      const rawUpdates = [
        createTestLedgerUpdate({
          hash: '0x456',
          delta: { type: 'withdraw', usdc: '50.25', coin: 'ETH' },
        }),
      ];

      const result = adaptHyperLiquidLedgerUpdateToUserHistoryItem(rawUpdates);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'history-0x456',
        timestamp: 1640995200000,
        amount: '50.25',
        asset: 'ETH',
        txHash: '0x456',
        status: 'completed',
        type: 'withdrawal',
        details: {
          source: '',
          bridgeContract: undefined,
          recipient: undefined,
          blockNumber: undefined,
          chainId: undefined,
          synthetic: undefined,
        },
      });
    });

    it('filters out non-deposit/withdrawal updates', () => {
      const rawUpdates = [
        createTestLedgerUpdate({ delta: { type: 'deposit', usdc: '100' } }),
        createTestLedgerUpdate({
          hash: '0x456',
          delta: { type: 'transfer', usdc: '50' },
        }),
        createTestLedgerUpdate({
          hash: '0x789',
          delta: { type: 'withdraw', usdc: '25' },
        }),
      ];

      const result = adaptHyperLiquidLedgerUpdateToUserHistoryItem(rawUpdates);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('deposit');
      expect(result[1].type).toBe('withdrawal');
    });

    it('handles empty input arrays', () => {
      const result = adaptHyperLiquidLedgerUpdateToUserHistoryItem([]);

      expect(result).toEqual([]);
    });

    it('converts negative amounts to positive values', () => {
      const rawUpdates = [
        createTestLedgerUpdate({
          delta: { type: 'withdraw', usdc: '-100.50' },
        }),
      ];

      const result = adaptHyperLiquidLedgerUpdateToUserHistoryItem(rawUpdates);

      expect(result[0].amount).toBe('100.5');
    });

    it('handles updates without coin field', () => {
      const rawUpdates = [
        createTestLedgerUpdate({
          delta: { type: 'deposit', usdc: '100' },
        }),
      ];

      const result = adaptHyperLiquidLedgerUpdateToUserHistoryItem(rawUpdates);

      expect(result[0].asset).toBe('USDC');
    });
  });

  describe('adaptOrderToSDK', () => {
    it('converts market buy order to SDK format', () => {
      const order = createTestOrder({
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      });

      const result = adaptOrderToSDK(order, coinToAssetId);

      expect(result).toEqual({
        a: 0,
        b: true,
        p: '0',
        s: '0.1',
        r: false,
        t: { limit: { tif: 'Ioc' } },
        c: undefined,
      });
    });

    it('converts limit sell order to SDK format', () => {
      const order = createTestOrder({
        coin: 'ETH',
        isBuy: false,
        size: '2.5',
        orderType: 'limit',
        price: '2000',
        reduceOnly: true,
        clientOrderId: '0x123abc',
      });

      const result = adaptOrderToSDK(order, coinToAssetId);

      expect(result).toEqual({
        a: 1,
        b: false,
        p: '2000',
        s: '2.5',
        r: true,
        t: { limit: { tif: 'Gtc' } },
        c: '0x123abc',
      });
    });

    it('uses default price for limit orders without price', () => {
      const order = createTestOrder({
        coin: 'SOL',
        isBuy: true,
        size: '10',
        orderType: 'limit',
      });

      const result = adaptOrderToSDK(order, coinToAssetId);

      expect(result.p).toBe('0');
      expect(result.t).toEqual({ limit: { tif: 'Gtc' } });
    });

    it('ignores non-hex client order IDs', () => {
      const order = createTestOrder({
        clientOrderId: 'not-hex',
      });

      const result = adaptOrderToSDK(order, coinToAssetId);

      expect(result.c).toBeUndefined();
    });

    it('throws error for unknown coin symbols', () => {
      const order = createTestOrder({
        coin: 'UNKNOWN',
      });

      expect(() => adaptOrderToSDK(order, coinToAssetId)).toThrow(
        'Unknown asset: UNKNOWN',
      );
    });

    it('handles empty client order ID', () => {
      const order = createTestOrder({
        clientOrderId: '',
      });

      const result = adaptOrderToSDK(order, coinToAssetId);

      expect(result.c).toBeUndefined();
    });

    it('handles undefined client order ID', () => {
      const order = createTestOrder({
        clientOrderId: undefined,
      });

      const result = adaptOrderToSDK(order, coinToAssetId);

      expect(result.c).toBeUndefined();
    });
  });

  describe('adaptAccountStateFromSDK', () => {
    it('converts perps-only account state', () => {
      const perpsState = createTestPerpsState({
        assetPositions: [
          {
            position: {
              coin: 'BTC',
              szi: '1.0',
              leverage: { type: 'cross', value: 2 },
              entryPx: '50000',
              positionValue: '50000',
              unrealizedPnl: '50.0',
              returnOnEquity: '0.1',
              liquidationPx: '40000',
              marginUsed: '250',
              maxLeverage: 100,
              cumFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
            },
            type: 'oneWay',
          },
          {
            position: {
              coin: 'ETH',
              szi: '0.5',
              leverage: { type: 'cross', value: 3 },
              entryPx: '3000',
              positionValue: '1500',
              unrealizedPnl: '-25.5',
              returnOnEquity: '-0.02',
              liquidationPx: '2500',
              marginUsed: '50.25',
              maxLeverage: 50,
              cumFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
            },
            type: 'oneWay',
          },
        ],
      });

      const result = adaptAccountStateFromSDK(perpsState);

      expect(result).toEqual({
        availableBalance: '700.25',
        totalBalance: '1000.5',
        marginUsed: '300.25',
        unrealizedPnl: '24.5',
        returnOnEquity: '8.0',
        totalValue: '1000.50',
      });
    });

    it('converts account state with spot and perps balances', () => {
      const perpsState = createTestPerpsState({
        crossMarginSummary: {
          accountValue: '500.0',
          totalMarginUsed: '150.0',
          totalNtlPos: '500.0',
          totalRawUsd: '500.0',
        },
        marginSummary: {
          accountValue: '500.0',
          totalNtlPos: '500.0',
          totalRawUsd: '500.0',
          totalMarginUsed: '150.0',
        },
        crossMaintenanceMarginUsed: '50.0',
        withdrawable: '350.0',
        assetPositions: [
          {
            position: { unrealizedPnl: '100.0' },
            type: 'perp',
          } as unknown as AssetPosition,
        ],
      });

      const spotState = createTestSpotState({
        balances: [
          { total: '200.0' },
          { total: '300.5' },
        ] as unknown as SpotBalance[],
      });

      const result = adaptAccountStateFromSDK(perpsState, spotState);

      expect(result).toEqual({
        availableBalance: '350.0',
        totalBalance: '1000.5',
        marginUsed: '150.0',
        unrealizedPnl: '100',
        returnOnEquity: '0.0',
        totalValue: '500.0',
      });
    });

    it('handles missing spot balance values', () => {
      const perpsState = createTestPerpsState({
        crossMarginSummary: {
          accountValue: '1000.0',
          totalMarginUsed: '200.0',
          totalNtlPos: '1000.0',
          totalRawUsd: '1000.0',
        },
        marginSummary: {
          accountValue: '1000.0',
          totalNtlPos: '1000.0',
          totalRawUsd: '1000.0',
          totalMarginUsed: '200.0',
        },
        crossMaintenanceMarginUsed: '80.0',
        withdrawable: '800.0',
        assetPositions: [],
      });

      const spotState = createTestSpotState({
        balances: [
          { total: undefined },
          {} as SpotBalance,
        ] as unknown as SpotBalance[],
      });

      const result = adaptAccountStateFromSDK(perpsState, spotState);

      expect(result).toEqual({
        availableBalance: '800.0',
        totalBalance: '1000',
        marginUsed: '200.0',
        unrealizedPnl: '0',
        returnOnEquity: '0.0',
        totalValue: '1000.0',
      });
    });

    it('handles empty asset positions array', () => {
      const perpsState = createTestPerpsState({
        crossMarginSummary: {
          accountValue: '1000.0',
          totalMarginUsed: '0',
          totalNtlPos: '1000.0',
          totalRawUsd: '1000.0',
        },
        marginSummary: {
          accountValue: '1000.0',
          totalNtlPos: '1000.0',
          totalRawUsd: '1000.0',
          totalMarginUsed: '0',
        },
        crossMaintenanceMarginUsed: '0',
        withdrawable: '1000.0',
        assetPositions: [],
      });

      const result = adaptAccountStateFromSDK(perpsState);

      expect(result.unrealizedPnl).toBe('0');
      expect(result.returnOnEquity).toBe('0.0');
    });

    it('handles undefined spot state', () => {
      const perpsState = createTestPerpsState();

      const result = adaptAccountStateFromSDK(perpsState, undefined);

      expect(result.totalBalance).toBe('1000.5');
    });

    it('handles null spot state', () => {
      const perpsState = createTestPerpsState();

      const result = adaptAccountStateFromSDK(perpsState, null);

      expect(result.totalBalance).toBe('1000.5');
    });

    it('handles positions without returnOnEquity', () => {
      const perpsState = createTestPerpsState({
        assetPositions: [
          {
            position: {
              unrealizedPnl: '50.0',
              // No returnOnEquity field
            },
            type: 'oneWay',
          } as unknown as AssetPosition,
        ],
      });

      const result = adaptAccountStateFromSDK(perpsState);

      expect(result.returnOnEquity).toBe('0.0');
    });
  });
});
