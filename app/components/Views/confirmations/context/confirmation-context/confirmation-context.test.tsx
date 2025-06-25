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

    expect(result.current.isTransactionValueUpdating).toBe(false);
    expect(typeof result.current.setIsTransactionValueUpdating).toBe(
      'function',
    );
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
});
