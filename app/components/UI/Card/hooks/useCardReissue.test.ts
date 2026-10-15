import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import useCardReissue from './useCardReissue';
import Engine from '../../../../core/Engine';

notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});

const mockReissueCard = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      reissueCard: jest.fn(),
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

describe('useCardReissue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReissueCard.mockResolvedValue('reissued');
    (Engine.context.CardController.reissueCard as jest.Mock) = mockReissueCard;
  });

  afterEach(() => {
    if (activeQueryClient) {
      activeQueryClient.getMutationCache().clear();
      activeQueryClient.getQueryCache().clear();
      activeQueryClient.clear();
      activeQueryClient = null;
    }
  });

  it('calls CardController.reissueCard with the provided cardId', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardReissue('card-123'), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync(undefined);
    });

    expect(mockReissueCard).toHaveBeenCalledWith('card-123');
  });

  it('throws when cardId is undefined', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCardReissue(undefined), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(result.current.mutateAsync(undefined)).rejects.toThrow(
        'Cannot reissue: no card ID',
      );
    });

    expect(mockReissueCard).not.toHaveBeenCalled();
  });
});
