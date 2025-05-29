import {
  TransactionEnvelopeType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { renderHook } from '@testing-library/react-hooks';
import { merge } from 'lodash';

import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { simpleSendTransaction } from '../../../../mock-data/transaction-controller-mock';
import { useFeeCalculations } from '../../../../hooks/gas/useFeeCalculations';
import { useAdvancedGasFeeOption } from './useAdvancedGasFeeOption';

jest.mock('../../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../../hooks/gas/useFeeCalculations');

describe('useAdvancedGasFeeOption', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseFeeCalculations = jest.mocked(useFeeCalculations);
  const mockCalculateGasEstimate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue(
      simpleSendTransaction as TransactionMeta,
    );
    mockUseFeeCalculations.mockReturnValue({
      calculateGasEstimate: mockCalculateGasEstimate,
    } as unknown as ReturnType<typeof useFeeCalculations>);
  });

  it('returns advanced gas fee option', () => {
    const mockSetActiveModal = jest.fn();

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '10',
      preciseNativeCurrencyFee: '10',
    });

    const { result } = renderHook(() =>
      useAdvancedGasFeeOption({
        setActiveModal: mockSetActiveModal,
      }),
    );

    expect(result.current).toEqual(expect.any(Array));
    expect(result.current.length).toEqual(1);

    const advancedGasFeeOption = result.current[0];
    expect(advancedGasFeeOption.key).toEqual('advanced');
    expect(advancedGasFeeOption.value).toEqual('');
    expect(advancedGasFeeOption.valueInFiat).toEqual('--');
    expect(advancedGasFeeOption.isSelected).toEqual(false);
  });

  it('returns selected advanced gas fee option', () => {
    const mockSetActiveModal = jest.fn();

    const selectedTransactionMeta = merge(simpleSendTransaction, {
      userFeeLevel: 'custom',
    }) as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(selectedTransactionMeta);

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$10',
      preciseNativeCurrencyFee: '10',
    });

    const { result } = renderHook(() =>
      useAdvancedGasFeeOption({
        setActiveModal: mockSetActiveModal,
      }),
    );

    expect(result.current).toEqual(expect.any(Array));
    expect(result.current.length).toEqual(1);

    const advancedGasFeeOption = result.current[0];
    expect(advancedGasFeeOption.key).toEqual('advanced');
    expect(advancedGasFeeOption.isSelected).toEqual(true);
    expect(advancedGasFeeOption.value).toEqual('10');
    expect(advancedGasFeeOption.valueInFiat).toEqual('$10');
  });

  it('calls calculateGasEstimate with shouldUseEIP1559FeeLogic as false when transaction is legacy', () => {
    const mockSetActiveModal = jest.fn();

    const selectedTransactionMeta = merge(simpleSendTransaction, {
      userFeeLevel: 'custom',
      txParams: {
        type: TransactionEnvelopeType.legacy,
      },
    }) as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(selectedTransactionMeta);

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$10',
      preciseNativeCurrencyFee: '10',
    });

    renderHook(() =>
      useAdvancedGasFeeOption({
        setActiveModal: mockSetActiveModal,
      }),
    );

    expect(mockCalculateGasEstimate).toHaveBeenCalledWith(
      expect.objectContaining({
        shouldUseEIP1559FeeLogic: false,
      }),
    );
  });
});
