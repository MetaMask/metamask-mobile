/**
 * Unit tests for HyperLiquid SDK adapter utilities
 */

import {
  adaptOrderToSDK,
  adaptOrderFromSDK,
  adaptPositionFromSDK,
  adaptMarketFromSDK,
  adaptAccountStateFromSDK,
  buildAssetMapping,
  formatHyperLiquidPrice,
  formatHyperLiquidSize,
  calculatePositionSize,
} from './hyperLiquidAdapter';
import type { OrderParams } from '../controllers/types';
import type {
  AssetPosition,
  SpotBalance,
  ClearinghouseStateResponse,
  SpotClearinghouseStateResponse,
  PerpsUniverse,
  FrontendOrder,
} from '../types/hyperliquid-types';

// Mock the isHexString utility
jest.mock('@metamask/utils', () => ({
  isHexString: (value: string) => value.startsWith('0x'),
}));

describe('hyperLiquidAdapter', () => {
  describe('adaptOrderToSDK', () => {
    let coinToAssetId: Map<string, number>;

    beforeEach(() => {
      coinToAssetId = new Map([
        ['BTC', 0],
        ['ETH', 1],
        ['SOL', 2],
      ]);
    });

    it('should convert basic market order correctly', () => {
      const order: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };

      const result = adaptOrderToSDK(order, coinToAssetId);

      expect(result).toEqual({
        a: 0, // BTC asset ID
        b: true, // buy order
        p: '0', // market order price
        s: '0.1', // size
        r: false, // not reduce only
        t: { limit: { tif: 'FrontendMarket' } }, // market order type
        c: undefined, // no client order ID
      });
    });

    it('should convert limit order correctly', () => {
      const order: OrderParams = {
        coin: 'ETH',
        isBuy: false,
        size: '2.5',
        orderType: 'limit',
        price: '2000',
        reduceOnly: true,
        clientOrderId: '0x123abc',
      };

      const result = adaptOrderToSDK(order, coinToAssetId);

      expect(result).toEqual({
        a: 1, // ETH asset ID
        b: false, // sell order
        p: '2000', // limit price
        s: '2.5', // size
        r: true, // reduce only
        t: { limit: { tif: 'Gtc' } }, // limit order type
        c: '0x123abc', // client order ID
      });
    });

    it('should handle missing price for limit order', () => {
      const order: OrderParams = {
        coin: 'SOL',
        isBuy: true,
        size: '10',
        orderType: 'limit',
      };

      const result = adaptOrderToSDK(order, coinToAssetId);

      expect(result.p).toBe('0');
      expect(result.t).toEqual({ limit: { tif: 'Gtc' } });
    });

    it('should handle non-hex client order ID', () => {
      const order: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '1',
        orderType: 'market',
        clientOrderId: 'not-hex',
      };

      const result = adaptOrderToSDK(order, coinToAssetId);

      expect(result.c).toBeUndefined();
    });

    it('should throw error for unknown coin', () => {
      const order: OrderParams = {
        coin: 'UNKNOWN',
        isBuy: true,
        size: '1',
        orderType: 'market',
      };

      expect(() => adaptOrderToSDK(order, coinToAssetId)).toThrow(
        'Asset UNKNOWN not found in asset mapping',
      );
    });
  });

  describe('adaptOrderFromSDK', () => {
    it('should convert basic buy order from SDK', () => {
      const frontendOrder: FrontendOrder = {
        oid: 12345,
        coin: 'BTC',
        side: 'B',
        sz: '0.5',
        origSz: '1.0',
        limitPx: '50000',
        orderType: 'Limit',
        timestamp: 1234567890000,
        isTrigger: false,
        reduceOnly: false,
        triggerCondition: '',
        triggerPx: '',
        children: [],
        isPositionTpsl: false,
        tif: null,
        cloid: null,
      };

      const result = adaptOrderFromSDK(frontendOrder);

      expect(result).toEqual({
        orderId: '12345',
        symbol: 'BTC',
        side: 'buy',
        orderType: 'limit',
        size: '0.5',
        originalSize: '1.0',
        price: '50000',
        filledSize: '0.5',
        remainingSize: '0.5',
        status: 'open',
        timestamp: 1234567890000,
        detailedOrderType: 'Limit',
        isTrigger: false,
        reduceOnly: false,
      });
    });

    it('should convert sell order from SDK', () => {
      const frontendOrder: FrontendOrder = {
        oid: 54321,
        coin: 'ETH',
        side: 'A',
        sz: '2.0',
        origSz: '2.0',
        limitPx: '3000',
        orderType: 'Limit',
        timestamp: 1234567890000,
        isTrigger: false,
        reduceOnly: true,
        triggerCondition: '',
        triggerPx: '',
        children: [],
        isPositionTpsl: false,
        tif: null,
        cloid: null,
      };

      const result = adaptOrderFromSDK(frontendOrder);

      expect(result).toEqual({
        orderId: '54321',
        symbol: 'ETH',
        side: 'sell',
        orderType: 'limit',
        size: '2.0',
        originalSize: '2.0',
        price: '3000',
        filledSize: '0',
        remainingSize: '2.0',
        status: 'open',
        timestamp: 1234567890000,
        detailedOrderType: 'Limit',
        isTrigger: false,
        reduceOnly: true,
      });
    });

    it('should handle market order', () => {
      const frontendOrder: FrontendOrder = {
        oid: 99999,
        coin: 'SOL',
        side: 'B',
        sz: '10',
        origSz: '10',
        orderType: 'Market',
        timestamp: 1234567890000,
        isTrigger: false,
        reduceOnly: false,
        triggerCondition: '',
        triggerPx: '',
        limitPx: '',
        children: [],
        isPositionTpsl: false,
        tif: null,
        cloid: null,
      };

      const result = adaptOrderFromSDK(frontendOrder);

      expect(result).toEqual({
        orderId: '99999',
        symbol: 'SOL',
        side: 'buy',
        orderType: 'market',
        size: '10',
        originalSize: '10',
        price: '0',
        filledSize: '0',
        remainingSize: '10',
        status: 'open',
        timestamp: 1234567890000,
        detailedOrderType: 'Market',
        isTrigger: false,
        reduceOnly: false,
      });
    });

    it('should handle trigger order with triggerPx', () => {
      const frontendOrder: FrontendOrder = {
        oid: 11111,
        coin: 'AVAX',
        side: 'A',
        sz: '5',
        origSz: '5',
        triggerPx: '25.50',
        orderType: 'Stop Market',
        timestamp: 1234567890000,
        isTrigger: true,
        reduceOnly: true,
        triggerCondition: '',
        limitPx: '',
        children: [],
        isPositionTpsl: false,
        tif: null,
        cloid: null,
      };

      const result = adaptOrderFromSDK(frontendOrder);

      expect(result).toEqual({
        orderId: '11111',
        symbol: 'AVAX',
        side: 'sell',
        orderType: 'market',
        size: '5',
        originalSize: '5',
        price: '25.50',
        filledSize: '0',
        remainingSize: '5',
        status: 'open',
        timestamp: 1234567890000,
        detailedOrderType: 'Stop Market',
        isTrigger: true,
        reduceOnly: true,
      });
    });

    it('converts order with child orders including TP and SL order IDs', () => {
      const frontendOrder: FrontendOrder = {
        oid: 22222,
        coin: 'UNI',
        side: 'B',
        sz: '100',
        origSz: '100',
        limitPx: '10',
        orderType: 'Limit',
        timestamp: 1234567890000,
        isTrigger: false,
        reduceOnly: false,
        triggerCondition: '',
        triggerPx: '',
        isPositionTpsl: false,
        tif: null,
        cloid: null,
        children: [
          {
            oid: 22223,
            coin: 'UNI',
            side: 'A',
            sz: '100',
            origSz: '100',
            triggerPx: '12',
            orderType: 'Take Profit Market',
            timestamp: 1234567890001,
            isTrigger: true,
            reduceOnly: true,
            triggerCondition: '',
            limitPx: '',
            children: [],
            isPositionTpsl: true,
            tif: null,
            cloid: null,
          },
          {
            oid: 22224,
            coin: 'UNI',
            side: 'A',
            sz: '100',
            origSz: '100',
            triggerPx: '8',
            orderType: 'Stop Market',
            timestamp: 1234567890002,
            isTrigger: true,
            reduceOnly: true,
            triggerCondition: '',
            limitPx: '',
            children: [],
            isPositionTpsl: true,
            tif: null,
            cloid: null,
          },
        ],
      };

      const result = adaptOrderFromSDK(frontendOrder);

      expect(result).toEqual({
        orderId: '22222',
        symbol: 'UNI',
        side: 'buy',
        orderType: 'limit',
        size: '100',
        originalSize: '100',
        price: '10',
        filledSize: '0',
        remainingSize: '100',
        status: 'open',
        timestamp: 1234567890000,
        detailedOrderType: 'Limit',
        isTrigger: false,
        reduceOnly: false,
        takeProfitPrice: '12',
        takeProfitOrderId: '22223',
        stopLossPrice: '8',
        stopLossOrderId: '22224',
      });
    });

    it('should handle partially filled order', () => {
      const frontendOrder: FrontendOrder = {
        oid: 33333,
        coin: 'LINK',
        side: 'B',
        sz: '30',
        origSz: '100',
        limitPx: '15',
        orderType: 'Limit',
        timestamp: 1234567890000,
        isTrigger: false,
        reduceOnly: false,
        triggerCondition: '',
        triggerPx: '',
        children: [],
        isPositionTpsl: false,
        tif: null,
        cloid: null,
      };

      const result = adaptOrderFromSDK(frontendOrder);

      expect(result).toEqual({
        orderId: '33333',
        symbol: 'LINK',
        side: 'buy',
        orderType: 'limit',
        size: '30',
        originalSize: '100',
        price: '15',
        filledSize: '70', // 100 - 30
        remainingSize: '30',
        status: 'open',
        timestamp: 1234567890000,
        detailedOrderType: 'Limit',
        isTrigger: false,
        reduceOnly: false,
      });
    });

    it('should handle order without origSz', () => {
      const frontendOrder: FrontendOrder = {
        oid: 44444,
        coin: 'MATIC',
        side: 'A',
        sz: '500',
        limitPx: '1.2',
        orderType: 'Limit',
        timestamp: 1234567890000,
        isTrigger: false,
        reduceOnly: false,
        origSz: '500',
        triggerCondition: '',
        triggerPx: '',
        children: [],
        isPositionTpsl: false,
        tif: null,
        cloid: null,
      };

      const result = adaptOrderFromSDK(frontendOrder);

      expect(result).toEqual({
        orderId: '44444',
        symbol: 'MATIC',
        side: 'sell',
        orderType: 'limit',
        size: '500',
        originalSize: '500', // Uses sz as default
        price: '1.2',
        filledSize: '0',
        remainingSize: '500',
        status: 'open',
        timestamp: 1234567890000,
        detailedOrderType: 'Limit',
        isTrigger: false,
        reduceOnly: false,
      });
    });

    it('should determine order type from orderType string', () => {
      const frontendOrder: FrontendOrder = {
        oid: 55555,
        coin: 'DOT',
        side: 'B',
        sz: '20',
        origSz: '20',
        orderType: 'Limit', // 'Limit at 5.5' is not a valid OrderType
        limitPx: '5.5',
        timestamp: 1234567890000,
        isTrigger: false,
        reduceOnly: false,
        triggerCondition: '',
        triggerPx: '',
        children: [],
        isPositionTpsl: false,
        tif: null,
        cloid: null,
      };

      const result = adaptOrderFromSDK(frontendOrder);

      expect(result.orderType).toBe('limit');
      expect(result.price).toBe('5.5');
    });

    it('converts child order with limitPx instead of triggerPx', () => {
      const frontendOrder: FrontendOrder = {
        oid: 66666,
        coin: 'ADA',
        side: 'B',
        sz: '1000',
        origSz: '1000',
        limitPx: '0.5',
        orderType: 'Limit',
        timestamp: 1234567890000,
        isTrigger: false,
        reduceOnly: false,
        triggerCondition: '',
        triggerPx: '',
        isPositionTpsl: false,
        tif: null,
        cloid: null,
        children: [
          {
            oid: 66667,
            coin: 'ADA',
            side: 'A',
            sz: '1000',
            origSz: '1000',
            limitPx: '0.6', // Using limitPx instead of triggerPx
            orderType: 'Take Profit Limit',
            timestamp: 1234567890001,
            isTrigger: true,
            reduceOnly: true,
            triggerCondition: '',
            triggerPx: '',
            children: [],
            isPositionTpsl: true,
            tif: null,
            cloid: null,
          },
        ],
      };

      const result = adaptOrderFromSDK(frontendOrder);

      expect(result.takeProfitPrice).toBe('0.6');
      expect(result.takeProfitOrderId).toBe('66667');
      expect(result.stopLossPrice).toBeUndefined();
      expect(result.stopLossOrderId).toBeUndefined();
    });

    it('converts order with only take profit child order', () => {
      const frontendOrder: FrontendOrder = {
        oid: 77777,
        coin: 'BNB',
        side: 'B',
        sz: '50',
        origSz: '50',
        limitPx: '300',
        orderType: 'Limit',
        timestamp: 1234567890000,
        isTrigger: false,
        reduceOnly: false,
        triggerCondition: '',
        triggerPx: '',
        isPositionTpsl: false,
        tif: null,
        cloid: null,
        children: [
          {
            oid: 77778,
            coin: 'BNB',
            side: 'A',
            sz: '50',
            origSz: '50',
            triggerPx: '350',
            orderType: 'Take Profit Market',
            timestamp: 1234567890001,
            isTrigger: true,
            reduceOnly: true,
            triggerCondition: '',
            limitPx: '',
            children: [],
            isPositionTpsl: true,
            tif: null,
            cloid: null,
          },
        ],
      };

      const result = adaptOrderFromSDK(frontendOrder);

      expect(result.takeProfitPrice).toBe('350');
      expect(result.takeProfitOrderId).toBe('77778');
      expect(result.stopLossPrice).toBeUndefined();
      expect(result.stopLossOrderId).toBeUndefined();
    });

    it('converts order with only stop loss child order', () => {
      const frontendOrder: FrontendOrder = {
        oid: 88888,
        coin: 'XRP',
        side: 'B',
        sz: '1000',
        origSz: '1000',
        limitPx: '0.5',
        orderType: 'Limit',
        timestamp: 1234567890000,
        isTrigger: false,
        reduceOnly: false,
        triggerCondition: '',
        triggerPx: '',
        isPositionTpsl: false,
        tif: null,
        cloid: null,
        children: [
          {
            oid: 88889,
            coin: 'XRP',
            side: 'A',
            sz: '1000',
            origSz: '1000',
            triggerPx: '0.4',
            orderType: 'Stop Market',
            timestamp: 1234567890001,
            isTrigger: true,
            reduceOnly: true,
            triggerCondition: '',
            limitPx: '',
            children: [],
            isPositionTpsl: true,
            tif: null,
            cloid: null,
          },
        ],
      };

      const result = adaptOrderFromSDK(frontendOrder);

      expect(result.takeProfitPrice).toBeUndefined();
      expect(result.takeProfitOrderId).toBeUndefined();
      expect(result.stopLossPrice).toBe('0.4');
      expect(result.stopLossOrderId).toBe('88889');
    });
  });

  describe('adaptPositionFromSDK', () => {
    it('should convert asset position correctly', () => {
      const assetPosition: AssetPosition = {
        position: {
          coin: 'BTC',
          szi: '1.5',
          entryPx: '50000',
          positionValue: '75000',
          unrealizedPnl: '2500',
          marginUsed: '25000',
          leverage: { type: 'cross', value: 3 },
          liquidationPx: '40000',
          maxLeverage: 100,
          returnOnEquity: '10.0',
          cumFunding: {
            allTime: '100',
            sinceOpen: '50',
            sinceChange: '25',
          },
        },
        type: 'oneWay',
      };

      const result = adaptPositionFromSDK(assetPosition);

      expect(result).toEqual({
        coin: 'BTC',
        size: '1.5',
        entryPrice: '50000',
        positionValue: '75000',
        unrealizedPnl: '2500',
        marginUsed: '25000',
        leverage: { type: 'cross', value: 3 },
        liquidationPrice: '40000',
        maxLeverage: 100,
        returnOnEquity: '10.0',
        cumulativeFunding: {
          allTime: '100',
          sinceOpen: '50',
          sinceChange: '25',
        },
        takeProfitCount: 0,
        stopLossCount: 0,
      });
    });
  });

  describe('adaptMarketFromSDK', () => {
    it('should convert market info correctly', () => {
      const sdkMarket: PerpsUniverse = {
        name: 'BTC',
        szDecimals: 5,
        maxLeverage: 50,
        marginTableId: 1,
        onlyIsolated: true,
        isDelisted: true,
      };

      const result = adaptMarketFromSDK(sdkMarket);

      expect(result).toEqual({
        name: 'BTC',
        szDecimals: 5,
        maxLeverage: 50,
        marginTableId: 1,
        onlyIsolated: true,
        isDelisted: true,
      });
    });

    it('should handle optional fields', () => {
      const sdkMarket: PerpsUniverse = {
        name: 'ETH',
        szDecimals: 4,
        maxLeverage: 25,
        marginTableId: 2,
      };

      const result = adaptMarketFromSDK(sdkMarket);

      expect(result).toEqual({
        name: 'ETH',
        szDecimals: 4,
        maxLeverage: 25,
        marginTableId: 2,
        onlyIsolated: undefined,
        isDelisted: undefined,
      });
    });
  });

  describe('adaptAccountStateFromSDK', () => {
    it('should convert account state with perps only', () => {
      const perpsState: ClearinghouseStateResponse = {
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
      };

      const result = adaptAccountStateFromSDK(perpsState);

      expect(result).toEqual({
        availableBalance: '700.25',
        marginUsed: '300.25',
        unrealizedPnl: '24.5', // 50.0 + (-25.5)
        returnOnEquity: '8.0', // Calculated from weighted return and margin
        totalBalance: '1000.5', // Perps only (no spot balance provided)
      });
    });

    it('should convert account state with spot and perps', () => {
      const perpsState: ClearinghouseStateResponse = {
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
        time: Date.now(),
        withdrawable: '350.0',
        assetPositions: [
          {
            position: { unrealizedPnl: '100.0' },
            type: 'perp',
          } as unknown as AssetPosition,
        ],
      };

      const spotState: SpotClearinghouseStateResponse = {
        balances: [
          { total: '200.0' },
          { total: '300.5' },
        ] as unknown as SpotBalance[],
      };

      const result = adaptAccountStateFromSDK(perpsState, spotState);

      expect(result).toEqual({
        availableBalance: '350.0',
        marginUsed: '150.0',
        unrealizedPnl: '100',
        returnOnEquity: '0.0',
        totalBalance: '1000.5',
      });
    });

    it('should handle missing spot balances', () => {
      const perpsState: ClearinghouseStateResponse = {
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
        time: Date.now(),
        withdrawable: '800.0',
        assetPositions: [],
      };

      const spotState: SpotClearinghouseStateResponse = {
        balances: [
          { total: undefined },
          {} as SpotBalance, // no total field
        ] as unknown as SpotBalance[],
      };

      const result = adaptAccountStateFromSDK(perpsState, spotState);

      expect(result).toEqual({
        availableBalance: '800.0',
        marginUsed: '200.0',
        unrealizedPnl: '0',
        returnOnEquity: '0.0',
        totalBalance: '1000',
      });
    });

    it('should handle empty asset positions', () => {
      const perpsState: ClearinghouseStateResponse = {
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
        time: Date.now(),
        withdrawable: '1000.0',
        assetPositions: [],
      };

      const result = adaptAccountStateFromSDK(perpsState);

      expect(result.unrealizedPnl).toBe('0');
    });
  });

  describe('buildAssetMapping', () => {
    it('should create bidirectional mappings', () => {
      const metaUniverse: PerpsUniverse[] = [
        { name: 'BTC', szDecimals: 5, maxLeverage: 50, marginTableId: 1 },
        { name: 'ETH', szDecimals: 4, maxLeverage: 25, marginTableId: 2 },
        { name: 'SOL', szDecimals: 3, maxLeverage: 20, marginTableId: 3 },
      ];

      const result = buildAssetMapping({
        metaUniverse,
        perpDexIndex: 0,
      });

      expect(result.coinToAssetId.get('BTC')).toBe(0);
      expect(result.coinToAssetId.get('ETH')).toBe(1);
      expect(result.coinToAssetId.get('SOL')).toBe(2);

      expect(result.assetIdToCoin.get(0)).toBe('BTC');
      expect(result.assetIdToCoin.get(1)).toBe('ETH');
      expect(result.assetIdToCoin.get(2)).toBe('SOL');
    });

    it('should handle empty universe', () => {
      const result = buildAssetMapping({
        metaUniverse: [],
        perpDexIndex: 0,
      });

      expect(result.coinToAssetId.size).toBe(0);
      expect(result.assetIdToCoin.size).toBe(0);
    });
  });

  describe('formatHyperLiquidPrice', () => {
    it('should format integer prices correctly', () => {
      expect(formatHyperLiquidPrice({ price: 100, szDecimals: 3 })).toBe('100');
      expect(formatHyperLiquidPrice({ price: '2000', szDecimals: 5 })).toBe(
        '2000',
      );
    });

    it('should respect max decimal places (6 - szDecimals)', () => {
      // szDecimals = 3, so max 3 decimal places
      expect(formatHyperLiquidPrice({ price: 100.12345, szDecimals: 3 })).toBe(
        '100.12',
      );

      // szDecimals = 5, so max 1 decimal place
      expect(formatHyperLiquidPrice({ price: 50.789, szDecimals: 5 })).toBe(
        '50.8',
      );

      // szDecimals = 0, so max 6 decimal places
      expect(
        formatHyperLiquidPrice({ price: 1.123456789, szDecimals: 0 }),
      ).toBe('1.1235');
    });

    it('should remove trailing zeros', () => {
      expect(formatHyperLiquidPrice({ price: 100.1, szDecimals: 3 })).toBe(
        '100.1',
      );
      expect(formatHyperLiquidPrice({ price: '50.000', szDecimals: 2 })).toBe(
        '50',
      );
    });

    it('should respect max 5 significant figures', () => {
      // 123.456 has 6 significant figures, should be reduced
      expect(formatHyperLiquidPrice({ price: 123.456, szDecimals: 0 })).toBe(
        '123.46',
      );

      // 12345.6 has 6 significant figures, should be reduced
      expect(formatHyperLiquidPrice({ price: 12345.6, szDecimals: 0 })).toBe(
        '12346',
      );

      // 12.345 has 5 significant figures, should remain unchanged
      expect(formatHyperLiquidPrice({ price: 12.345, szDecimals: 0 })).toBe(
        '12.345',
      );
    });

    it('should handle edge cases with significant figures', () => {
      // Large integer with many digits
      expect(formatHyperLiquidPrice({ price: 123456, szDecimals: 0 })).toBe(
        '123456',
      );

      // Small decimal with many significant figures
      expect(formatHyperLiquidPrice({ price: 0.123456, szDecimals: 0 })).toBe(
        '0.1235',
      );
    });

    it('should handle string inputs', () => {
      expect(formatHyperLiquidPrice({ price: '100.25', szDecimals: 3 })).toBe(
        '100.25',
      );
      expect(formatHyperLiquidPrice({ price: '0.123456', szDecimals: 2 })).toBe(
        '0.1235',
      );
    });
  });

  describe('formatHyperLiquidSize', () => {
    it('should format size with asset-specific decimals', () => {
      expect(formatHyperLiquidSize({ size: 1.23456, szDecimals: 3 })).toBe(
        '1.235',
      );
      expect(formatHyperLiquidSize({ size: '10.5', szDecimals: 2 })).toBe(
        '10.5',
      );
      expect(formatHyperLiquidSize({ size: 0.1, szDecimals: 5 })).toBe('0.1');
    });

    it('should remove trailing zeros', () => {
      expect(formatHyperLiquidSize({ size: 1.0, szDecimals: 3 })).toBe('1');
      expect(formatHyperLiquidSize({ size: '2.50000', szDecimals: 5 })).toBe(
        '2.5',
      );
      expect(formatHyperLiquidSize({ size: 10.0, szDecimals: 2 })).toBe('10');
    });

    it('should handle zero and invalid inputs', () => {
      expect(formatHyperLiquidSize({ size: 0, szDecimals: 3 })).toBe('0');
      expect(formatHyperLiquidSize({ size: 'invalid', szDecimals: 2 })).toBe(
        '0',
      );
      expect(formatHyperLiquidSize({ size: NaN, szDecimals: 4 })).toBe('0');
    });

    it('should handle negative sizes', () => {
      expect(formatHyperLiquidSize({ size: -1.234, szDecimals: 2 })).toBe(
        '-1.23',
      );
      expect(formatHyperLiquidSize({ size: '-0.5000', szDecimals: 4 })).toBe(
        '-0.5',
      );
    });

    it('should handle different decimal precisions', () => {
      expect(formatHyperLiquidSize({ size: 1.123456, szDecimals: 0 })).toBe(
        '1',
      );
      expect(formatHyperLiquidSize({ size: 1.123456, szDecimals: 1 })).toBe(
        '1.1',
      );
      expect(formatHyperLiquidSize({ size: 1.123456, szDecimals: 6 })).toBe(
        '1.123456',
      );
    });

    it('should NOT strip trailing zeros from integers (regression test)', () => {
      // Critical: With szDecimals=0, integers ending in 0 should stay intact
      // e.g., 10 tokens should format as "10", not "1"
      expect(formatHyperLiquidSize({ size: 10, szDecimals: 0 })).toBe('10');
      expect(formatHyperLiquidSize({ size: 100, szDecimals: 0 })).toBe('100');
      expect(formatHyperLiquidSize({ size: 20, szDecimals: 0 })).toBe('20');
      expect(formatHyperLiquidSize({ size: 1000, szDecimals: 0 })).toBe('1000');

      // But should still strip zeros after decimal points
      expect(formatHyperLiquidSize({ size: 10.0, szDecimals: 2 })).toBe('10');
      expect(formatHyperLiquidSize({ size: 10.5, szDecimals: 4 })).toBe('10.5');
    });
  });

  describe('calculatePositionSize', () => {
    it('should calculate position size correctly', () => {
      const result = calculatePositionSize({
        usdValue: 1000,
        leverage: 2,
        assetPrice: 50000,
      });

      expect(result).toBe(0.04); // (1000 * 2) / 50000 = 0.04
    });

    it('should handle different leverage values', () => {
      const params = { usdValue: 500, assetPrice: 100 };

      expect(calculatePositionSize({ ...params, leverage: 1 })).toBe(5);
      expect(calculatePositionSize({ ...params, leverage: 5 })).toBe(25);
      expect(calculatePositionSize({ ...params, leverage: 10 })).toBe(50);
    });

    it('should handle fractional results', () => {
      const result = calculatePositionSize({
        usdValue: 333,
        leverage: 3,
        assetPrice: 2000,
      });

      expect(result).toBeCloseTo(0.4995, 4); // (333 * 3) / 2000
    });

    it('should handle edge cases', () => {
      expect(
        calculatePositionSize({
          usdValue: 0,
          leverage: 5,
          assetPrice: 100,
        }),
      ).toBe(0);

      expect(
        calculatePositionSize({
          usdValue: 1000,
          leverage: 0,
          assetPrice: 100,
        }),
      ).toBe(0);

      // Division by zero case - should return Infinity
      expect(
        calculatePositionSize({
          usdValue: 1000,
          leverage: 2,
          assetPrice: 0,
        }),
      ).toBe(Infinity);
    });

    it('should handle very large numbers', () => {
      const result = calculatePositionSize({
        usdValue: 1000000,
        leverage: 100,
        assetPrice: 0.001,
      });

      expect(result).toBe(100000000000); // (1000000 * 100) / 0.001
    });
  });
});
