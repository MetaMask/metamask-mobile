import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import {
  ConfirmationContextProvider,
  useConfirmationContext,
} from './confirmation-context';

describe('ConfirmationContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ConfirmationContextProvider>{children}</ConfirmationContextProvider>
  );

  it('provides initial values', () => {
    const { result } = renderHook(() => useConfirmationContext(), { wrapper });

    expect(result.current).toStrictEqual({
      mmPayRequestInProgressNavHandler: expect.objectContaining({
        current: false,
      }),
      navHeaderConfig: null,
      headlessBuyError: undefined,
      isFooterVisible: undefined,
      isConfirmationSubmitting: false,
      isConfirmationSubmittingRef: { current: false },
      isHeadlessBuyInProgress: false,
      isTransactionDataUpdating: false,
      isTransactionValueUpdating: false,
      setNavHeaderConfig: expect.any(Function),
      setHeadlessBuyError: expect.any(Function),
      setIsFooterVisible: expect.any(Function),
      setIsConfirmationSubmitting: expect.any(Function),
      setIsHeadlessBuyInProgress: expect.any(Function),
      setIsTransactionDataUpdating: expect.any(Function),
      setIsTransactionValueUpdating: expect.any(Function),
    });
  });

  it('updates navHeaderConfig when calling setNavHeaderConfig', () => {
    const { result } = renderHook(() => useConfirmationContext(), { wrapper });

    act(() => {
      result.current.setNavHeaderConfig({
        title: 'Add funds',
        addBackButton: true,
      });
    });

    expect(result.current.navHeaderConfig).toStrictEqual({
      title: 'Add funds',
      addBackButton: true,
    });

    act(() => {
      result.current.setNavHeaderConfig(null);
    });

    expect(result.current.navHeaderConfig).toBeNull();
  });

  it('updates isTransactionValueUpdating state when calling setIsTransactionValueUpdating', () => {
    const { result } = renderHook(() => useConfirmationContext(), { wrapper });

    act(() => {
      result.current.setIsTransactionValueUpdating(true);
    });

    expect(result.current.isTransactionValueUpdating).toBe(true);

    act(() => {
      result.current.setIsTransactionValueUpdating(false);
    });

    expect(result.current.isTransactionValueUpdating).toBe(false);
  });

  it('updates isFooterVisible state when calling setIsFooterVisible', () => {
    const { result } = renderHook(() => useConfirmationContext(), { wrapper });

    act(() => {
      result.current.setIsFooterVisible(false);
    });

    expect(result.current.isFooterVisible).toBe(false);
  });

  it('updates isHeadlessBuyInProgress state when calling setIsHeadlessBuyInProgress', () => {
    const { result } = renderHook(() => useConfirmationContext(), { wrapper });

    act(() => {
      result.current.setIsHeadlessBuyInProgress(true);
    });

    expect(result.current.isHeadlessBuyInProgress).toBe(true);

    act(() => {
      result.current.setIsHeadlessBuyInProgress(false);
    });

    expect(result.current.isHeadlessBuyInProgress).toBe(false);
  });

  it('updates isTransactionDataUpdating state when calling setIsTransactionDataUpdating', () => {
    const { result } = renderHook(() => useConfirmationContext(), { wrapper });

    act(() => {
      result.current.setIsTransactionDataUpdating(true);
    });

    expect(result.current.isTransactionDataUpdating).toBe(true);

    act(() => {
      result.current.setIsTransactionDataUpdating(false);
    });

    expect(result.current.isTransactionDataUpdating).toBe(false);
  });

  it('updates isConfirmationSubmitting state when calling setIsConfirmationSubmitting', () => {
    const { result } = renderHook(() => useConfirmationContext(), { wrapper });

    act(() => {
      result.current.setIsConfirmationSubmitting(true);
      expect(result.current.isConfirmationSubmittingRef.current).toBe(true);
    });

    expect(result.current.isConfirmationSubmitting).toBe(true);
    expect(result.current.isConfirmationSubmittingRef.current).toBe(true);

    act(() => {
      result.current.setIsConfirmationSubmitting(false);
      expect(result.current.isConfirmationSubmittingRef.current).toBe(false);
    });

    expect(result.current.isConfirmationSubmitting).toBe(false);
    expect(result.current.isConfirmationSubmittingRef.current).toBe(false);
  });
});
