import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  ConfirmationContextProvider,
  useConfirmationContext,
} from './confirmation-context';
import { useTransactionBridgeQuotes } from '../../hooks/pay/useTransactionBridgeQuotes';
import { TransactionBridgeQuote } from '../../utils/bridge';

jest.mock('../../hooks/pay/useTransactionBridgeQuotes');

const QUOTES_MOCK = [{ quote: { srcChainId: 1 } }] as TransactionBridgeQuote[];

describe('ConfirmationContext', () => {
  const useTransactionBridgeQuotesMock = jest.mocked(
    useTransactionBridgeQuotes,
  );

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ConfirmationContextProvider>{children}</ConfirmationContextProvider>
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionBridgeQuotesMock.mockReturnValue({
      quotes: [],
      loading: false,
    });
  });

  it('provides initial values', () => {
    const { result } = renderHook(() => useConfirmationContext(), { wrapper });

    expect(result.current.quotes).toEqual([]);
    expect(result.current.quotesLoading).toBe(false);
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

  it('returns quotes and quotesLoading from hook', () => {
    useTransactionBridgeQuotesMock.mockReturnValue({
      quotes: QUOTES_MOCK,
      loading: true,
    });

    const { result } = renderHook(() => useConfirmationContext(), { wrapper });

    expect(result.current.quotes).toEqual(QUOTES_MOCK);
    expect(result.current.quotesLoading).toBe(true);
  });
});
