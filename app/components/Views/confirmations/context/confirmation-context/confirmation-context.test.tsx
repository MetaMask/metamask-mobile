import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
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
      isFooterVisible: true,
      isTransactionValueUpdating: false,
      setIsFooterVisible: expect.any(Function),
      setIsTransactionValueUpdating: expect.any(Function),
    });
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

    result.current.setIsFooterVisible(false);

    expect(result.current.isFooterVisible).toBe(false);
  });
});
