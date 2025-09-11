import {
  transformFillsToTransactions,
  transformOrdersToTransactions,
  transformFundingToTransactions,
} from './transactionTransforms';
import { OrderFill, Order, Funding } from '../controllers/types';

describe('transactionTransforms', () => {
  describe('transformFillsToTransactions', () => {
    const mockOrderFill: OrderFill = {
      orderId: '12345',
      symbol: 'ETH',
      side: 'buy',
      size: '1.5',
      price: '2000.00',
      fee: '5.00',
      feeToken: 'USDC',
      timestamp: 1640995200000,
      pnl: '100.50',
      direction: 'Open Long',
      success: true,
    };

    it('should transform Open Long fills correctly', () => {
      const fills = [mockOrderFill];
      const result = transformFillsToTransactions(fills);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '12345',
        type: 'trade',
        category: 'position_open',
        title: 'Opened ETH long',
        subtitle: '1.5 ETH',
        timestamp: 1640995200000,
        asset: 'ETH',
        fill: {
          shortTitle: 'Opened long',
          amount: '-$5.00', // For opens: show fee paid (negative)
          amountNumber: 5.0,
          isPositive: false, // Opens are negative (cost)
          size: '1.5',
          entryPrice: '2000.00',
          pnl: '100.50',
          fee: '5.00',
          points: '0',
          feeToken: 'USDC',
          action: 'Opened',
        },
      });
    });

    it('should transform Close Short fills correctly', () => {
      const closeFill: OrderFill = {
        ...mockOrderFill,
        direction: 'Close Short',
        side: 'buy',
        pnl: '75.25',
      };

      const result = transformFillsToTransactions([closeFill]);

      expect(result[0]).toMatchObject({
        category: 'position_close',
        title: 'Closed ETH short',
        fill: {
          shortTitle: 'Closed short',
          amount: '+$70.25', // For closes: PnL minus fee (75.25 - 5.00)
          amountNumber: 70.25,
          isPositive: true, // Positive PnL after fee
          action: 'Closed',
        },
      });
    });

    it('should handle missing direction field', () => {
      const fillWithoutDirection: OrderFill = {
        ...mockOrderFill,
        direction: undefined as unknown as string,
      };

      const result = transformFillsToTransactions([fillWithoutDirection]);

      expect(result).toHaveLength(0);
    });

    it('should handle undefined direction', () => {
      const minimalFill: OrderFill = {
        ...mockOrderFill,
        direction: '',
      };

      const result = transformFillsToTransactions([minimalFill]);

      expect(result).toHaveLength(0);
    });

    it('should calculate amount correctly for closed positions', () => {
      const closedFill: OrderFill = {
        ...mockOrderFill,
        direction: 'Close Long',
        pnl: '150.75',
      };

      const result = transformFillsToTransactions([closedFill]);

      // For closed positions, uses PnL - fee (150.75 - 5.00 = 145.75)
      expect(result[0].fill?.amount).toBe('+$145.75');
      expect(result[0].fill?.amountNumber).toBe(145.75);
      expect(result[0].fill?.isPositive).toBe(true);
    });

    it('should handle zero PnL correctly', () => {
      const closedFill: OrderFill = {
        ...mockOrderFill,
        direction: 'Close Long',
        pnl: '0',
      };

      const result = transformFillsToTransactions([closedFill]);

      // Should use PnL - fee = 0 - 5 = -5
      expect(result[0].fill?.amount).toBe('-$5.00');
      expect(result[0].fill?.amountNumber).toBe(-5.0);
      expect(result[0].fill?.isPositive).toBe(false);
    });

    it('should handle break-even PnL (PnL equals fee)', () => {
      const breakEvenFill: OrderFill = {
        ...mockOrderFill,
        direction: 'Close Long',
        pnl: '5.00', // Equals the fee
        fee: '5.00',
      };

      const result = transformFillsToTransactions([breakEvenFill]);

      // PnL - fee = 5 - 5 = 0, should show $0.00 and be treated as positive (green)
      expect(result[0].fill?.amount).toBe('$0.00');
      expect(result[0].fill?.amountNumber).toBe(0);
      expect(result[0].fill?.isPositive).toBe(true); // Break-even treated as positive
    });

    it('should handle flipped positions correctly', () => {
      const flippedFill: OrderFill = {
        ...mockOrderFill,
        direction: 'Short > Long',
        pnl: '50.00',
        fee: '10.00',
      };

      const result = transformFillsToTransactions([flippedFill]);

      expect(result[0]).toMatchObject({
        category: 'position_close', // Flips are treated as closes
        title: 'Flipped ETH short > long',
        fill: {
          shortTitle: 'Flipped short > long',
          amount: '+$40.00', // PnL minus fee (50 - 10)
          amountNumber: 40.0,
          isPositive: true,
          action: 'Flipped',
        },
      });
    });

    it('should handle empty fills array', () => {
      const result = transformFillsToTransactions([]);
      expect(result).toEqual([]);
    });

    it('should handle fills with empty direction field', () => {
      const minimalFill: OrderFill = {
        orderId: '',
        symbol: 'BTC',
        side: 'buy',
        size: '0.1',
        price: '50000',
        fee: '0',
        feeToken: 'USDC',
        timestamp: 1640995200000,
        pnl: '0',
        direction: '',
      };

      const result = transformFillsToTransactions([minimalFill]);

      expect(result).toHaveLength(0);
    });

    it('should handle unknown actions by logging error and returning empty array', () => {
      // Mock console.error to test the error logging
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const unknownActionFill: OrderFill = {
        ...mockOrderFill,
        direction: 'Unknown Action' as string, // This will trigger the unknown action case
      };

      const result = transformFillsToTransactions([unknownActionFill]);

      // Should return empty array for unknown actions
      expect(result).toEqual([]);

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unknown action',
        unknownActionFill,
      );

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('transformOrdersToTransactions', () => {
    const mockOrder: Order = {
      orderId: '67890',
      symbol: 'BTC',
      side: 'buy',
      orderType: 'limit',
      size: '0.5',
      originalSize: '1.0',
      price: '45000',
      filledSize: '0.5',
      remainingSize: '0.5',
      status: 'open',
      timestamp: 1640995200000,
      lastUpdated: 1640995200000,
    };

    it('should transform open orders correctly', () => {
      const orders = [mockOrder];
      const result = transformOrdersToTransactions(orders);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '67890-1640995200000',
        type: 'order',
        category: 'limit_order',
        title: 'Long limit',
        subtitle: '1.0 BTC',
        timestamp: 1640995200000,
        asset: 'BTC',
        order: {
          text: '', // Open orders have empty text (PerpsOrderTransactionStatus.Open = '')
          statusType: 'pending',
          type: 'limit',
          size: '45000', // originalSize * price
          limitPrice: '45000',
          filled: '50%', // (1.0 - 0.5) / 1.0 * 100
        },
      });
    });

    it('should transform filled orders correctly', () => {
      const filledOrder: Order = {
        ...mockOrder,
        status: 'filled',
        remainingSize: '0',
        filledSize: '1.0',
      };

      const result = transformOrdersToTransactions([filledOrder]);

      expect(result[0].order).toMatchObject({
        text: 'Filled',
        statusType: 'filled',
        size: '45000', // originalSize * price = 1.0 * 45000
        filled: '50%',
      });
    });

    it('should transform cancelled orders correctly', () => {
      const cancelledOrder: Order = {
        ...mockOrder,
        status: 'canceled',
      };

      const result = transformOrdersToTransactions([cancelledOrder]);

      expect(result[0].order).toMatchObject({
        text: 'Canceled',
        statusType: 'canceled',
        size: '45000',
      });
    });

    it('should transform rejected orders correctly', () => {
      const rejectedOrder: Order = {
        ...mockOrder,
        status: 'rejected',
      };

      const result = transformOrdersToTransactions([rejectedOrder]);

      expect(result[0].order).toMatchObject({
        text: 'Rejected',
        statusType: 'canceled', // Rejected maps to canceled
        size: '45000',
      });
    });

    it('should transform triggered orders correctly', () => {
      const triggeredOrder: Order = {
        ...mockOrder,
        status: 'triggered',
      };

      const result = transformOrdersToTransactions([triggeredOrder]);

      expect(result[0].order).toMatchObject({
        text: 'Triggered',
        statusType: 'filled', // Triggered maps to filled
        size: '45000',
      });
    });

    it('should handle market orders', () => {
      const marketOrder: Order = {
        ...mockOrder,
        orderType: 'market',
      };

      const result = transformOrdersToTransactions([marketOrder]);

      expect(result[0].order?.type).toBe('market');
      expect(result[0].order?.size).toBe('45000');
    });

    it('should handle sell orders', () => {
      const sellOrder: Order = {
        ...mockOrder,
        side: 'sell',
      };

      const result = transformOrdersToTransactions([sellOrder]);

      expect(result[0].title).toBe('Short limit');
      expect(result[0].order?.size).toBe('45000');
    });

    it('should calculate order size correctly', () => {
      const result = transformOrdersToTransactions([mockOrder]);

      // size = originalSize * price = 1.0 * 45000 = 45000
      expect(result[0].order?.size).toBe('45000');
    });

    it('should handle orders with zero remaining size (fully filled)', () => {
      const fullyFilledOrder: Order = {
        ...mockOrder,
        size: '0', // No remaining size
        status: 'filled',
      };

      const result = transformOrdersToTransactions([fullyFilledOrder]);

      // When size is 0, filled should be 100%
      expect(result[0].order?.filled).toBe('100%');
    });

    it('should handle empty orders array', () => {
      const result = transformOrdersToTransactions([]);
      expect(result).toEqual([]);
    });
  });

  describe('transformFundingToTransactions', () => {
    const mockFunding: Funding = {
      symbol: 'ETH',
      amountUsd: '12.50',
      rate: '0.0001',
      timestamp: 1640995200000,
      transactionHash: '0x123abc',
    };

    it('should transform positive funding correctly', () => {
      const funding = [mockFunding];
      const result = transformFundingToTransactions(funding);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'funding-1640995200000-ETH',
        type: 'funding',
        category: 'funding_fee',
        title: 'Received funding fee',
        subtitle: 'ETH',
        timestamp: 1640995200000,
        asset: 'ETH',
        fundingAmount: {
          isPositive: true,
          fee: '+$12.5',
          feeNumber: 12.5,
          rate: '0.01%', // 0.0001 * 100
        },
      });
    });

    it('should transform negative funding correctly', () => {
      const negativeFunding: Funding = {
        ...mockFunding,
        amountUsd: '-8.75',
      };

      const result = transformFundingToTransactions([negativeFunding]);

      expect(result[0]).toMatchObject({
        title: 'Paid funding fee',
        fundingAmount: {
          isPositive: false,
          fee: '-$8.75',
          feeNumber: -8.75,
        },
      });
    });

    it('should handle zero funding amounts', () => {
      const zeroFunding: Funding = {
        ...mockFunding,
        amountUsd: '0',
      };

      const result = transformFundingToTransactions([zeroFunding]);

      expect(result[0].fundingAmount).toMatchObject({
        isPositive: false, // BigNumber treats 0 as not greater than 0
        fee: '-$0',
        feeNumber: 0,
      });
    });

    it('should handle funding without transaction hash', () => {
      const fundingWithoutHash: Funding = {
        symbol: 'BTC',
        amountUsd: '5.25',
        rate: '0.00005',
        timestamp: 1640995200000,
      };

      const result = transformFundingToTransactions([fundingWithoutHash]);

      expect(result[0]).toMatchObject({
        id: 'funding-1640995200000-BTC',
        asset: 'BTC',
        fundingAmount: {
          rate: '0.005%', // 0.00005 * 100
        },
      });
    });

    it('should handle empty funding array', () => {
      const result = transformFundingToTransactions([]);
      expect(result).toEqual([]);
    });

    it('should handle very small rates', () => {
      const smallRateFunding: Funding = {
        ...mockFunding,
        rate: '0.000001',
      };

      const result = transformFundingToTransactions([smallRateFunding]);

      expect(result[0].fundingAmount?.rate).toBe('0.0001%');
    });

    it('should handle large rates', () => {
      const largeRateFunding: Funding = {
        ...mockFunding,
        rate: '0.01',
      };

      const result = transformFundingToTransactions([largeRateFunding]);

      expect(result[0].fundingAmount?.rate).toBe('1%');
    });

    it('should sort funding by timestamp in descending order (newest first)', () => {
      const olderFunding: Funding = {
        symbol: 'BTC',
        amountUsd: '10.00',
        rate: '0.0001',
        timestamp: 1640995200000, // Older timestamp
      };

      const newerFunding: Funding = {
        symbol: 'ETH',
        amountUsd: '15.00',
        rate: '0.0002',
        timestamp: 1640995300000, // Newer timestamp
      };

      // Pass in older first, newer second
      const result = transformFundingToTransactions([
        olderFunding,
        newerFunding,
      ]);

      // Should be sorted with newer first
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1640995300000); // Newer first
      expect(result[0].asset).toBe('ETH');
      expect(result[1].timestamp).toBe(1640995200000); // Older second
      expect(result[1].asset).toBe('BTC');
    });
  });
});
