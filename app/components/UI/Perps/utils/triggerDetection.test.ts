import {
  detectTriggerFromOrder,
  enrichFillsWithTriggerInfo,
  isTakeProfitOrder,
  isStopLossOrder,
  isTPSLOrder,
  isLiquidationOrder,
  createOrderLookupMap,
} from './triggerDetection';
import { Order, OrderFill } from '../controllers/types';

describe('Trigger Detection Utilities', () => {
  describe('isTPSLOrder', () => {
    it('should identify TP/SL orders correctly', () => {
      expect(isTPSLOrder('Take Profit Limit')).toBe(true);
      expect(isTPSLOrder('Take Profit Market')).toBe(true);
      expect(isTPSLOrder('Stop Limit')).toBe(true);
      expect(isTPSLOrder('Stop Market')).toBe(true);
      expect(isTPSLOrder('Limit')).toBe(false);
      expect(isTPSLOrder('Market')).toBe(false);
      expect(isTPSLOrder(undefined)).toBe(false);
      expect(isTPSLOrder('')).toBe(false);
    });
  });

  describe('isTakeProfitOrder', () => {
    it('should identify Take Profit orders correctly', () => {
      expect(isTakeProfitOrder('Take Profit Limit')).toBe(true);
      expect(isTakeProfitOrder('Take Profit Market')).toBe(true);
      expect(isTakeProfitOrder('Stop Limit')).toBe(false);
      expect(isTakeProfitOrder('Stop Market')).toBe(false);
      expect(isTakeProfitOrder('Limit')).toBe(false);
      expect(isTakeProfitOrder(undefined)).toBe(false);
    });
  });

  describe('isStopLossOrder', () => {
    it('should identify Stop Loss orders correctly', () => {
      expect(isStopLossOrder('Stop Limit')).toBe(true);
      expect(isStopLossOrder('Stop Market')).toBe(true);
      expect(isStopLossOrder('Take Profit Limit')).toBe(false);
      expect(isStopLossOrder('Take Profit Market')).toBe(false);
      expect(isStopLossOrder('Limit')).toBe(false);
      expect(isStopLossOrder(undefined)).toBe(false);
    });
  });

  describe('isLiquidationOrder', () => {
    it('should identify liquidation orders by detailed order type', () => {
      expect(isLiquidationOrder('Liquidation Market')).toBe(true);
      expect(isLiquidationOrder('liquidation')).toBe(true);
      expect(isLiquidationOrder('LIQUIDATION')).toBe(true);
      expect(isLiquidationOrder('Limit')).toBe(false);
      expect(isLiquidationOrder('Market')).toBe(false);
      expect(isLiquidationOrder(undefined)).toBe(false);
    });

    it('should identify liquidation orders by orderType field', () => {
      expect(isLiquidationOrder(undefined, 'liquidation')).toBe(true);
      expect(isLiquidationOrder(undefined, 'take_profit')).toBe(false);
      expect(isLiquidationOrder(undefined, 'stop_loss')).toBe(false);
      expect(isLiquidationOrder(undefined, 'regular')).toBe(false);
    });

    it('should identify liquidation orders by liquidation data presence', () => {
      const liquidationData = {
        liquidatedUser: '0x123',
        markPx: '1900',
        method: 'market',
      };

      expect(isLiquidationOrder(undefined, undefined, liquidationData)).toBe(
        true,
      );
      expect(isLiquidationOrder(undefined, undefined, undefined)).toBe(false);
    });
  });

  describe('detectTriggerFromOrder', () => {
    const mockFill: OrderFill = {
      orderId: '123',
      symbol: 'ETH',
      side: 'sell',
      size: '1',
      price: '2000',
      pnl: '100',
      direction: 'Close Long',
      fee: '5',
      feeToken: 'USDC',
      timestamp: 1640995200000,
    };

    it('should detect Take Profit orders', () => {
      const takeProfitOrder: Order = {
        orderId: '123',
        symbol: 'ETH',
        side: 'sell',
        orderType: 'limit',
        size: '0',
        originalSize: '1',
        price: '2100',
        filledSize: '1',
        remainingSize: '0',
        status: 'filled',
        timestamp: 1640995200000,
        detailedOrderType: 'Take Profit Limit',
      };

      const result = detectTriggerFromOrder(mockFill, takeProfitOrder);

      expect(result.isTrigger).toBe(true);
      expect(result.isTakeProfit).toBe(true);
      expect(result.isStopLoss).toBe(false);
    });

    it('should detect Stop Loss orders', () => {
      const stopLossOrder: Order = {
        orderId: '123',
        symbol: 'ETH',
        side: 'sell',
        orderType: 'market',
        size: '0',
        originalSize: '1',
        price: '1900',
        filledSize: '1',
        remainingSize: '0',
        status: 'filled',
        timestamp: 1640995200000,
        detailedOrderType: 'Stop Market',
      };

      const result = detectTriggerFromOrder(mockFill, stopLossOrder);

      expect(result.isTrigger).toBe(true);
      expect(result.isTakeProfit).toBe(false);
      expect(result.isStopLoss).toBe(true);
    });

    it('should detect liquidation trigger orders', () => {
      const liquidationOrder: Order = {
        orderId: '123',
        symbol: 'ETH',
        side: 'sell',
        orderType: 'market',
        size: '0',
        originalSize: '1',
        price: '1900',
        filledSize: '1',
        remainingSize: '0',
        status: 'filled',
        timestamp: 1640995200000,
        detailedOrderType: 'Liquidation Market',
      };

      const liquidationFill: OrderFill = {
        ...mockFill,
        liquidation: {
          liquidatedUser: '0x123',
          markPx: '1900',
          method: 'market',
        },
      };

      const result = detectTriggerFromOrder(liquidationFill, liquidationOrder);

      expect(result.isTrigger).toBe(true);
      expect(result.isTakeProfit).toBe(false);
      expect(result.isStopLoss).toBe(false);
      expect(result.isLiquidationTrigger).toBe(true);
    });

    it('should detect non-trigger orders', () => {
      const regularOrder: Order = {
        orderId: '123',
        symbol: 'ETH',
        side: 'sell',
        orderType: 'limit',
        size: '0',
        originalSize: '1',
        price: '2000',
        filledSize: '1',
        remainingSize: '0',
        status: 'filled',
        timestamp: 1640995200000,
        detailedOrderType: 'Limit',
      };

      const result = detectTriggerFromOrder(mockFill, regularOrder);

      expect(result.isTrigger).toBe(false);
      expect(result.isTakeProfit).toBe(false);
      expect(result.isStopLoss).toBe(false);
      expect(result.isLiquidationTrigger).toBe(false);
    });

    it('should handle missing order data', () => {
      const result = detectTriggerFromOrder(mockFill, undefined);

      expect(result.isTrigger).toBe(false);
      expect(result.isTakeProfit).toBe(false);
      expect(result.isStopLoss).toBe(false);
      expect(result.isLiquidationTrigger).toBe(false);
    });

    it('should handle order with isTrigger flag but no detailed type', () => {
      const triggerOrder: Order = {
        orderId: '123',
        symbol: 'ETH',
        side: 'sell',
        orderType: 'limit',
        size: '0',
        originalSize: '1',
        price: '2000',
        filledSize: '1',
        remainingSize: '0',
        status: 'filled',
        timestamp: 1640995200000,
        isTrigger: true,
      };

      const result = detectTriggerFromOrder(mockFill, triggerOrder);

      expect(result.isTrigger).toBe(true);
      expect(result.isTakeProfit).toBe(false);
      expect(result.isStopLoss).toBe(false);
      expect(result.isLiquidationTrigger).toBe(false);
    });
  });

  describe('createOrderLookupMap', () => {
    it('should create a proper lookup map', () => {
      const orders: Order[] = [
        {
          orderId: '123',
          symbol: 'ETH',
          side: 'sell',
          orderType: 'limit',
          size: '0',
          originalSize: '1',
          price: '2000',
          filledSize: '1',
          remainingSize: '0',
          status: 'filled',
          timestamp: 1640995200000,
          detailedOrderType: 'Take Profit Limit',
        },
        {
          orderId: '456',
          symbol: 'BTC',
          side: 'buy',
          orderType: 'market',
          size: '0',
          originalSize: '0.1',
          price: '40000',
          filledSize: '0.1',
          remainingSize: '0',
          status: 'filled',
          timestamp: 1640995200000,
          detailedOrderType: 'Stop Market',
        },
      ];

      const map = createOrderLookupMap(orders);

      expect(map.size).toBe(2);
      expect(map.get('123')?.symbol).toBe('ETH');
      expect(map.get('456')?.symbol).toBe('BTC');
      expect(map.get('789')).toBeUndefined();
    });

    it('should handle orders without orderId', () => {
      const orders: Order[] = [
        {
          orderId: '',
          symbol: 'ETH',
          side: 'sell',
          orderType: 'limit',
          size: '0',
          originalSize: '1',
          price: '2000',
          filledSize: '1',
          remainingSize: '0',
          status: 'filled',
          timestamp: 1640995200000,
        },
      ];

      const map = createOrderLookupMap(orders);
      expect(map.size).toBe(0);
    });
  });

  describe('enrichFillsWithTriggerInfo', () => {
    const mockFills: OrderFill[] = [
      {
        orderId: '123',
        symbol: 'ETH',
        side: 'sell',
        size: '1',
        price: '2100',
        pnl: '100',
        direction: 'Close Long',
        fee: '5',
        feeToken: 'USDC',
        timestamp: 1640995200000,
      },
      {
        orderId: '456',
        symbol: 'BTC',
        side: 'sell',
        size: '0.1',
        price: '38000',
        pnl: '-50',
        direction: 'Close Short',
        fee: '10',
        feeToken: 'USDC',
        timestamp: 1640995200000,
      },
      {
        orderId: '789',
        symbol: 'SOL',
        side: 'buy',
        size: '10',
        price: '100',
        pnl: '0',
        direction: 'Open Long',
        fee: '2',
        feeToken: 'USDC',
        timestamp: 1640995200000,
      },
    ];

    const mockOrders: Order[] = [
      {
        orderId: '123',
        symbol: 'ETH',
        side: 'sell',
        orderType: 'limit',
        size: '0',
        originalSize: '1',
        price: '2100',
        filledSize: '1',
        remainingSize: '0',
        status: 'filled',
        timestamp: 1640995200000,
        detailedOrderType: 'Take Profit Limit',
      },
      {
        orderId: '456',
        symbol: 'BTC',
        side: 'sell',
        orderType: 'market',
        size: '0',
        originalSize: '0.1',
        price: '38000',
        filledSize: '0.1',
        remainingSize: '0',
        status: 'filled',
        timestamp: 1640995200000,
        detailedOrderType: 'Stop Market',
      },
      {
        orderId: '999', // This order won't match any fill
        symbol: 'MATIC',
        side: 'buy',
        orderType: 'limit',
        size: '0',
        originalSize: '100',
        price: '2',
        filledSize: '100',
        remainingSize: '0',
        status: 'filled',
        timestamp: 1640995200000,
        detailedOrderType: 'Limit',
      },
    ];

    it('should enrich fills with trigger information correctly', () => {
      const enrichedFills = enrichFillsWithTriggerInfo(mockFills, mockOrders);

      expect(enrichedFills).toHaveLength(3);

      // First fill should be Take Profit
      expect(enrichedFills[0].orderId).toBe('123');
      expect(enrichedFills[0].isTakeProfit).toBe(true);
      expect(enrichedFills[0].isStopLoss).toBe(false);
      expect(enrichedFills[0].isLiquidationTrigger).toBe(false);
      expect(enrichedFills[0].detailedOrderType).toBe('Take Profit Limit');

      // Second fill should be Stop Loss
      expect(enrichedFills[1].orderId).toBe('456');
      expect(enrichedFills[1].isTakeProfit).toBe(false);
      expect(enrichedFills[1].isStopLoss).toBe(true);
      expect(enrichedFills[1].isLiquidationTrigger).toBe(false);
      expect(enrichedFills[1].detailedOrderType).toBe('Stop Market');

      // Third fill should have no matching order
      expect(enrichedFills[2].orderId).toBe('789');
      expect(enrichedFills[2].isTakeProfit).toBe(false);
      expect(enrichedFills[2].isStopLoss).toBe(false);
      expect(enrichedFills[2].isLiquidationTrigger).toBe(false);
      expect(enrichedFills[2].detailedOrderType).toBeUndefined();
    });

    it('should preserve original fill data', () => {
      const enrichedFills = enrichFillsWithTriggerInfo(mockFills, mockOrders);

      expect(enrichedFills[0].symbol).toBe('ETH');
      expect(enrichedFills[0].price).toBe('2100');
      expect(enrichedFills[0].pnl).toBe('100');
    });

    it('should handle empty arrays', () => {
      expect(enrichFillsWithTriggerInfo([], [])).toEqual([]);
      expect(enrichFillsWithTriggerInfo([], mockOrders)).toEqual([]);
      expect(enrichFillsWithTriggerInfo(mockFills, [])).toHaveLength(3);
    });
  });
});
