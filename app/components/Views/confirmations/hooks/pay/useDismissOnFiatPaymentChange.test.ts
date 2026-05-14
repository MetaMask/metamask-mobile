import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { useDismissOnFiatPaymentChange } from './useDismissOnFiatPaymentChange';
import { useTransactionPayFiatPayment } from './useTransactionPayData';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('./useTransactionPayData');

describe('useDismissOnFiatPaymentChange', () => {
  const useNavigationMock = jest.mocked(useNavigation);
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const goBackMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useNavigationMock.mockReturnValue({
      goBack: goBackMock,
    } as never);

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
    });
  });

  it('does not dismiss on initial render', () => {
    renderHook(() => useDismissOnFiatPaymentChange());

    expect(goBackMock).not.toHaveBeenCalled();
  });

  it('does not dismiss when re-rendered with the same selected payment method id', () => {
    const { rerender } = renderHook(() => useDismissOnFiatPaymentChange());

    rerender();

    expect(goBackMock).not.toHaveBeenCalled();
  });

  it('dismisses when the selected payment method id changes to a different id', () => {
    const { rerender } = renderHook(() => useDismissOnFiatPaymentChange());

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-apple-pay',
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the selected payment method id transitions from defined to undefined', () => {
    const { rerender } = renderHook(() => useDismissOnFiatPaymentChange());

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: undefined,
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the selected payment method id transitions from undefined to defined', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: undefined,
    });

    const { rerender } = renderHook(() => useDismissOnFiatPaymentChange());

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss when fiat payment state is undefined on both renders', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);

    const { rerender } = renderHook(() => useDismissOnFiatPaymentChange());

    rerender();

    expect(goBackMock).not.toHaveBeenCalled();
  });

  it('dismisses when fiat payment state goes from undefined to a selected id', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);

    const { rerender } = renderHook(() => useDismissOnFiatPaymentChange());

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss again on subsequent changes after the first dismissal', () => {
    const { rerender } = renderHook(() => useDismissOnFiatPaymentChange());

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-apple-pay',
    });

    rerender();

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: undefined,
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('respects an external shared dismissed ref and does not dismiss when already latched', () => {
    const sharedRef: React.RefObject<boolean> = { current: true };

    const { rerender } = renderHook(() =>
      useDismissOnFiatPaymentChange(sharedRef),
    );

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-apple-pay',
    });

    rerender();

    expect(goBackMock).not.toHaveBeenCalled();
  });

  it('sets the external shared dismissed ref to true when it fires', () => {
    const sharedRef: React.RefObject<boolean> = { current: false };

    const { rerender } = renderHook(() =>
      useDismissOnFiatPaymentChange(sharedRef),
    );

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-apple-pay',
    });

    rerender();

    expect(goBackMock).toHaveBeenCalledTimes(1);
    expect(sharedRef.current).toBe(true);
  });
});
