import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import Engine from '../../../../../../core/Engine';
import { selectPaymentOverrideByTransactionId } from '../../../../../../selectors/transactionPayController';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import { useClearPaymentOverride } from './useClearPaymentOverride';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
    },
  },
}));

const TRANSACTION_ID = 'tx-1';

describe('useClearPaymentOverride', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const setTransactionConfigMock = jest.mocked(
    Engine.context.TransactionPayController.setTransactionConfig,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID,
    } as never);
  });

  it('clears paymentOverride and refundTo when override is active', () => {
    useSelectorMock.mockReturnValue(PaymentOverride.MoneyAccount);

    const { result } = renderHook(() => useClearPaymentOverride());

    act(() => {
      result.current();
    });

    expect(setTransactionConfigMock).toHaveBeenCalledWith(
      TRANSACTION_ID,
      expect.any(Function),
    );

    const config = {
      refundTo: '0xsomeaddress',
    } as Record<string, unknown>;
    setTransactionConfigMock.mock.calls[0][1](config as never);

    expect(config.paymentOverride).toBeUndefined();
    expect(config.refundTo).toBeUndefined();
  });

  it('does not call setTransactionConfig when no override is active', () => {
    useSelectorMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useClearPaymentOverride());

    act(() => {
      result.current();
    });

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });

  it('does not call setTransactionConfig when transactionId is empty', () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);
    useSelectorMock.mockReturnValue(PaymentOverride.MoneyAccount);

    const { result } = renderHook(() => useClearPaymentOverride());

    act(() => {
      result.current();
    });

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });
});
