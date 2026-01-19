import {
  GasFeeEstimateType,
  TransactionEnvelopeType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { renderHook } from '@testing-library/react-hooks';
import { type GasFeeEstimates } from '@metamask/gas-fee-controller';

import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { simpleSendTransaction } from '../../__mocks__/controllers/transaction-controller-mock';
import { useFeeCalculations } from './useFeeCalculations';
import { useGasFeeEstimates } from './useGasFeeEstimates';
import { updateTransactionGasFees } from '../../../../../util/transaction-controller';
import { useGasFeeEstimateLevelOptions } from './useGasFeeEstimateLevelOptions';
import '../../utils/time';

jest.mock('../../../../../util/transaction-controller');
jest.mock('../../utils/time', () => ({
  toHumanEstimatedTimeRange: jest.fn().mockReturnValue('~1 min'),
}));
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useFeeCalculations');
jest.mock('./useGasFeeEstimates');

describe('useGasFeeEstimateLevelOptions', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseFeeCalculations = jest.mocked(useFeeCalculations);
  const mockUseGasFeeEstimates = jest.mocked(useGasFeeEstimates);
  const mockUpdateTransactionGasFees = jest.mocked(updateTransactionGasFees);
  const mockCalculateGasEstimate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...simpleSendTransaction,
      gasFeeEstimates: undefined,
      networkClientId: 'test-network-id',
      txParams: {
        ...simpleSendTransaction.txParams,
        type: TransactionEnvelopeType.legacy,
      },
    } as unknown as TransactionMeta);

    mockUseFeeCalculations.mockReturnValue({
      calculateGasEstimate: mockCalculateGasEstimate,
    } as unknown as ReturnType<typeof useFeeCalculations>);

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {} as GasFeeEstimates,
    });
  });

  it('returns empty array when transaction gas fee estimates type is not FeeMarket or Legacy', () => {
    const mockHandleCloseModals = jest.fn();

    const { result } = renderHook(() =>
      useGasFeeEstimateLevelOptions({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current).toEqual([]);
  });

  it('returns empty array when network gas fee estimates are missing', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithFeeMarketEstimates = {
      ...simpleSendTransaction,
      gasFeeEstimates: {
        type: GasFeeEstimateType.FeeMarket,
      },
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithFeeMarketEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: undefined as unknown as GasFeeEstimates,
    });

    const { result } = renderHook(() =>
      useGasFeeEstimateLevelOptions({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current).toEqual([]);
  });

  it('returns fee level options for FeeMarket estimates with legacy transaction', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithFeeMarketEstimates = {
      ...simpleSendTransaction,
      id: 'test-id',
      userFeeLevel: 'high',
      txParams: {
        ...simpleSendTransaction.txParams,
        type: TransactionEnvelopeType.legacy,
      },
      gasFeeEstimates: {
        type: GasFeeEstimateType.FeeMarket,
        low: {
          maxFeePerGas: '0x1',
          maxPriorityFeePerGas: '0x1',
        },
        medium: {
          maxFeePerGas: '0x2',
          maxPriorityFeePerGas: '0x2',
        },
        high: {
          maxFeePerGas: '0x3',
          maxPriorityFeePerGas: '0x3',
        },
      },
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithFeeMarketEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        low: {
          minWaitTimeEstimate: 60000,
          maxWaitTimeEstimate: 120000,
          suggestedMaxPriorityFeePerGas: '1',
        },
        medium: {
          minWaitTimeEstimate: 30000,
          maxWaitTimeEstimate: 60000,
          suggestedMaxPriorityFeePerGas: '2',
        },
        high: {
          minWaitTimeEstimate: 15000,
          maxWaitTimeEstimate: 30000,
          suggestedMaxPriorityFeePerGas: '3',
        },
      } as unknown as GasFeeEstimates,
    });

    mockCalculateGasEstimate.mockImplementation((params) => {
      if (params.feePerGas === '0x1') {
        return {
          currentCurrencyFee: '$5',
          preciseNativeCurrencyFee: '5',
        };
      }
      if (params.feePerGas === '0x2') {
        return {
          currentCurrencyFee: '$10',
          preciseNativeCurrencyFee: '10',
        };
      }
      if (params.feePerGas === '0x3') {
        return {
          currentCurrencyFee: '$15',
          preciseNativeCurrencyFee: '15',
        };
      }
      return {
        currentCurrencyFee: '$0',
        preciseNativeCurrencyFee: '0',
      };
    });

    const { result } = renderHook(() =>
      useGasFeeEstimateLevelOptions({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current.length).toEqual(3);

    const lowOption = result.current.find((option) => option.key === 'low');
    expect(lowOption).toBeDefined();
    expect(lowOption?.isSelected).toEqual(false);
    expect(lowOption?.value).toEqual('5');
    expect(lowOption?.valueInFiat).toEqual('$5');

    const mediumOption = result.current.find(
      (option) => option.key === 'medium',
    );
    expect(mediumOption).toBeDefined();
    expect(mediumOption?.isSelected).toEqual(false);
    expect(mediumOption?.value).toEqual('10');
    expect(mediumOption?.valueInFiat).toEqual('$10');

    const highOption = result.current.find((option) => option.key === 'high');
    expect(highOption).toBeDefined();
    expect(highOption?.isSelected).toEqual(true);
    expect(highOption?.value).toEqual('15');
    expect(highOption?.valueInFiat).toEqual('$15');

    expect(mockCalculateGasEstimate).toHaveBeenCalledWith(
      expect.objectContaining({
        feePerGas: '0x1',
        shouldUseEIP1559FeeLogic: true,
      }),
    );
  });

  it('returns fee level options for Legacy gas estimates with legacy transaction', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithLegacyEstimates = {
      ...simpleSendTransaction,
      id: 'test-id',
      userFeeLevel: 'medium',
      txParams: {
        ...simpleSendTransaction.txParams,
        type: TransactionEnvelopeType.legacy,
      },
      gasFeeEstimates: {
        type: GasFeeEstimateType.Legacy,
        low: '0x1',
        medium: '0x2',
        high: '0x3',
      },
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithLegacyEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        low: {
          minWaitTimeEstimate: 60000,
          maxWaitTimeEstimate: 120000,
          suggestedMaxPriorityFeePerGas: '1',
        },
        medium: {
          minWaitTimeEstimate: 30000,
          maxWaitTimeEstimate: 60000,
          suggestedMaxPriorityFeePerGas: '2',
        },
        high: {
          minWaitTimeEstimate: 15000,
          maxWaitTimeEstimate: 30000,
          suggestedMaxPriorityFeePerGas: '3',
        },
      } as unknown as GasFeeEstimates,
    });

    mockCalculateGasEstimate.mockImplementation(({ gasPrice }) => {
      const value = gasPrice === '0x1' ? '5' : gasPrice === '0x2' ? '10' : '15';
      const valueInFiat =
        gasPrice === '0x1' ? '$5' : gasPrice === '0x2' ? '$10' : '$15';

      return {
        currentCurrencyFee: valueInFiat,
        preciseNativeCurrencyFee: value,
      };
    });

    const { result } = renderHook(() =>
      useGasFeeEstimateLevelOptions({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current.length).toEqual(3);

    // Check medium option (should be selected)
    const mediumOption = result.current.find(
      (option) => option.key === 'medium',
    );
    expect(mediumOption).toBeDefined();
    expect(mediumOption?.isSelected).toEqual(true);
    expect(mediumOption?.value).toEqual('10');

    // Check calculations with legacy params
    expect(mockCalculateGasEstimate).toHaveBeenCalledWith(
      expect.objectContaining({
        gasPrice: '0x2',
        shouldUseEIP1559FeeLogic: false,
      }),
    );
  });

  it('returns fee level options for FeeMarket estimates with EIP1559 transaction', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithFeeMarketEstimates = {
      ...simpleSendTransaction,
      id: 'test-id',
      userFeeLevel: 'medium',
      txParams: {
        ...simpleSendTransaction.txParams,
        type: TransactionEnvelopeType.feeMarket,
      },
      gasFeeEstimates: {
        type: GasFeeEstimateType.FeeMarket,
        low: {
          maxFeePerGas: '0x1',
          maxPriorityFeePerGas: '0x1',
        },
        medium: {
          maxFeePerGas: '0x2',
          maxPriorityFeePerGas: '0x2',
        },
        high: {
          maxFeePerGas: '0x3',
          maxPriorityFeePerGas: '0x3',
        },
      },
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithFeeMarketEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        low: {
          minWaitTimeEstimate: 60000,
          maxWaitTimeEstimate: 120000,
          suggestedMaxPriorityFeePerGas: '1',
        },
        medium: {
          minWaitTimeEstimate: 30000,
          maxWaitTimeEstimate: 60000,
          suggestedMaxPriorityFeePerGas: '2',
        },
        high: {
          minWaitTimeEstimate: 15000,
          maxWaitTimeEstimate: 30000,
          suggestedMaxPriorityFeePerGas: '3',
        },
      } as unknown as GasFeeEstimates,
    });

    mockCalculateGasEstimate.mockImplementation(({ feePerGas }) => {
      const value =
        feePerGas === '0x1' ? '5' : feePerGas === '0x2' ? '10' : '15';
      const valueInFiat =
        feePerGas === '0x1' ? '$5' : feePerGas === '0x2' ? '$10' : '$15';

      return {
        currentCurrencyFee: valueInFiat,
        preciseNativeCurrencyFee: value,
      };
    });

    renderHook(() =>
      useGasFeeEstimateLevelOptions({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    // Check calculations with EIP1559 params
    expect(mockCalculateGasEstimate).toHaveBeenCalledWith(
      expect.objectContaining({
        feePerGas: '0x2',
        priorityFeePerGas: '0x2',
        shouldUseEIP1559FeeLogic: true,
      }),
    );
  });

  it('updates transaction gas fees for legacy transaction when low option is selected', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithLegacyEstimates = {
      ...simpleSendTransaction,
      id: 'test-id',
      userFeeLevel: 'medium',
      txParams: {
        ...simpleSendTransaction.txParams,
        type: TransactionEnvelopeType.legacy,
      },
      gasFeeEstimates: {
        type: GasFeeEstimateType.Legacy,
        low: '0x1',
        medium: '0x2',
        high: '0x3',
      },
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithLegacyEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        low: {
          minWaitTimeEstimate: 60000,
          maxWaitTimeEstimate: 120000,
          suggestedMaxPriorityFeePerGas: '1',
        },
        medium: {
          minWaitTimeEstimate: 30000,
          maxWaitTimeEstimate: 60000,
          suggestedMaxPriorityFeePerGas: '2',
        },
        high: {
          minWaitTimeEstimate: 15000,
          maxWaitTimeEstimate: 30000,
          suggestedMaxPriorityFeePerGas: '3',
        },
      } as unknown as GasFeeEstimates,
    });

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$5',
      preciseNativeCurrencyFee: '5',
    });

    const { result } = renderHook(() =>
      useGasFeeEstimateLevelOptions({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    const lowOption = result.current.find((option) => option.key === 'low');
    expect(lowOption).toBeDefined();

    lowOption?.onSelect();

    expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith('test-id', {
      userFeeLevel: 'low',
    });
    expect(mockHandleCloseModals).toHaveBeenCalled();
  });

  it('updates transaction gas fees for EIP1559 transaction when high option is selected', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithFeeMarketEstimates = {
      ...simpleSendTransaction,
      id: 'test-id',
      userFeeLevel: 'medium',
      txParams: {
        ...simpleSendTransaction.txParams,
        type: TransactionEnvelopeType.feeMarket,
      },
      gasFeeEstimates: {
        type: GasFeeEstimateType.FeeMarket,
        low: {
          maxFeePerGas: '0x1',
          maxPriorityFeePerGas: '0x1',
        },
        medium: {
          maxFeePerGas: '0x2',
          maxPriorityFeePerGas: '0x2',
        },
        high: {
          maxFeePerGas: '0x3',
          maxPriorityFeePerGas: '0x3',
        },
      },
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithFeeMarketEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        low: {
          minWaitTimeEstimate: 60000,
          maxWaitTimeEstimate: 120000,
          suggestedMaxPriorityFeePerGas: '1',
        },
        medium: {
          minWaitTimeEstimate: 30000,
          maxWaitTimeEstimate: 60000,
          suggestedMaxPriorityFeePerGas: '2',
        },
        high: {
          minWaitTimeEstimate: 15000,
          maxWaitTimeEstimate: 30000,
          suggestedMaxPriorityFeePerGas: '3',
        },
      } as unknown as GasFeeEstimates,
    });

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$15',
      preciseNativeCurrencyFee: '15',
    });

    const { result } = renderHook(() =>
      useGasFeeEstimateLevelOptions({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    const highOption = result.current.find((option) => option.key === 'high');
    expect(highOption).toBeDefined();

    highOption?.onSelect();

    expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith('test-id', {
      userFeeLevel: 'high',
    });
    expect(mockHandleCloseModals).toHaveBeenCalled();
  });

  it('excludes high option when medium and high have identical fees for FeeMarket estimates', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithFeeMarketEstimates = {
      ...simpleSendTransaction,
      id: 'test-id',
      userFeeLevel: 'medium',
      txParams: {
        ...simpleSendTransaction.txParams,
        type: TransactionEnvelopeType.feeMarket,
      },
      gasFeeEstimates: {
        type: GasFeeEstimateType.FeeMarket,
        low: {
          maxFeePerGas: '0x1',
          maxPriorityFeePerGas: '0x1',
        },
        medium: {
          maxFeePerGas: '0x2',
          maxPriorityFeePerGas: '0x2',
        },
        high: {
          maxFeePerGas: '0x2',
          maxPriorityFeePerGas: '0x2',
        },
      },
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithFeeMarketEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        low: {
          minWaitTimeEstimate: 60000,
          maxWaitTimeEstimate: 120000,
          suggestedMaxPriorityFeePerGas: '1',
        },
        medium: {
          minWaitTimeEstimate: 30000,
          maxWaitTimeEstimate: 60000,
          suggestedMaxPriorityFeePerGas: '2',
        },
        high: {
          minWaitTimeEstimate: 15000,
          maxWaitTimeEstimate: 30000,
          suggestedMaxPriorityFeePerGas: '2',
        },
      } as unknown as GasFeeEstimates,
    });

    mockCalculateGasEstimate.mockImplementation(({ feePerGas }) => {
      const value = feePerGas === '0x1' ? '5' : '10';
      const valueInFiat = feePerGas === '0x1' ? '$5' : '$10';

      return {
        currentCurrencyFee: valueInFiat,
        preciseNativeCurrencyFee: value,
      };
    });

    const { result } = renderHook(() =>
      useGasFeeEstimateLevelOptions({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current.length).toEqual(2);

    const lowOption = result.current.find((option) => option.key === 'low');
    expect(lowOption).toBeDefined();

    const mediumOption = result.current.find(
      (option) => option.key === 'medium',
    );
    expect(mediumOption).toBeDefined();

    const highOption = result.current.find((option) => option.key === 'high');
    expect(highOption).toBeUndefined();
  });
});
