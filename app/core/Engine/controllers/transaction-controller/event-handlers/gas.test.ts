import {
  FeeMarketGasFeeEstimates,
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  GasPriceGasFeeEstimates,
  LegacyGasFeeEstimates,
  TransactionStatus,
  TransactionEnvelopeType,
} from '@metamask/transaction-controller';
import type {
  TransactionControllerState,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import {
  handleTxParamsGasFeeUpdatesForRedesignedTransactions,
  createUnapprovedTransactionsGasFeeSelector,
} from './gas';

describe('handleTxParamsGasFeeUpdatesForRedesignedTransactions', () => {
  let mockUpdateTransactionGasFees: jest.Mock;

  beforeEach(() => {
    mockUpdateTransactionGasFees = jest.fn();
  });

  describe('handles EIP-1559 compatible transactions', () => {
    it('updates transaction with FeeMarket estimates', () => {
      const mockTransaction = {
        id: '1',
        userFeeLevel: GasFeeEstimateLevel.Medium,
        gasFeeEstimates: {
          type: GasFeeEstimateType.FeeMarket,
          medium: {
            maxFeePerGas: '0x1234' as Hex,
            maxPriorityFeePerGas: '0x5678' as Hex,
          },
        } as FeeMarketGasFeeEstimates,
        txParams: {
          type: TransactionEnvelopeType.feeMarket,
        },
      } as Partial<TransactionMeta>;

      handleTxParamsGasFeeUpdatesForRedesignedTransactions(
        [mockTransaction],
        mockUpdateTransactionGasFees,
      );

      expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith('1', {
        maxFeePerGas: '0x1234',
        maxPriorityFeePerGas: '0x5678',
        gasPrice: undefined,
      });
    });

    it('updates transaction with GasPrice estimates', () => {
      const mockTransaction = {
        id: '1',
        userFeeLevel: GasFeeEstimateLevel.Medium,
        gasFeeEstimates: {
          type: GasFeeEstimateType.GasPrice,
          gasPrice: '0x1234' as Hex,
        } as GasPriceGasFeeEstimates,
        txParams: {
          type: TransactionEnvelopeType.feeMarket,
        },
      } as Partial<TransactionMeta>;

      handleTxParamsGasFeeUpdatesForRedesignedTransactions(
        [mockTransaction],
        mockUpdateTransactionGasFees,
      );

      expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith('1', {
        maxFeePerGas: '0x1234',
        maxPriorityFeePerGas: '0x1234',
        gasPrice: undefined,
      });
    });

    it('updates transaction with Legacy estimates', () => {
      const mockTransaction = {
        id: '1',
        userFeeLevel: GasFeeEstimateLevel.Medium,
        gasFeeEstimates: {
          type: GasFeeEstimateType.Legacy,
          medium: '0x1234' as Hex,
        } as LegacyGasFeeEstimates,
        txParams: {
          type: TransactionEnvelopeType.feeMarket,
        },
      } as Partial<TransactionMeta>;

      handleTxParamsGasFeeUpdatesForRedesignedTransactions(
        [mockTransaction],
        mockUpdateTransactionGasFees,
      );

      expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith('1', {
        maxFeePerGas: '0x1234',
        maxPriorityFeePerGas: '0x1234',
        gasPrice: undefined,
      });
    });
  });

  describe('handles non-EIP-1559 transactions', () => {
    it('updates transaction with FeeMarket estimates', () => {
      const mockTransaction = {
        id: '1',
        userFeeLevel: GasFeeEstimateLevel.Medium,
        gasFeeEstimates: {
          type: GasFeeEstimateType.FeeMarket,
          medium: {
            maxFeePerGas: '0x1234' as Hex,
            maxPriorityFeePerGas: '0x5678' as Hex,
          },
        } as FeeMarketGasFeeEstimates,
        txParams: {
          type: TransactionEnvelopeType.legacy,
        },
      } as Partial<TransactionMeta>;

      handleTxParamsGasFeeUpdatesForRedesignedTransactions(
        [mockTransaction],
        mockUpdateTransactionGasFees,
      );

      expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith('1', {
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        gasPrice: '0x1234',
      });
    });

    it('updates transaction with GasPrice estimates', () => {
      const mockTransaction = {
        id: '1',
        userFeeLevel: GasFeeEstimateLevel.Medium,
        gasFeeEstimates: {
          type: GasFeeEstimateType.GasPrice,
          gasPrice: '0x1234' as Hex,
        } as GasPriceGasFeeEstimates,
        txParams: {
          type: TransactionEnvelopeType.legacy,
        },
      } as Partial<TransactionMeta>;

      handleTxParamsGasFeeUpdatesForRedesignedTransactions(
        [mockTransaction],
        mockUpdateTransactionGasFees,
      );

      expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith('1', {
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        gasPrice: '0x1234',
      });
    });

    it('updates transaction with Legacy estimates', () => {
      const mockTransaction = {
        id: '1',
        userFeeLevel: GasFeeEstimateLevel.Medium,
        gasFeeEstimates: {
          type: GasFeeEstimateType.Legacy,
          medium: '0x1234' as Hex,
        } as LegacyGasFeeEstimates,
        txParams: {
          type: TransactionEnvelopeType.legacy,
        },
      } as Partial<TransactionMeta>;

      handleTxParamsGasFeeUpdatesForRedesignedTransactions(
        [mockTransaction],
        mockUpdateTransactionGasFees,
      );

      expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith('1', {
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        gasPrice: '0x1234',
      });
    });
  });
});

describe('createUnapprovedTransactionsGasFeeSelector', () => {
  it('selects unapproved transactions that need gas fee updates', () => {
    const selector = createUnapprovedTransactionsGasFeeSelector();

    const mockState = {
      transactions: [
        {
          id: '1',
          status: TransactionStatus.unapproved,
          type: 'stakingDeposit',
          userFeeLevel: GasFeeEstimateLevel.Medium,
          gasFeeEstimates: {
            type: GasFeeEstimateType.FeeMarket,
          },
          txParams: {
            type: TransactionEnvelopeType.feeMarket,
          },
        },
        {
          id: '2',
          status: TransactionStatus.confirmed, // Should be filtered out
          type: 'stakingDeposit',
          userFeeLevel: GasFeeEstimateLevel.Medium,
          gasFeeEstimates: {
            type: GasFeeEstimateType.FeeMarket,
          },
          txParams: {},
        },
        {
          id: '3',
          status: TransactionStatus.unapproved,
          type: 'non-redesigned-type', // Should be filtered out
          userFeeLevel: GasFeeEstimateLevel.Medium,
          gasFeeEstimates: {
            type: GasFeeEstimateType.FeeMarket,
          },
          txParams: {},
        },
        {
          id: '4',
          status: TransactionStatus.unapproved,
          type: 'stakingDeposit',
          userFeeLevel: GasFeeEstimateLevel.Medium,
          gasFeeEstimates: undefined, // Should be filtered out
          txParams: {
            type: TransactionEnvelopeType.feeMarket,
          },
        },
      ],
    } as TransactionControllerState;

    const result = selector(mockState);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns cached result for identical state', () => {
    const selector = createUnapprovedTransactionsGasFeeSelector();

    const mockState = {
      transactions: [
        {
          id: '1',
          status: TransactionStatus.unapproved,
          type: 'stakingDeposit',
          userFeeLevel: GasFeeEstimateLevel.Medium,
          gasFeeEstimates: {
            type: GasFeeEstimateType.FeeMarket,
          },
          txParams: {
            type: TransactionEnvelopeType.feeMarket,
          },
        },
      ],
    } as TransactionControllerState;

    const result1 = selector(mockState);
    const result2 = selector(mockState);

    expect(result1).toBe(result2);
  });
});
