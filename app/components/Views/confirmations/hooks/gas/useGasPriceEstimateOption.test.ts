import {
  GasFeeEstimateType,
  TransactionEnvelopeType,
  TransactionMeta,
  type GasPriceGasFeeEstimates,
} from '@metamask/transaction-controller';
import { renderHook } from '@testing-library/react-hooks';
import { type GasFeeEstimates } from '@metamask/gas-fee-controller';

import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { simpleSendTransaction } from '../../__mocks__/controllers/transaction-controller-mock';
import { useFeeCalculations } from './useFeeCalculations';
import { useGasFeeEstimates } from './useGasFeeEstimates';
import { updateTransactionGasFees } from '../../../../../util/transaction-controller';
import { useGasPriceEstimateOption } from './useGasPriceEstimateOption';

jest.mock('../../../../../util/transaction-controller');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useFeeCalculations');
jest.mock('./useGasFeeEstimates');

describe('useGasPriceEstimateOption', () => {
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

  it('returns empty array when transaction gas fee estimates type is not GasPrice', () => {
    const mockHandleCloseModals = jest.fn();

    const { result } = renderHook(() =>
      useGasPriceEstimateOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current).toEqual([]);
  });

  it('returns empty array when network gas fee estimates are missing', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithGasPriceEstimates = {
      ...simpleSendTransaction,
      gasFeeEstimates: {
        type: GasFeeEstimateType.GasPrice,
        gasPrice: '0x1',
      } as GasPriceGasFeeEstimates,
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithGasPriceEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: undefined as unknown as GasFeeEstimates,
    });

    const { result } = renderHook(() =>
      useGasPriceEstimateOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current).toEqual([]);
  });

  it('returns gas price estimate option for legacy transaction', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithGasPriceEstimates = {
      ...simpleSendTransaction,
      id: 'test-id',
      userFeeLevel: 'high', // Not 'medium' to test unselected state
      txParams: {
        ...simpleSendTransaction.txParams,
        type: TransactionEnvelopeType.legacy,
      },
      gasFeeEstimates: {
        type: GasFeeEstimateType.GasPrice,
        gasPrice: '0x1',
      } as GasPriceGasFeeEstimates,
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithGasPriceEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        low: { suggestedMaxPriorityFeePerGas: '1' },
        medium: { suggestedMaxPriorityFeePerGas: '2' },
        high: { suggestedMaxPriorityFeePerGas: '3' },
      } as unknown as GasFeeEstimates,
    });

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$10',
      preciseNativeCurrencyFee: '10',
    });

    const { result } = renderHook(() =>
      useGasPriceEstimateOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current.length).toEqual(1);

    const gasPriceEstimateOption = result.current[0];
    expect(gasPriceEstimateOption.key).toEqual('gasPrice');
    expect(gasPriceEstimateOption.isSelected).toEqual(false);
    expect(gasPriceEstimateOption.value).toEqual('10');
    expect(gasPriceEstimateOption.valueInFiat).toEqual('$10');

    expect(mockCalculateGasEstimate).toHaveBeenCalledWith(
      expect.objectContaining({
        gasPrice: '0x1',
        shouldUseEIP1559FeeLogic: false,
      }),
    );
  });

  it('returns gas price estimate option for EIP1559 transaction', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithGasPriceEstimates = {
      ...simpleSendTransaction,
      id: 'test-id',
      userFeeLevel: 'high', // Not 'medium' to test unselected state
      txParams: {
        ...simpleSendTransaction.txParams,
        type: TransactionEnvelopeType.feeMarket,
      },
      gasFeeEstimates: {
        type: GasFeeEstimateType.GasPrice,
        gasPrice: '0x1',
      } as GasPriceGasFeeEstimates,
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithGasPriceEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        low: { suggestedMaxPriorityFeePerGas: '1' },
        medium: { suggestedMaxPriorityFeePerGas: '2' },
        high: { suggestedMaxPriorityFeePerGas: '3' },
      } as unknown as GasFeeEstimates,
    });

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$8',
      preciseNativeCurrencyFee: '8',
    });

    const { result } = renderHook(() =>
      useGasPriceEstimateOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current.length).toEqual(1);

    const gasPriceEstimateOption = result.current[0];
    expect(gasPriceEstimateOption.key).toEqual('gasPrice');
    expect(gasPriceEstimateOption.isSelected).toEqual(false);
    expect(gasPriceEstimateOption.value).toEqual('8');
    expect(gasPriceEstimateOption.valueInFiat).toEqual('$8');

    expect(mockCalculateGasEstimate).toHaveBeenCalledWith(
      expect.objectContaining({
        feePerGas: '0x1',
        priorityFeePerGas: '0x1',
        shouldUseEIP1559FeeLogic: true,
      }),
    );
  });

  it('returns selected gas price estimate option when userFeeLevel is medium', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithGasPriceEstimates = {
      ...simpleSendTransaction,
      id: 'test-id',
      userFeeLevel: 'medium',
      txParams: {
        ...simpleSendTransaction.txParams,
        type: TransactionEnvelopeType.legacy,
      },
      gasFeeEstimates: {
        type: GasFeeEstimateType.GasPrice,
        gasPrice: '0x1',
      } as GasPriceGasFeeEstimates,
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithGasPriceEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        low: { suggestedMaxPriorityFeePerGas: '1' },
        medium: { suggestedMaxPriorityFeePerGas: '2' },
        high: { suggestedMaxPriorityFeePerGas: '3' },
      } as unknown as GasFeeEstimates,
    });

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$10',
      preciseNativeCurrencyFee: '10',
    });

    const { result } = renderHook(() =>
      useGasPriceEstimateOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current.length).toEqual(1);

    const gasPriceEstimateOption = result.current[0];
    expect(gasPriceEstimateOption.isSelected).toEqual(true);
  });

  it('updates transaction gas fees for legacy transaction when option is selected', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithGasPriceEstimates = {
      ...simpleSendTransaction,
      id: 'test-id',
      userFeeLevel: 'high', // Not 'medium' to test unselected state
      txParams: {
        ...simpleSendTransaction.txParams,
        type: TransactionEnvelopeType.legacy,
      },
      gasFeeEstimates: {
        type: GasFeeEstimateType.GasPrice,
        gasPrice: '0x1',
      } as GasPriceGasFeeEstimates,
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithGasPriceEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        low: { suggestedMaxPriorityFeePerGas: '1' },
        medium: { suggestedMaxPriorityFeePerGas: '2' },
        high: { suggestedMaxPriorityFeePerGas: '3' },
      } as unknown as GasFeeEstimates,
    });

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$10',
      preciseNativeCurrencyFee: '10',
    });

    const { result } = renderHook(() =>
      useGasPriceEstimateOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current.length).toEqual(1);

    const gasPriceEstimateOption = result.current[0];
    gasPriceEstimateOption.onSelect();

    expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith('test-id', {
      userFeeLevel: 'medium',
      gasPrice: '0x1',
    });
    expect(mockHandleCloseModals).toHaveBeenCalled();
  });

  it('updates transaction gas fees for EIP1559 transaction when option is selected', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithGasPriceEstimates = {
      ...simpleSendTransaction,
      id: 'test-id',
      userFeeLevel: 'high', // Not 'medium' to test unselected state
      txParams: {
        ...simpleSendTransaction.txParams,
        type: TransactionEnvelopeType.feeMarket,
      },
      gasFeeEstimates: {
        type: GasFeeEstimateType.GasPrice,
        gasPrice: '0x1',
      } as GasPriceGasFeeEstimates,
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithGasPriceEstimates,
    );

    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        low: { suggestedMaxPriorityFeePerGas: '1' },
        medium: { suggestedMaxPriorityFeePerGas: '2' },
        high: { suggestedMaxPriorityFeePerGas: '3' },
      } as unknown as GasFeeEstimates,
    });

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$8',
      preciseNativeCurrencyFee: '8',
    });

    const { result } = renderHook(() =>
      useGasPriceEstimateOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current.length).toEqual(1);

    const gasPriceEstimateOption = result.current[0];
    gasPriceEstimateOption.onSelect();

    expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith('test-id', {
      userFeeLevel: 'medium',
      maxFeePerGas: '0x1',
      maxPriorityFeePerGas: '0x1',
    });
    expect(mockHandleCloseModals).toHaveBeenCalled();
  });
});
