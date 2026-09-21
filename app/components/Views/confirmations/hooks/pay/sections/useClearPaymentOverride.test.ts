import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { TransactionType } from '@metamask/transaction-controller';
import Engine from '../../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import { useClearPaymentOverride } from './useClearPaymentOverride';
import type { RootState } from '../../../../../../reducers';

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

  function mockSelectors({
    paymentOverride,
    isMaxAmount = false,
  }: {
    paymentOverride?: PaymentOverride;
    isMaxAmount?: boolean;
  }) {
    const state = {
      engine: {
        backgroundState: {
          TransactionPayController: {
            transactionData: {
              [TRANSACTION_ID]: {
                paymentOverride,
                isMaxAmount,
              },
            },
          },
        },
      },
    } as unknown as RootState;

    useSelectorMock.mockImplementation((selector) =>
      (selector as (s: RootState) => unknown)(state),
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID,
    } as never);
  });

  it('clears paymentOverride, refundTo, and atomic when override is active', () => {
    mockSelectors({ paymentOverride: PaymentOverride.MoneyAccount });

    const { result } = renderHook(() => useClearPaymentOverride());

    act(() => {
      result.current();
    });

    expect(setTransactionConfigMock).toHaveBeenCalledWith(
      TRANSACTION_ID,
      expect.any(Function),
    );

    const config = {
      paymentOverride: PaymentOverride.MoneyAccount,
      refundTo: '0xsomeaddress',
      atomic: false,
    } as Record<string, unknown>;
    setTransactionConfigMock.mock.calls[0][1](config as never);

    expect(config.paymentOverride).toBeUndefined();
    expect(config.refundTo).toBeUndefined();
    expect(config.atomic).toBeUndefined();
  });

  it('keeps atomic false for a max-amount money account deposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID,
      type: TransactionType.moneyAccountDeposit,
    } as never);
    mockSelectors({
      paymentOverride: PaymentOverride.MoneyAccount,
      isMaxAmount: true,
    });

    const { result } = renderHook(() => useClearPaymentOverride());

    act(() => {
      result.current();
    });

    const config = {
      paymentOverride: PaymentOverride.MoneyAccount,
      refundTo: '0xsomeaddress',
      atomic: false,
    } as Record<string, unknown>;
    setTransactionConfigMock.mock.calls[0][1](config as never);

    expect(config.paymentOverride).toBeUndefined();
    expect(config.refundTo).toBeUndefined();
    expect(config.atomic).toBe(false);
  });

  it('clears atomic for a non-max money account deposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID,
      type: TransactionType.moneyAccountDeposit,
    } as never);
    mockSelectors({
      paymentOverride: PaymentOverride.MoneyAccount,
      isMaxAmount: false,
    });

    const { result } = renderHook(() => useClearPaymentOverride());

    act(() => {
      result.current();
    });

    const config = { atomic: false } as Record<string, unknown>;
    setTransactionConfigMock.mock.calls[0][1](config as never);

    expect(config.atomic).toBeUndefined();
  });

  it('clears atomic for a max-amount non-deposit transaction', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID,
      type: TransactionType.perpsWithdraw,
    } as never);
    mockSelectors({
      paymentOverride: PaymentOverride.MoneyAccount,
      isMaxAmount: true,
    });

    const { result } = renderHook(() => useClearPaymentOverride());

    act(() => {
      result.current();
    });

    const config = { atomic: false } as Record<string, unknown>;
    setTransactionConfigMock.mock.calls[0][1](config as never);

    expect(config.atomic).toBeUndefined();
  });

  it('does not call setTransactionConfig when no override is active', () => {
    mockSelectors({ paymentOverride: undefined });

    const { result } = renderHook(() => useClearPaymentOverride());

    act(() => {
      result.current();
    });

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });

  it('does not call setTransactionConfig when transactionId is empty', () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);
    mockSelectors({ paymentOverride: PaymentOverride.MoneyAccount });

    const { result } = renderHook(() => useClearPaymentOverride());

    act(() => {
      result.current();
    });

    expect(setTransactionConfigMock).not.toHaveBeenCalled();
  });
});
