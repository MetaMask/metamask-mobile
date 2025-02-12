import { getTransaction1559GasFeeEstimates } from './gas';
import {
  TransactionParams,
  FeeMarketGasFeeEstimates,
  GasFeeEstimateType,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    TransactionController: {
      estimateGasFee: jest.fn(),
    },
  },
}));

describe('getTransaction1559GasFeeEstimates', () => {
  const mockTransactionParams: TransactionParams = {
    from: '0x1',
    to: '0x2',
    value: '0x3',
  };
  const mockChainId = '0x1';

  it('should return correct gas fee estimates', async () => {
    const mockEstimates: FeeMarketGasFeeEstimates = {
      type: GasFeeEstimateType.FeeMarket,
      low: {
        maxFeePerGas: '0x2',
        maxPriorityFeePerGas: '0x3',
      },
      medium: {
        maxFeePerGas: '0x2',
        maxPriorityFeePerGas: '0x3',
      },
      high: {
        maxFeePerGas: '0x2',
        maxPriorityFeePerGas: '0x3',
      },
    };

    (
      Engine.context.TransactionController.estimateGasFee as jest.Mock
    ).mockResolvedValue({
      estimates: mockEstimates,
    });

    const result = await getTransaction1559GasFeeEstimates(
      mockTransactionParams,
      mockChainId,
    );

    expect(result).toEqual({
      maxFeePerGas: '0x2',
      maxPriorityFeePerGas: '0x3',
    });
  });

  it('should handle undefined estimates', async () => {
    (
      Engine.context.TransactionController.estimateGasFee as jest.Mock
    ).mockResolvedValue({
      estimates: undefined,
    });

    const result = await getTransaction1559GasFeeEstimates(
      mockTransactionParams,
      mockChainId,
    );

    expect(result).toEqual({
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    });
  });
});
