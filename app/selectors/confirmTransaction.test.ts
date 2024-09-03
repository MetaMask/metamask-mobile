import { mergeGasFeeEstimates } from '@metamask/transaction-controller';
import { RootState } from '../reducers';
import {
  selectCurrentTransactionGasFeeEstimates,
  selectCurrentTransactionMetadata,
  selectGasFeeEstimates,
} from './confirmTransaction';
import {
  GAS_ESTIMATE_TYPES,
  GasFeeEstimates,
} from '@metamask/gas-fee-controller';

jest.mock('@metamask/transaction-controller', () => ({
  ...jest.requireActual('@metamask/transaction-controller'),
  mergeGasFeeEstimates: jest.fn(),
}));

const GAS_FEE_ESTIMATES_MOCK = { low: '1', medium: '2', high: '3' };

const TRANSACTION_GAS_FEE_ESTIMATES_MOCK = {
  low: { suggestedMaxFeePerGas: '0x1', suggestedMaxPriorityFeePerGas: '0x2' },
  medium: {
    suggestedMaxFeePerGas: '0x3',
    suggestedMaxPriorityFeePerGas: '0x4',
  },
  high: { suggestedMaxFeePerGas: '0x5', suggestedMaxPriorityFeePerGas: '0x6' },
};

describe('Confirm Transaction Selectors', () => {
  const mergeGasFeeEstimatesMock = jest.mocked(mergeGasFeeEstimates);

  describe('selectCurrentTransactionMetadata', () => {
    it('returns the current transaction metadata', () => {
      const transactions = [{ id: 1 }, { id: 2 }, { id: 3, chainId: '123' }];
      const currentTransaction = { id: 3 };

      const state = {
        transaction: currentTransaction,
        engine: {
          backgroundState: { TransactionController: { transactions } },
        },
      };

      expect(
        selectCurrentTransactionMetadata(state as unknown as RootState),
      ).toStrictEqual(transactions[2]);
    });
  });

  describe('selectCurrentTransactionGasFeeEstimates', () => {
    it('returns the gas fee estimates from current transaction metadata', () => {
      const transactions = [
        { id: 1 },
        { id: 2 },
        { id: 3, chainId: '123', gasFeeEstimates: GAS_FEE_ESTIMATES_MOCK },
      ];

      const currentTransaction = { id: 3 };

      const state = {
        transaction: currentTransaction,
        engine: {
          backgroundState: { TransactionController: { transactions } },
        },
      };

      expect(
        selectCurrentTransactionGasFeeEstimates(state as unknown as RootState),
      ).toStrictEqual(GAS_FEE_ESTIMATES_MOCK);
    });
  });

  describe('selectGasFeeEstimates', () => {
    it('returns GasFeeController estimates if no transaction estimates', () => {
      const transactions = [{ id: 1 }, { id: 2 }, { id: 3, chainId: '123' }];
      const currentTransaction = { id: 3 };

      const state = {
        transaction: currentTransaction,
        engine: {
          backgroundState: {
            GasFeeController: { gasFeeEstimates: GAS_FEE_ESTIMATES_MOCK },
            TransactionController: { transactions },
          },
        },
      };

      expect(
        selectGasFeeEstimates(state as unknown as RootState),
      ).toStrictEqual(GAS_FEE_ESTIMATES_MOCK);
    });

    it('returns merged estimates if GasFeeController estimates and transaction estimates exist', () => {
      const transactions = [
        { id: 1 },
        { id: 2 },
        {
          id: 3,
          chainId: '123',
          gasFeeEstimates: TRANSACTION_GAS_FEE_ESTIMATES_MOCK,
        },
      ];
      const currentTransaction = { id: 3 };

      const state = {
        transaction: currentTransaction,
        engine: {
          backgroundState: {
            GasFeeController: {
              gasEstimateType: GAS_ESTIMATE_TYPES.FEE_MARKET,
              gasFeeEstimates: GAS_FEE_ESTIMATES_MOCK,
            },
            TransactionController: { transactions },
          },
        },
      };

      mergeGasFeeEstimatesMock.mockReturnValue(
        TRANSACTION_GAS_FEE_ESTIMATES_MOCK as GasFeeEstimates,
      );

      expect(
        selectGasFeeEstimates(state as unknown as RootState),
      ).toStrictEqual(TRANSACTION_GAS_FEE_ESTIMATES_MOCK);

      expect(mergeGasFeeEstimatesMock).toHaveBeenCalledTimes(1);
      expect(mergeGasFeeEstimatesMock).toHaveBeenCalledWith({
        gasFeeControllerEstimates: GAS_FEE_ESTIMATES_MOCK,
        transactionGasFeeEstimates: TRANSACTION_GAS_FEE_ESTIMATES_MOCK,
      });
    });
  });
});
