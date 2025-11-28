import {
  transformFillsToTransactions,
  transformOrdersToTransactions,
  transformFundingToTransactions,
  transformUserHistoryToTransactions,
  transformWithdrawalRequestsToTransactions,
  transformDepositRequestsToTransactions,
} from './transactionTransforms';
import { OrderFill } from '../controllers/types';
import { FillType } from '../components/PerpsTransactionItem/PerpsTransactionItem';
import {
  PerpsOrderTransactionStatus,
  PerpsOrderTransactionStatusType,
} from '../types/transactionHistory';

describe('transactionTransforms', () => {
  describe('transformFillsToTransactions', () => {
    const mockFill = {
      direction: 'Open Long',
      orderId: 'order1',
      symbol: 'ETH',
      side: 'buy' as const,
      size: '1',
      price: '2000',
      fee: '10',
      timestamp: 1640995200000,
      feeToken: 'USDC',
      pnl: '0',
      liquidation: undefined,
      detailedOrderType: 'Market',
    };

    it('transforms close position fill correctly', () => {
      const closeFill = {
        ...mockFill,
        direction: 'Close Long',
        pnl: '50',
        fee: '5',
      };

      const result = transformFillsToTransactions([closeFill]);

      if (!result[0]?.fill) {
        return;
      }

      expect(result[0].fill.amount).toBe('+$45.00');
      expect(result[0].fill.amountNumber).toBe(45);
      expect(result[0].fill.isPositive).toBe(true);
      expect(result[0].fill.action).toBe('Closed');
    });

    it('handles break-even PnL correctly', () => {
      const breakEvenFill = {
        ...mockFill,
        direction: 'Close Long',
        pnl: '10',
        fee: '10',
      };

      const result = transformFillsToTransactions([breakEvenFill]);

      if (!result[0]?.fill) {
        return;
      }

      expect(result[0].fill.amount).toBe('$0.00');
      expect(result[0].fill.amountNumber).toBe(0);
      expect(result[0].fill.isPositive).toBe(true);
    });

    it('should handle flipped positions correctly', () => {
      const flippedFill: OrderFill = {
        ...mockFill,
        direction: 'Short > Long',
        pnl: '50.00',
        fee: '10.00',
      };

      const result = transformFillsToTransactions([flippedFill]);

      expect(result[0]).toMatchObject({
        category: 'position_close', // Flips are treated as closes
        title: 'Flipped short > long',
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

    it('should correctly identify take profit fills', () => {
      const tpFill: OrderFill = {
        orderId: '123',
        symbol: 'BTC',
        side: 'sell',
        size: '0.1',
        price: '55000',
        pnl: '500',
        direction: 'Close Long',
        fee: '5',
        feeToken: 'USDC',
        timestamp: Date.now(),
        detailedOrderType: 'Take Profit Market',
      };

      const result = transformFillsToTransactions([tpFill]);

      expect(result[0].fill?.fillType).toBe(FillType.TakeProfit);
    });

    it('should correctly identify stop loss fills', () => {
      const slFill: OrderFill = {
        orderId: '123',
        symbol: 'BTC',
        side: 'sell',
        size: '0.1',
        price: '45000',
        pnl: '-500',
        direction: 'Close Long',
        fee: '5',
        feeToken: 'USDC',
        timestamp: Date.now(),
        detailedOrderType: 'Stop Market',
      };

      const result = transformFillsToTransactions([slFill]);

      expect(result[0].fill?.fillType).toBe(FillType.StopLoss);
    });

    it('should correctly identify liquidation fills', () => {
      const liquidationFill: OrderFill = {
        orderId: '123',
        symbol: 'BTC',
        side: 'sell',
        size: '0.1',
        price: '44900',
        pnl: '-1000',
        direction: 'Close Long',
        fee: '5',
        feeToken: 'USDC',
        timestamp: Date.now(),
        liquidation: {
          liquidatedUser: '0x1234567890123456789012345678901234567890',
          markPx: '2000',
          method: 'market',
        },
        detailedOrderType: 'Liquidation',
      };

      const result = transformFillsToTransactions([liquidationFill]);

      expect(result[0].fill?.fillType).toBe(FillType.Liquidation);
      expect(result[0].fill?.liquidation).toEqual({
        liquidatedUser: '0x1234567890123456789012345678901234567890',
        markPx: '2000',
        method: 'market',
      });
    });

    it('correctly identifies auto-deleveraging fills with positive position', () => {
      const adlFill: OrderFill = {
        orderId: '789',
        symbol: 'SOL',
        side: 'sell',
        size: '5.0',
        price: '150',
        pnl: '-250',
        direction: 'Auto-Deleveraging',
        fee: '10',
        feeToken: 'USDC',
        timestamp: Date.now(),
        startPosition: '5.0',
      };

      const result = transformFillsToTransactions([adlFill]);

      expect(result[0]).toMatchObject({
        category: 'position_close',
        title: 'Closed long',
        asset: 'SOL',
      });
      expect(result[0].fill?.fillType).toBe(FillType.AutoDeleveraging);
      expect(result[0].fill?.amount).toBe('-$260.00');
      expect(result[0].fill?.amountNumber).toBe(-260);
      expect(result[0].fill?.isPositive).toBe(false);
    });

    it('correctly identifies auto-deleveraging fills with negative position', () => {
      const adlFill: OrderFill = {
        orderId: '456',
        symbol: 'ETH',
        side: 'buy',
        size: '2.0',
        price: '3000',
        pnl: '400',
        direction: 'Auto-Deleveraging',
        fee: '15',
        feeToken: 'USDC',
        timestamp: Date.now(),
        startPosition: '-2.0',
      };

      const result = transformFillsToTransactions([adlFill]);

      expect(result[0]).toMatchObject({
        category: 'position_close',
        title: 'Closed short',
        asset: 'ETH',
      });
      expect(result[0].fill?.fillType).toBe(FillType.AutoDeleveraging);
      expect(result[0].fill?.amount).toBe('+$385.00');
      expect(result[0].fill?.amountNumber).toBe(385);
      expect(result[0].fill?.isPositive).toBe(true);
    });

    it('filters out auto-deleveraging fills with invalid startPosition', () => {
      const adlFillInvalid: OrderFill = {
        orderId: '999',
        symbol: 'BTC',
        side: 'sell',
        size: '0.5',
        price: '45000',
        pnl: '-100',
        direction: 'Auto-Deleveraging',
        fee: '5',
        feeToken: 'USDC',
        timestamp: Date.now(),
        startPosition: 'invalid',
      };

      const result = transformFillsToTransactions([adlFillInvalid]);

      expect(result).toEqual([]);
    });

    it('filters out auto-deleveraging fills with missing startPosition', () => {
      const adlFillMissing: OrderFill = {
        orderId: '888',
        symbol: 'BTC',
        side: 'sell',
        size: '0.5',
        price: '45000',
        pnl: '-100',
        direction: 'Auto-Deleveraging',
        fee: '5',
        feeToken: 'USDC',
        timestamp: Date.now(),
      };

      const result = transformFillsToTransactions([adlFillMissing]);

      expect(result).toEqual([]);
    });

    it('handles stop loss fills', () => {
      const stopLossFill = {
        ...mockFill,
        detailedOrderType: 'Stop Loss',
      };

      const result = transformFillsToTransactions([stopLossFill]);

      expect(result[0].fill?.fillType).toBe(FillType.StopLoss);
      expect(result[0].fill?.liquidation).toBeUndefined();
    });

    it('handles missing direction gracefully', () => {
      const unknownFill = {
        ...mockFill,
        direction: '',
      };

      const result = transformFillsToTransactions([unknownFill]);

      expect(result).toHaveLength(0);
    });

    it('handles missing direction', () => {
      const noDirectionFill = {
        ...mockFill,
        direction: '',
      };

      const result = transformFillsToTransactions([noDirectionFill]);

      expect(result).toHaveLength(0);
    });

    it('uses timestamp as fallback ID when orderId is missing', () => {
      const noOrderIdFill = {
        ...mockFill,
        orderId: undefined as unknown as string,
      };

      const result = transformFillsToTransactions([noOrderIdFill]);

      // ID format: fill-{timestamp}-{index}
      expect(result[0].id).toBe(`fill-${mockFill.timestamp}-0`);
    });

    it('strips hip3 prefix from symbol in subtitle', () => {
      const hip3Fill = {
        ...mockFill,
        symbol: 'hip3:BTC',
      };

      const result = transformFillsToTransactions([hip3Fill]);

      expect(result[0].subtitle).toBe('1 BTC');
    });

    it('strips DEX prefix from symbol in subtitle', () => {
      const dexFill = {
        ...mockFill,
        symbol: 'xyz:TSLA',
      };

      const result = transformFillsToTransactions([dexFill]);

      expect(result[0].subtitle).toBe('1 TSLA');
    });

    it('keeps regular symbols unchanged in subtitle', () => {
      const regularFill = {
        ...mockFill,
        symbol: 'SOL',
      };

      const result = transformFillsToTransactions([regularFill]);

      expect(result[0].subtitle).toBe('1 SOL');
    });

    // Tests for spot-perps and prelaunch markets that use "Buy"/"Sell" directions
    it('transforms Buy direction fill correctly', () => {
      const buyFill: OrderFill = {
        orderId: 'order-buy-1',
        symbol: '@215',
        side: 'buy',
        size: '5191.5',
        price: '0.005581',
        fee: '3.488686',
        feeToken: 'SLAY',
        timestamp: 1763979989653,
        pnl: '0.0',
        direction: 'Buy',
      };

      const result = transformFillsToTransactions([buyFill]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'trade',
        category: 'position_open',
        title: 'Bought',
        asset: '@215',
        fill: {
          shortTitle: 'Bought',
          action: 'Bought',
          isPositive: false, // Fee is always a cost
          fillType: FillType.Standard,
        },
      });
    });

    it('transforms Sell direction fill correctly', () => {
      const sellFill: OrderFill = {
        orderId: 'order-sell-1',
        symbol: '@230',
        side: 'sell',
        size: '20.0',
        price: '0.99998',
        fee: '0.00268799',
        feeToken: 'USDH',
        timestamp: 1763984501474,
        pnl: '50.0',
        direction: 'Sell',
      };

      const result = transformFillsToTransactions([sellFill]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'trade',
        category: 'position_close',
        title: 'Sold',
        asset: '@230',
        fill: {
          shortTitle: 'Sold',
          action: 'Sold',
          isPositive: true, // PnL - fee is positive
          fillType: FillType.Standard,
        },
      });
    });

    it('handles Sell direction with negative PnL correctly', () => {
      const sellFillNegative: OrderFill = {
        orderId: 'order-sell-2',
        symbol: '@215',
        side: 'sell',
        size: '100',
        price: '0.005',
        fee: '0.5',
        feeToken: 'SLAY',
        timestamp: Date.now(),
        pnl: '-10.0',
        direction: 'Sell',
      };

      const result = transformFillsToTransactions([sellFillNegative]);

      expect(result).toHaveLength(1);
      expect(result[0].fill?.isPositive).toBe(false);
      expect(result[0].fill?.amount).toBe('-$10.50'); // PnL (-10) minus fee (0.5) = -10.5
    });
  });

  describe('transformOrdersToTransactions', () => {
    const mockOrder = {
      orderId: 'order1',
      symbol: 'BTC',
      side: 'buy' as const,
      orderType: 'limit' as const,
      size: '0.5',
      originalSize: '1',
      filledSize: '0.5',
      remainingSize: '0.5',
      price: '50000',
      status: 'filled' as const,
      timestamp: 1640995200000,
    };

    it('transforms filled order correctly', () => {
      const result = transformOrdersToTransactions([mockOrder]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'order1-1640995200000',
        type: 'order',
        category: 'limit_order',
        title: 'Limit long',
        subtitle: '1 BTC',
        timestamp: 1640995200000,
        asset: 'BTC',
        order: {
          text: PerpsOrderTransactionStatus.Filled,
          statusType: PerpsOrderTransactionStatusType.Filled,
          type: 'limit',
          size: '50000',
          limitPrice: '50000',
          filled: '50%',
        },
      });
    });

    it('transforms cancelled order correctly', () => {
      const cancelledOrder = {
        ...mockOrder,
        status: 'canceled' as const,
      };

      const result = transformOrdersToTransactions([cancelledOrder]);

      if (!result[0]?.order) {
        return;
      }

      expect(result[0].order.text).toBe(PerpsOrderTransactionStatus.Canceled);
      expect(result[0].order.statusType).toBe(
        PerpsOrderTransactionStatusType.Canceled,
      );
    });

    it('transforms rejected order correctly', () => {
      const rejectedOrder = {
        ...mockOrder,
        status: 'rejected' as const,
      };

      const result = transformOrdersToTransactions([rejectedOrder]);

      if (!result[0]?.order) {
        return;
      }

      expect(result[0].order.text).toBe(PerpsOrderTransactionStatus.Rejected);
      expect(result[0].order.statusType).toBe(
        PerpsOrderTransactionStatusType.Canceled,
      );
    });

    it('transforms triggered order correctly', () => {
      const triggeredOrder = {
        ...mockOrder,
        status: 'triggered' as const,
      };

      const result = transformOrdersToTransactions([triggeredOrder]);

      if (!result[0]?.order) {
        return;
      }

      expect(result[0].order.text).toBe(PerpsOrderTransactionStatus.Triggered);
      expect(result[0].order.statusType).toBe(
        PerpsOrderTransactionStatusType.Filled,
      );
    });

    it('transforms open order correctly', () => {
      const openOrder = {
        ...mockOrder,
        status: 'open' as const,
      };

      const result = transformOrdersToTransactions([openOrder]);

      if (!result[0]?.order) {
        return;
      }

      expect(result[0].order.text).toBe(PerpsOrderTransactionStatus.Open);
      expect(result[0].order.statusType).toBe(
        PerpsOrderTransactionStatusType.Pending,
      );
    });

    it('handles short orders correctly', () => {
      const shortOrder = {
        ...mockOrder,
        side: 'sell' as const,
      };

      const result = transformOrdersToTransactions([shortOrder]);

      expect(result[0].title).toBe('Limit short');
    });

    it('formats closing long position as Close Long', () => {
      const closeLongOrder = {
        ...mockOrder,
        side: 'sell' as const,
        reduceOnly: true,
      };

      const result = transformOrdersToTransactions([closeLongOrder]);

      expect(result[0].title).toBe('Limit close long');
    });

    it('formats closing short position as Close Short', () => {
      const closeShortOrder = {
        ...mockOrder,
        side: 'buy' as const,
        reduceOnly: true,
      };

      const result = transformOrdersToTransactions([closeShortOrder]);

      expect(result[0].title).toBe('Limit close short');
    });

    it('formats trigger orders as closing orders', () => {
      const triggerOrder = {
        ...mockOrder,
        side: 'sell' as const,
        isTrigger: true,
        detailedOrderType: 'Stop Market',
        orderType: 'market' as const,
      };

      const result = transformOrdersToTransactions([triggerOrder]);

      expect(result[0].title).toBe('Stop market close long');
    });

    it('uses detailedOrderType for Take Profit orders', () => {
      const takeProfitOrder = {
        ...mockOrder,
        side: 'sell' as const,
        isTrigger: true,
        reduceOnly: true,
        detailedOrderType: 'Take Profit Limit',
      };

      const result = transformOrdersToTransactions([takeProfitOrder]);

      expect(result[0].title).toBe('Take profit limit close long');
    });

    it('handles market orders correctly', () => {
      const marketOrder = {
        ...mockOrder,
        orderType: 'market' as const,
      };

      const result = transformOrdersToTransactions([marketOrder]);

      if (!result[0]?.order) {
        return;
      }

      expect(result[0].order.type).toBe('market');
    });

    it('calculates filled percentage correctly', () => {
      const partiallyFilledOrder = {
        ...mockOrder,
        size: '0.2',
        originalSize: '1',
      };

      const result = transformOrdersToTransactions([partiallyFilledOrder]);

      if (!result[0]?.order) {
        return;
      }

      expect(result[0].order.filled).toBe('80%');
    });

    it('handles zero size as 100% filled', () => {
      const fullyFilledOrder = {
        ...mockOrder,
        size: '0',
        originalSize: '1',
      };

      const result = transformOrdersToTransactions([fullyFilledOrder]);

      if (!result[0]?.order) {
        return;
      }

      expect(result[0].order.filled).toBe('100%');
    });

    it('strips hip3 prefix from symbol in subtitle', () => {
      const hip3Order = {
        ...mockOrder,
        symbol: 'hip3:ETH',
        originalSize: '2.5',
      };

      const result = transformOrdersToTransactions([hip3Order]);

      expect(result[0].subtitle).toBe('2.5 ETH');
    });

    it('strips DEX prefix from symbol in subtitle', () => {
      const dexOrder = {
        ...mockOrder,
        symbol: 'abc:AAPL',
        originalSize: '10',
      };

      const result = transformOrdersToTransactions([dexOrder]);

      expect(result[0].subtitle).toBe('10 AAPL');
    });

    it('keeps regular symbols unchanged in subtitle', () => {
      const regularOrder = {
        ...mockOrder,
        symbol: 'BTC',
        originalSize: '0.5',
      };

      const result = transformOrdersToTransactions([regularOrder]);

      expect(result[0].subtitle).toBe('0.5 BTC');
    });
  });

  describe('transformFundingToTransactions', () => {
    const mockFunding = {
      symbol: 'ETH',
      amountUsd: '5.25',
      rate: '0.0001',
      timestamp: 1640995200000,
    };

    it('transforms positive funding correctly', () => {
      const result = transformFundingToTransactions([mockFunding]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'funding-1640995200000-ETH',
        type: 'funding',
        category: 'funding_fee',
        title: 'Received funding fee',
        subtitle: 'ETH',
        timestamp: 1640995200000,
        asset: 'ETH',
        fundingAmount: {
          isPositive: true,
          fee: '+$5.25',
          feeNumber: 5.25,
          rate: '0.01%',
        },
      });
    });

    it('transforms negative funding correctly', () => {
      const negativeFunding = {
        ...mockFunding,
        amountUsd: '-3.50',
      };

      const result = transformFundingToTransactions([negativeFunding]);

      if (!result[0]?.fundingAmount) {
        return;
      }

      expect(result[0].title).toBe('Paid funding fee');
      expect(result[0].fundingAmount.isPositive).toBe(false);
      expect(result[0].fundingAmount.fee).toBe('-$3.5');
      expect(result[0].fundingAmount.feeNumber).toBe(-3.5);
    });

    it('sorts funding by timestamp descending', () => {
      const funding1 = { ...mockFunding, timestamp: 1000 };
      const funding2 = { ...mockFunding, timestamp: 2000 };
      const funding3 = { ...mockFunding, timestamp: 1500 };

      const result = transformFundingToTransactions([
        funding1,
        funding2,
        funding3,
      ]);

      expect(result[0].timestamp).toBe(2000);
      expect(result[1].timestamp).toBe(1500);
      expect(result[2].timestamp).toBe(1000);
    });

    it('strips hip3 prefix from symbol in subtitle', () => {
      const hip3Funding = {
        ...mockFunding,
        symbol: 'hip3:BTC',
      };

      const result = transformFundingToTransactions([hip3Funding]);

      expect(result[0].subtitle).toBe('BTC');
    });

    it('strips DEX prefix from symbol in subtitle', () => {
      const dexFunding = {
        ...mockFunding,
        symbol: 'xyz:TSLA',
      };

      const result = transformFundingToTransactions([dexFunding]);

      expect(result[0].subtitle).toBe('TSLA');
    });

    it('keeps regular symbols unchanged in subtitle', () => {
      const regularFunding = {
        ...mockFunding,
        symbol: 'SOL',
      };

      const result = transformFundingToTransactions([regularFunding]);

      expect(result[0].subtitle).toBe('SOL');
    });
  });

  describe('transformUserHistoryToTransactions', () => {
    const mockUserHistoryItem = {
      id: 'deposit1',
      timestamp: 1640995200000,
      type: 'deposit' as const,
      amount: '1000',
      asset: 'USDC',
      status: 'completed' as const,
      txHash: '0x123',
      details: {
        source: 'ethereum',
        bridgeContract: '0x1234567890123456789012345678901234567890',
        recipient: '0x9876543210987654321098765432109876543210',
        blockNumber: '12345',
        chainId: '1',
        synthetic: false,
      },
    };

    it('transforms completed deposit correctly', () => {
      const result = transformUserHistoryToTransactions([mockUserHistoryItem]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'deposit-deposit1',
        type: 'deposit' as const,
        category: 'deposit',
        title: 'Deposited 1000 USDC',
        subtitle: 'Completed',
        timestamp: 1640995200000,
        asset: 'USDC',
        depositWithdrawal: {
          amount: '+$1000.00',
          amountNumber: 1000,
          isPositive: true,
          asset: 'USDC',
          txHash: '0x123',
          status: 'completed' as const,
          type: 'deposit' as const,
        },
      });
    });

    it('transforms completed withdrawal correctly', () => {
      const withdrawalItem = {
        ...mockUserHistoryItem,
        type: 'withdrawal' as const,
        amount: '500',
      };

      const result = transformUserHistoryToTransactions([withdrawalItem]);

      if (!result[0]?.depositWithdrawal) {
        return;
      }

      expect(result[0].type).toBe('withdrawal');
      expect(result[0].category).toBe('withdrawal');
      expect(result[0].title).toBe('Withdrew 500 USDC');
      expect(result[0].depositWithdrawal.amount).toBe('-$500.00');
      expect(result[0].depositWithdrawal.amountNumber).toBe(500);
      expect(result[0].depositWithdrawal.isPositive).toBe(false);
      expect(result[0].depositWithdrawal.type).toBe('withdrawal');
    });

    it('filters out non-completed items', () => {
      const pendingItem = {
        ...mockUserHistoryItem,
        status: 'pending' as const,
      };

      const result = transformUserHistoryToTransactions([pendingItem]);

      expect(result).toHaveLength(0);
    });

    it('handles missing txHash', () => {
      const noTxHashItem = {
        ...mockUserHistoryItem,
        txHash: undefined as unknown as string,
      };

      const result = transformUserHistoryToTransactions([noTxHashItem]);

      if (!result[0]?.depositWithdrawal) {
        return;
      }

      expect(result[0].depositWithdrawal.txHash).toBe('');
    });
  });

  describe('transformWithdrawalRequestsToTransactions', () => {
    const mockWithdrawalRequest = {
      id: 'withdrawal1',
      timestamp: 1640995200000,
      amount: '500',
      asset: 'USDC',
      txHash: '0x456',
      status: 'completed' as const,
      destination: '0x123',
      withdrawalId: 'withdrawal123',
    };

    it('transforms completed withdrawal request correctly', () => {
      const result = transformWithdrawalRequestsToTransactions([
        mockWithdrawalRequest,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'withdrawal-withdrawal1',
        type: 'withdrawal' as const,
        category: 'withdrawal',
        title: 'Withdrew 500 USDC',
        subtitle: 'Completed',
        timestamp: 1640995200000,
        asset: 'USDC',
        depositWithdrawal: {
          amount: '-$500.00',
          amountNumber: -500,
          isPositive: true,
          asset: 'USDC',
          txHash: '0x456',
          status: 'completed' as const,
          type: 'withdrawal' as const,
        },
      });
    });

    it('filters out non-completed withdrawal requests', () => {
      const pendingRequest = {
        ...mockWithdrawalRequest,
        status: 'pending' as const,
      };

      const result = transformWithdrawalRequestsToTransactions([
        pendingRequest,
      ]);

      expect(result).toHaveLength(0);
    });

    it('handles missing txHash', () => {
      const noTxHashRequest = {
        ...mockWithdrawalRequest,
        txHash: undefined as unknown as string,
      };

      const result = transformWithdrawalRequestsToTransactions([
        noTxHashRequest,
      ]);

      if (!result[0]?.depositWithdrawal) {
        return;
      }

      expect(result[0].depositWithdrawal.txHash).toBe('');
    });
  });

  describe('transformDepositRequestsToTransactions', () => {
    const mockDepositRequest = {
      id: 'deposit1',
      timestamp: 1640995200000,
      amount: '1000',
      asset: 'USDC',
      txHash: '0x789',
      status: 'completed' as const,
      source: 'arbitrum',
      depositId: 'deposit123',
    };

    it('transforms completed deposit request correctly', () => {
      const result = transformDepositRequestsToTransactions([
        mockDepositRequest,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'deposit-deposit1',
        type: 'deposit' as const,
        category: 'deposit',
        title: 'Deposited 1000 USDC',
        subtitle: 'Completed',
        timestamp: 1640995200000,
        asset: 'USDC',
        depositWithdrawal: {
          amount: '+$1000.00',
          amountNumber: 1000,
          isPositive: true,
          asset: 'USDC',
          txHash: '0x789',
          status: 'completed' as const,
          type: 'deposit' as const,
        },
      });
    });

    it('handles zero amount deposits', () => {
      const zeroAmountRequest = {
        ...mockDepositRequest,
        amount: '0',
      };

      const result = transformDepositRequestsToTransactions([
        zeroAmountRequest,
      ]);

      expect(result[0].title).toBe('Deposit');
    });

    it('handles zero string amount deposits', () => {
      const zeroStringRequest = {
        ...mockDepositRequest,
        amount: '0.00',
      };

      const result = transformDepositRequestsToTransactions([
        zeroStringRequest,
      ]);

      expect(result[0].title).toBe('Deposit');
    });

    it('filters out non-completed deposit requests', () => {
      const pendingRequest = {
        ...mockDepositRequest,
        status: 'pending' as const,
      };

      const result = transformDepositRequestsToTransactions([pendingRequest]);

      expect(result).toHaveLength(0);
    });

    it('handles missing txHash', () => {
      const noTxHashRequest = {
        ...mockDepositRequest,
        txHash: undefined as unknown as string,
      };

      const result = transformDepositRequestsToTransactions([noTxHashRequest]);

      if (!result[0]?.depositWithdrawal) {
        return;
      }

      expect(result[0].depositWithdrawal.txHash).toBe('');
    });
  });

  describe('edge cases', () => {
    it('handles empty arrays', () => {
      expect(transformFillsToTransactions([])).toEqual([]);
      expect(transformOrdersToTransactions([])).toEqual([]);
      expect(transformFundingToTransactions([])).toEqual([]);
      expect(transformUserHistoryToTransactions([])).toEqual([]);
      expect(transformWithdrawalRequestsToTransactions([])).toEqual([]);
      expect(transformDepositRequestsToTransactions([])).toEqual([]);
    });

    it('handles BigNumber edge cases', () => {
      const edgeCaseFill = {
        direction: 'Close Long',
        orderId: 'order1',
        symbol: 'ETH',
        side: 'buy' as const,
        size: '0.0000001',
        price: '2000',
        fee: '0.000001',
        timestamp: 1640995200000,
        feeToken: 'USDC',
        pnl: '0.000001',
        liquidation: undefined,
        detailedOrderType: 'Market',
      };

      const result = transformFillsToTransactions([edgeCaseFill]);

      if (!result[0]?.fill) {
        return;
      }

      expect(result[0].fill.amountNumber).toBeCloseTo(0, 6);
    });
  });
});
