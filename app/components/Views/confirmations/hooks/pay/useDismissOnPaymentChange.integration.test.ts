import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { useDismissOnFiatPaymentChange } from './useDismissOnFiatPaymentChange';
import { useDismissOnPayTokenChange } from './useDismissOnPayTokenChange';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useTransactionPayToken } from './useTransactionPayToken';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('./useTransactionPayData');
jest.mock('./useTransactionPayToken');

const TOKEN_A: TransactionPaymentToken = {
  address: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
  balanceFiat: '$12.34',
  balanceHuman: '12.34',
  balanceRaw: '12340000',
  balanceUsd: '12.34',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
};

const TOKEN_B: TransactionPaymentToken = {
  address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex,
  balanceFiat: '$20.00',
  balanceHuman: '20',
  balanceRaw: '20000000',
  balanceUsd: '20',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'POL',
};

describe('useDismissOnPayTokenChange + useDismissOnFiatPaymentChange (shared latch)', () => {
  const useNavigationMock = jest.mocked(useNavigation);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const goBackMock = jest.fn();
  const setPayTokenMock: jest.MockedFn<
    ReturnType<typeof useTransactionPayToken>['setPayToken']
  > = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useNavigationMock.mockReturnValue({
      goBack: goBackMock,
    } as never);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_A,
      setPayToken: setPayTokenMock,
    });

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-google-pay',
    });
  });

  it('fires goBack only once when both payToken and selectedPaymentMethodId change in the same render', () => {
    const sharedRef: React.RefObject<boolean> = { current: false };

    const { rerender } = renderHook(() => {
      useDismissOnPayTokenChange(sharedRef);
      useDismissOnFiatPaymentChange(sharedRef);
    });

    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_B,
      setPayToken: setPayTokenMock,
    });
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: undefined,
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
    expect(sharedRef.current).toBe(true);
  });

  it('fires goBack only once when only payToken changes', () => {
    const sharedRef: React.RefObject<boolean> = { current: false };

    const { rerender } = renderHook(() => {
      useDismissOnPayTokenChange(sharedRef);
      useDismissOnFiatPaymentChange(sharedRef);
    });

    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_B,
      setPayToken: setPayTokenMock,
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('fires goBack only once when only selectedPaymentMethodId changes', () => {
    const sharedRef: React.RefObject<boolean> = { current: false };

    const { rerender } = renderHook(() => {
      useDismissOnPayTokenChange(sharedRef);
      useDismissOnFiatPaymentChange(sharedRef);
    });

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-apple-pay',
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('does not fire goBack again on a subsequent change after the first dismissal', () => {
    const sharedRef: React.RefObject<boolean> = { current: false };

    const { rerender } = renderHook(() => {
      useDismissOnPayTokenChange(sharedRef);
      useDismissOnFiatPaymentChange(sharedRef);
    });

    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_B,
      setPayToken: setPayTokenMock,
    });

    rerender();

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-apple-pay',
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
  });
});
