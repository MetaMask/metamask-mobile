import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { useDismissOnPayTokenChange } from './useDismissOnPayTokenChange';
import { useTransactionPayToken } from './useTransactionPayToken';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
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

describe('useDismissOnPayTokenChange', () => {
  const useNavigationMock = jest.mocked(useNavigation);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
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
  });

  it('does not dismiss on initial render', () => {
    renderHook(() => useDismissOnPayTokenChange());

    expect(goBackMock).not.toHaveBeenCalled();
  });

  it('does not dismiss when re-rendered with the same token (identity-stable)', () => {
    const { rerender } = renderHook(() => useDismissOnPayTokenChange());

    rerender();

    expect(goBackMock).not.toHaveBeenCalled();
  });

  it('does not dismiss when the controller re-emits a structurally-equal token with a new identity', () => {
    const { rerender } = renderHook(() => useDismissOnPayTokenChange());

    useTransactionPayTokenMock.mockReturnValue({
      payToken: { ...TOKEN_A },
      setPayToken: setPayTokenMock,
    });

    rerender();

    expect(goBackMock).not.toHaveBeenCalled();
  });

  it('dismisses when the pay token changes to a different token', () => {
    const { rerender } = renderHook(() => useDismissOnPayTokenChange());

    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_B,
      setPayToken: setPayTokenMock,
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the pay token transitions from defined to undefined', () => {
    const { rerender } = renderHook(() => useDismissOnPayTokenChange());

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: setPayTokenMock,
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the pay token transitions from undefined to defined', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: setPayTokenMock,
    });

    const { rerender } = renderHook(() => useDismissOnPayTokenChange());

    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_A,
      setPayToken: setPayTokenMock,
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss again on subsequent token changes after the first dismissal', () => {
    const { rerender } = renderHook(() => useDismissOnPayTokenChange());

    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_B,
      setPayToken: setPayTokenMock,
    });

    rerender();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: setPayTokenMock,
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('respects an external shared dismissed ref and does not dismiss when already latched', () => {
    const sharedRef: React.RefObject<boolean> = { current: true };

    const { rerender } = renderHook(() =>
      useDismissOnPayTokenChange(sharedRef),
    );

    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_B,
      setPayToken: setPayTokenMock,
    });

    rerender();

    expect(goBackMock).not.toHaveBeenCalled();
  });

  it('sets the external shared dismissed ref to true when it fires', () => {
    const sharedRef: React.RefObject<boolean> = { current: false };

    const { rerender } = renderHook(() =>
      useDismissOnPayTokenChange(sharedRef),
    );

    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_B,
      setPayToken: setPayTokenMock,
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
    expect(sharedRef.current).toBe(true);
  });
});
