import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import useCardCancel from './useCardCancel';
import Engine from '../../../../core/Engine';

notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});

const mockCancelCard = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      cancelCard: jest.fn(),
    },
  },
}));

let activeQueryClient: QueryClient | null = null;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  activeQueryClient = queryClient;
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper };
};

describe('useCardCancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCancelCard.mockResolvedValue('cancelled');
    (Engine.context.CardController.cancelCard as jest.Mock) = mockCancelCard;
  });

  afterEach(() => {
    if (activeQueryClient) {
      activeQueryClient.getMutationCache().clear();
      activeQueryClient.getQueryCache().clear();
      activeQueryClient.clear();
      activeQueryClient = null;
    }
  });

  it('calls CardController.cancelCard with the provided cardId', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardCancel('card-123'), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(mockCancelCard).toHaveBeenCalledWith('card-123');
  });

  it('throws when cardId is undefined', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardCancel(undefined), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(result.current.mutateAsync(undefined)).rejects.toThrow(
        'Cannot cancel: no card ID',
      );
    });

    expect(mockCancelCard).not.toHaveBeenCalled();
  });
});
