import { BigNumber } from 'bignumber.js';
import {
  transformFillsToTransactions,
  transformOrdersToTransactions,
  transformFundingToTransactions,
  transformUserHistoryToTransactions,
  transformWithdrawalRequestsToTransactions,
  transformDepositRequestsToTransactions,
} from './transactionTransforms';
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
      size: '1',
      price: '2000',
      fee: '10',
      timestamp: 1640995200000,
      feeToken: 'USDC',
      pnl: '0',
      liquidation: false,
      detailedOrderType: 'Market',
    };

    it('transforms open position fill correctly', () => {
      const result = transformFillsToTransactions([mockFill]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'order1',
        type: 'trade',
        category: 'position_open',
        title: 'Opened long',
        subtitle: '1 ETH',
        timestamp: 1640995200000,
        asset: 'ETH',
        fill: {
          shortTitle: 'Opened long',
          amount: '-$10.00',
          amountNumber: -10,
          isPositive: false,
          size: '1',
          entryPrice: '2000',
          pnl: '0',
          fee: '10',
          points: '0',
          feeToken: 'USDC',
          action: 'Opened',
          liquidation: false,
          isLiquidation: false,
          isTakeProfit: false,
          isStopLoss: false,
        },
      });
    });

    it('transforms close position fill correctly', () => {
      const closeFill = {
        ...mockFill,
        direction: 'Close Long',
        pnl: '50',
        fee: '5',
      };

      const result = transformFillsToTransactions([closeFill]);

      expect(result[0].fill.amount).toBe('+$45.00');
      expect(result[0].fill.amountNumber).toBe(45);
      expect(result[0].fill.isPositive).toBe(true);
      expect(result[0].fill.action).toBe('Closed');
    });

    it('transforms flipped position fill correctly', () => {
      const flippedFill = {
        ...mockFill,
        direction: 'Close Long > Open Short',
        startPosition: '2',
        pnl: '100',
        fee: '8',
      };

      const result = transformFillsToTransactions([flippedFill]);

      expect(result[0].fill.size).toBe('1'); // 2 - 1 = 1
      expect(result[0].fill.action).toBe('Flipped');
      expect(result[0].title).toBe('Flipped short');
    });

    it('handles break-even PnL correctly', () => {
      const breakEvenFill = {
        ...mockFill,
        direction: 'Close Long',
        pnl: '10',
        fee: '10',
      };

      const result = transformFillsToTransactions([breakEvenFill]);

      expect(result[0].fill.amount).toBe('$0.00');
      expect(result[0].fill.amountNumber).toBe(0);
      expect(result[0].fill.isPositive).toBe(true);
    });

    it('handles liquidation fills', () => {
      const liquidationFill = {
        ...mockFill,
        liquidation: true,
        detailedOrderType: 'Liquidation',
      };

      const result = transformFillsToTransactions([liquidationFill]);

      expect(result[0].fill.isLiquidation).toBe(true);
    });

    it('handles take profit fills', () => {
      const takeProfitFill = {
        ...mockFill,
        detailedOrderType: 'Take Profit',
      };

      const result = transformFillsToTransactions([takeProfitFill]);

      expect(result[0].fill.isTakeProfit).toBe(true);
    });

    it('handles stop loss fills', () => {
      const stopLossFill = {
        ...mockFill,
        detailedOrderType: 'Stop Loss',
      };

      const result = transformFillsToTransactions([stopLossFill]);

      expect(result[0].fill.isStopLoss).toBe(true);
    });

    it('handles unknown direction gracefully', () => {
      const unknownFill = {
        ...mockFill,
        direction: 'Unknown Direction',
      };

      const result = transformFillsToTransactions([unknownFill]);

      expect(result).toHaveLength(0);
    });

    it('handles missing direction', () => {
      const noDirectionFill = {
        ...mockFill,
        direction: undefined,
      };

      const result = transformFillsToTransactions([noDirectionFill]);

      expect(result).toHaveLength(0);
    });

    it('uses timestamp as fallback ID when orderId is missing', () => {
      const noOrderIdFill = {
        ...mockFill,
        orderId: undefined,
      };

      const result = transformFillsToTransactions([noOrderIdFill]);

      expect(result[0].id).toBe(`fill-${mockFill.timestamp}`);
    });
  });

  describe('transformOrdersToTransactions', () => {
    const mockOrder = {
      orderId: 'order1',
      symbol: 'BTC',
      side: 'buy',
      orderType: 'Limit',
      size: '0.5',
      originalSize: '1',
      price: '50000',
      status: 'filled',
      timestamp: 1640995200000,
    };

    it('transforms filled order correctly', () => {
      const result = transformOrdersToTransactions([mockOrder]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'order1-1640995200000',
        type: 'order',
        category: 'limit_order',
        title: 'Long Limit',
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
        status: 'canceled',
      };

      const result = transformOrdersToTransactions([cancelledOrder]);

      expect(result[0].order.text).toBe(PerpsOrderTransactionStatus.Canceled);
      expect(result[0].order.statusType).toBe(
        PerpsOrderTransactionStatusType.Canceled,
      );
    });

    it('transforms rejected order correctly', () => {
      const rejectedOrder = {
        ...mockOrder,
        status: 'rejected',
      };

      const result = transformOrdersToTransactions([rejectedOrder]);

      expect(result[0].order.text).toBe(PerpsOrderTransactionStatus.Rejected);
      expect(result[0].order.statusType).toBe(
        PerpsOrderTransactionStatusType.Canceled,
      );
    });

    it('transforms triggered order correctly', () => {
      const triggeredOrder = {
        ...mockOrder,
        status: 'triggered',
      };

      const result = transformOrdersToTransactions([triggeredOrder]);

      expect(result[0].order.text).toBe(PerpsOrderTransactionStatus.Triggered);
      expect(result[0].order.statusType).toBe(
        PerpsOrderTransactionStatusType.Filled,
      );
    });

    it('transforms open order correctly', () => {
      const openOrder = {
        ...mockOrder,
        status: 'open',
      };

      const result = transformOrdersToTransactions([openOrder]);

      expect(result[0].order.text).toBe(PerpsOrderTransactionStatus.Open);
      expect(result[0].order.statusType).toBe(
        PerpsOrderTransactionStatusType.Pending,
      );
    });

    it('transforms pending order correctly', () => {
      const pendingOrder = {
        ...mockOrder,
        status: 'pending',
      };

      const result = transformOrdersToTransactions([pendingOrder]);

      expect(result[0].order.text).toBe(PerpsOrderTransactionStatus.Queued);
      expect(result[0].order.statusType).toBe(
        PerpsOrderTransactionStatusType.Pending,
      );
    });

    it('handles short orders correctly', () => {
      const shortOrder = {
        ...mockOrder,
        side: 'sell',
      };

      const result = transformOrdersToTransactions([shortOrder]);

      expect(result[0].title).toBe('Short Limit');
    });

    it('handles market orders correctly', () => {
      const marketOrder = {
        ...mockOrder,
        orderType: 'Market',
      };

      const result = transformOrdersToTransactions([marketOrder]);

      expect(result[0].order.type).toBe('market');
    });

    it('calculates filled percentage correctly', () => {
      const partiallyFilledOrder = {
        ...mockOrder,
        size: '0.2',
        originalSize: '1',
      };

      const result = transformOrdersToTransactions([partiallyFilledOrder]);

      expect(result[0].order.filled).toBe('80%');
    });

    it('handles zero size as 100% filled', () => {
      const fullyFilledOrder = {
        ...mockOrder,
        size: '0',
        originalSize: '1',
      };

      const result = transformOrdersToTransactions([fullyFilledOrder]);

      expect(result[0].order.filled).toBe('100%');
    });

    it('handles missing originalSize', () => {
      const noOriginalSizeOrder = {
        ...mockOrder,
        originalSize: undefined,
      };

      const result = transformOrdersToTransactions([noOriginalSizeOrder]);

      expect(result[0].order.filled).toBe('100%');
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
  });

  describe('transformUserHistoryToTransactions', () => {
    const mockUserHistoryItem = {
      id: 'deposit1',
      timestamp: 1640995200000,
      type: 'deposit',
      amount: '1000',
      asset: 'USDC',
      status: 'completed',
      txHash: '0x123',
    };

    it('transforms completed deposit correctly', () => {
      const result = transformUserHistoryToTransactions([mockUserHistoryItem]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'deposit-deposit1',
        type: 'deposit',
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
          status: 'completed',
          type: 'deposit',
        },
      });
    });

    it('transforms completed withdrawal correctly', () => {
      const withdrawalItem = {
        ...mockUserHistoryItem,
        type: 'withdrawal',
        amount: '500',
      };

      const result = transformUserHistoryToTransactions([withdrawalItem]);

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
        status: 'pending',
      };

      const result = transformUserHistoryToTransactions([pendingItem]);

      expect(result).toHaveLength(0);
    });

    it('handles missing txHash', () => {
      const noTxHashItem = {
        ...mockUserHistoryItem,
        txHash: undefined,
      };

      const result = transformUserHistoryToTransactions([noTxHashItem]);

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
        type: 'withdrawal',
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
          status: 'completed',
          type: 'withdrawal',
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
        txHash: undefined,
      };

      const result = transformWithdrawalRequestsToTransactions([
        noTxHashRequest,
      ]);

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
        type: 'deposit',
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
          status: 'completed',
          type: 'deposit',
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
        txHash: undefined,
      };

      const result = transformDepositRequestsToTransactions([noTxHashRequest]);

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
        size: '0.0000001',
        price: '2000',
        fee: '0.000001',
        timestamp: 1640995200000,
        feeToken: 'USDC',
        pnl: '0.000001',
        liquidation: false,
        detailedOrderType: 'Market',
      };

      const result = transformFillsToTransactions([edgeCaseFill]);

      expect(result[0].fill.amountNumber).toBeCloseTo(0, 6);
    });
  });
});
