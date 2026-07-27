import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCardTransactions } from './useCardTransactions';
import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

const mockListTransactions = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      listTransactions: (...args: unknown[]) => mockListTransactions(...args),
    },
  },
}));

const createTx = (id: string): CardTransaction => ({
  id,
  providerId: 'baanx',
  timestamp: Date.now(),
  status: CardTransactionStatus.Completed,
  type: CardTransactionType.Purchase,
  isDebit: true,
  billingAmount: { value: '1.00', currency: 'USD' },
  fundingSources: [],
});

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe('useCardTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('flattens paginated items and exposes hasMore from nextCursor', async () => {
    mockListTransactions.mockResolvedValueOnce({
      items: [createTx('a'), createTx('b')],
      nextCursor: 'cursor-1',
    });

    const { result } = renderHook(() => useCardTransactions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items.map((tx) => tx.id)).toEqual(['a', 'b']);
    expect(result.current.hasMore).toBe(true);
    expect(mockListTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, searchQuery: undefined }),
    );
  });

  it('passes debounced searchQuery to listTransactions', async () => {
    jest.useFakeTimers();
    mockListTransactions.mockResolvedValue({
      items: [],
      nextCursor: undefined,
    });

    const { result, rerender } = renderHook(
      ({ searchQuery }) => useCardTransactions({ searchQuery }),
      {
        wrapper: createWrapper(),
        initialProps: { searchQuery: '' },
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    rerender({ searchQuery: 'coffee' });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockListTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ searchQuery: 'coffee' }),
      );
    });
  });
});
