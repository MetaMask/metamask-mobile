import { getTransaction1559GasFeeEstimates, getGasFeeEstimatesForTransaction } from './gas';
import {
  TransactionParams,
  FeeMarketGasFeeEstimates,
  GasFeeEstimateType,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { decGWEIToHexWEI } from '../../../../util/conversions';
import { estimateGasFee } from '../../../../util/transaction-controller';

jest.mock('../../../../util/transaction-controller', () => {
  const originalModule = jest.requireActual('../../../../util/transaction-controller');
  return {
    ...originalModule,
    estimateGasFee: jest.fn(originalModule.estimateGasFee),
  };
});

jest.mock('../../../../core/Engine', () => ({
  context: {
    TransactionController: {
      estimateGasFee: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/conversions', () => ({
  decGWEIToHexWEI: jest.fn().mockReturnValue('123456'),
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

describe('getGasFeeEstimatesForTransaction', () => {
  // Mock transaction and gas estimates
  const mockTransaction = {
    from: '0xfrom',
    to: '0xto',
    data: '0xdata',
    value: '0x0',
    gas: '0x5208',
    chainId: '0x1' as `0x${string}`,
    gasPrice: '0x20',
  };

  const mockGasEstimates = {
    gasPrice: '20',
    medium: '50',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return EIP1559 gas fee estimates for EIP1559 networks', async () => {
    (estimateGasFee as jest.Mock).mockResolvedValue({
      estimates: {
        high: { maxFeePerGas: '0x1234', maxPriorityFeePerGas: '0x5678' },
      },
    });

    const result = await getGasFeeEstimatesForTransaction(
      mockTransaction,
      mockGasEstimates,
      { chainId: '0x1', isEIP1559Network: true }
    );

    // Verify the result
    expect(result).toEqual({
      maxFeePerGas: '0x1234',
      maxPriorityFeePerGas: '0x5678',
    });

    // Verify that gasPrice is deleted from the transaction
    expect(mockTransaction.gasPrice).toBeUndefined();
  });

  it('should return legacy gas fee estimates for non-EIP1559 networks', async () => {
    const result = await getGasFeeEstimatesForTransaction(
      mockTransaction,
      mockGasEstimates,
      { chainId: '0x1', isEIP1559Network: false }
    );

    // Verify decGWEIToHexWEI was called with the gasPrice
    expect(decGWEIToHexWEI).toHaveBeenCalledWith('20');

    // Verify the result
    expect(result).toEqual({
      gasPrice: '0x123456',
    });
  });

  it('should use medium gas price if gasPrice is not provided for legacy networks', async () => {
    const result = await getGasFeeEstimatesForTransaction(
      mockTransaction,
      { ...mockGasEstimates, gasPrice: undefined },
      { chainId: '0x1', isEIP1559Network: false }
    );

    // Verify decGWEIToHexWEI was called with the medium value
    expect(decGWEIToHexWEI).toHaveBeenCalledWith('50');

    // Verify the result
    expect(result).toEqual({
      gasPrice: '0x123456',
    });
  });
});
