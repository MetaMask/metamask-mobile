import { TransactionMeta } from '@metamask/transaction-controller';
import { renderHook } from '@testing-library/react-hooks';

import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { simpleSendTransaction } from '../../__mocks__/controllers/transaction-controller-mock';
import { useFeeCalculations } from './useFeeCalculations';
import { MMM_ORIGIN } from '../../constants/confirmations';
import { updateTransactionGasFees } from '../../../../../util/transaction-controller';
import { useDappSuggestedGasFeeOption } from './useDappSuggestedGasFeeOption';

jest.mock('../../../../../util/transaction-controller');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useFeeCalculations');

describe('useDappSuggestedGasFeeOption', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseFeeCalculations = jest.mocked(useFeeCalculations);
  const mockUpdateTransactionGasFees = jest.mocked(updateTransactionGasFees);
  const mockCalculateGasEstimate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...simpleSendTransaction,
      dappSuggestedGasFees: undefined,
    } as unknown as TransactionMeta);

    mockUseFeeCalculations.mockReturnValue({
      calculateGasEstimate: mockCalculateGasEstimate,
    } as unknown as ReturnType<typeof useFeeCalculations>);
  });

  it('returns empty array when no dapp suggested gas fees', () => {
    const mockHandleCloseModals = jest.fn();

    const { result } = renderHook(() =>
      useDappSuggestedGasFeeOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current).toEqual([]);
  });

  it('returns empty array when origin is MMM_ORIGIN', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithMMMOrigin = {
      ...simpleSendTransaction,
      origin: MMM_ORIGIN,
      dappSuggestedGasFees: {
        gasPrice: '0x1',
      },
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(transactionWithMMMOrigin);

    const { result } = renderHook(() =>
      useDappSuggestedGasFeeOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current).toEqual([]);
  });

  it('returns dapp suggested gas fee option with EIP1559 parameters', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithDappSuggestedGasFees = {
      ...simpleSendTransaction,
      origin: 'some-dapp.com',
      userFeeLevel: 'medium',
      dappSuggestedGasFees: {
        maxFeePerGas: '0x1',
        maxPriorityFeePerGas: '0x1',
      },
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithDappSuggestedGasFees,
    );

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$10',
      preciseNativeCurrencyFee: '10',
    });

    const { result } = renderHook(() =>
      useDappSuggestedGasFeeOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current.length).toEqual(1);

    const dappSuggestedGasFeeOption = result.current[0];
    expect(dappSuggestedGasFeeOption.key).toEqual('site_suggested');
    expect(dappSuggestedGasFeeOption.isSelected).toEqual(false);
    expect(dappSuggestedGasFeeOption.value).toEqual('10');
    expect(dappSuggestedGasFeeOption.valueInFiat).toEqual('$10');

    expect(mockCalculateGasEstimate).toHaveBeenCalledWith(
      expect.objectContaining({
        feePerGas: '0x1',
        priorityFeePerGas: '0x1',
        shouldUseEIP1559FeeLogic: true,
      }),
    );
  });

  it('returns dapp suggested gas fee option with legacy parameters', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithDappSuggestedGasFees = {
      ...simpleSendTransaction,
      origin: 'some-dapp.com',
      userFeeLevel: 'medium',
      dappSuggestedGasFees: {
        gasPrice: '0x1',
        gas: '0x5208',
      },
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithDappSuggestedGasFees,
    );

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$5',
      preciseNativeCurrencyFee: '5',
    });

    const { result } = renderHook(() =>
      useDappSuggestedGasFeeOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current.length).toEqual(1);

    const dappSuggestedGasFeeOption = result.current[0];
    expect(dappSuggestedGasFeeOption.key).toEqual('site_suggested');
    expect(dappSuggestedGasFeeOption.isSelected).toEqual(false);
    expect(dappSuggestedGasFeeOption.value).toEqual('5');
    expect(dappSuggestedGasFeeOption.valueInFiat).toEqual('$5');

    expect(mockCalculateGasEstimate).toHaveBeenCalledWith(
      expect.objectContaining({
        gasPrice: '0x1',
        gas: '0x5208',
        shouldUseEIP1559FeeLogic: false,
      }),
    );
  });

  it('returns selected dapp suggested gas fee option when userFeeLevel is dappSuggested', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithDappSuggestedGasFees = {
      ...simpleSendTransaction,
      origin: 'some-dapp.com',
      userFeeLevel: 'dappSuggested',
      dappSuggestedGasFees: {
        maxFeePerGas: '0x1',
        maxPriorityFeePerGas: '0x1',
      },
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithDappSuggestedGasFees,
    );

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$10',
      preciseNativeCurrencyFee: '10',
    });

    const { result } = renderHook(() =>
      useDappSuggestedGasFeeOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current.length).toEqual(1);

    const dappSuggestedGasFeeOption = result.current[0];
    expect(dappSuggestedGasFeeOption.isSelected).toEqual(true);
  });

  it('updates transaction gas fees and closes modals when option is selected', () => {
    const mockHandleCloseModals = jest.fn();

    const transactionWithDappSuggestedGasFees = {
      ...simpleSendTransaction,
      id: 'test-id',
      origin: 'some-dapp.com',
      userFeeLevel: 'medium',
      dappSuggestedGasFees: {
        maxFeePerGas: '0x1',
        maxPriorityFeePerGas: '0x1',
      },
    } as unknown as TransactionMeta;

    mockUseTransactionMetadataRequest.mockReturnValue(
      transactionWithDappSuggestedGasFees,
    );

    mockCalculateGasEstimate.mockReturnValue({
      currentCurrencyFee: '$10',
      preciseNativeCurrencyFee: '10',
    });

    const { result } = renderHook(() =>
      useDappSuggestedGasFeeOption({
        handleCloseModals: mockHandleCloseModals,
      }),
    );

    expect(result.current.length).toEqual(1);

    const dappSuggestedGasFeeOption = result.current[0];
    dappSuggestedGasFeeOption.onSelect();

    expect(mockUpdateTransactionGasFees).toHaveBeenCalledWith('test-id', {
      userFeeLevel: 'dappSuggested',
      maxFeePerGas: '0x1',
      maxPriorityFeePerGas: '0x1',
    });
    expect(mockHandleCloseModals).toHaveBeenCalled();
  });
});
