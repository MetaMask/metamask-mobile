import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useCardFreeze from './useCardFreeze';
import Engine from '../../../../core/Engine';

const mockFreezeCard = jest.fn();
const mockUnfreezeCard = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      freezeCard: jest.fn(),
      unfreezeCard: jest.fn(),
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useCardFreeze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFreezeCard.mockResolvedValue(undefined);
    mockUnfreezeCard.mockResolvedValue(undefined);
    (Engine.context.CardController.freezeCard as jest.Mock) = mockFreezeCard;
    (Engine.context.CardController.unfreezeCard as jest.Mock) =
      mockUnfreezeCard;
  });

  describe('freeze', () => {
    it('calls CardController.freezeCard with the provided cardId', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCardFreeze('card-123'), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.freeze.mutateAsync(undefined);
      });

      expect(mockFreezeCard).toHaveBeenCalledWith('card-123');
      expect(mockFreezeCard).toHaveBeenCalledTimes(1);
    });

    it('throws when cardId is undefined', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCardFreeze(undefined), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await expect(
          result.current.freeze.mutateAsync(undefined),
        ).rejects.toThrow('Cannot freeze: no card ID');
      });

      expect(mockFreezeCard).not.toHaveBeenCalled();
    });

    it('freeze.isPending is true while freezeCard is in-flight', async () => {
      let resolveFreeze: () => void = () => undefined;
      mockFreezeCard.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveFreeze = resolve;
        }),
      );

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCardFreeze('card-123'), {
        wrapper: Wrapper,
      });

      expect(result.current.freeze.isPending).toBe(false);

      act(() => {
        result.current.freeze.mutate(undefined);
      });

      await waitFor(() => {
        expect(result.current.freeze.isPending).toBe(true);
      });

      await act(async () => {
        resolveFreeze();
      });

      await waitFor(() => {
        expect(result.current.freeze.isPending).toBe(false);
      });
    });
  });

  describe('unfreeze', () => {
    it('calls CardController.unfreezeCard with the provided cardId', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCardFreeze('card-456'), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.unfreeze.mutateAsync(undefined);
      });

      expect(mockUnfreezeCard).toHaveBeenCalledWith('card-456');
      expect(mockUnfreezeCard).toHaveBeenCalledTimes(1);
    });

    it('throws when cardId is undefined', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCardFreeze(undefined), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await expect(
          result.current.unfreeze.mutateAsync(undefined),
        ).rejects.toThrow('Cannot unfreeze: no card ID');
      });

      expect(mockUnfreezeCard).not.toHaveBeenCalled();
    });

    it('unfreeze.isError is true when unfreezeCard rejects', async () => {
      mockUnfreezeCard.mockRejectedValue(new Error('unfreeze failed'));
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCardFreeze('card-123'), {
        wrapper: Wrapper,
      });

      await act(async () => {
        result.current.unfreeze.mutate(undefined);
      });

      await waitFor(() => {
        expect(result.current.unfreeze.isError).toBe(true);
      });
    });
  });
});
