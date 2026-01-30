import { renderHook, act } from '@testing-library/react-native';
import { RefObject } from 'react';
import { FlashListRef } from '@shopify/flash-list';
import { useTransactionAutoScroll } from './useTransactionAutoScroll';
import Logger from '../../../util/Logger';

// Mock Logger
jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

// Mock setTimeout/clearTimeout for more predictable testing
jest.useFakeTimers();

describe('useTransactionAutoScroll', () => {
  // Helper to create a mock FlashList ref
  const createMockListRef = <T>(): RefObject<FlashListRef<T>> => ({
    current: {
      scrollToOffset: jest.fn(),
    } as unknown as FlashListRef<T>,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('EVM transactions', () => {
    it('scrolls to top when a new EVM transaction is added', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'evm-tx-1' }],
          },
        },
      );

      // Add a new transaction at the top
      rerender({ data: [{ id: 'evm-tx-2' }, { id: 'evm-tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(listRef.current?.scrollToOffset).toHaveBeenCalledWith({
        offset: 0,
        animated: true,
      });
    });

    it('scrolls to top when a new EVM transaction replaces the first', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'evm-tx-1' }],
          },
        },
      );

      // Replace the first transaction
      rerender({ data: [{ id: 'evm-tx-2' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(listRef.current?.scrollToOffset).toHaveBeenCalledWith({
        offset: 0,
        animated: true,
      });
    });

    it('does not scroll when no new EVM transaction is added', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'evm-tx-1' }],
          },
        },
      );

      // Re-render with same data
      rerender({ data: [{ id: 'evm-tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(listRef.current?.scrollToOffset).not.toHaveBeenCalled();
    });
  });

  describe('Solana transactions', () => {
    it('scrolls to top when a new Solana transaction is added', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => `solana-${item.id}`);

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'sol-tx-1' }],
          },
        },
      );

      // Add a new Solana transaction
      rerender({ data: [{ id: 'sol-tx-2' }, { id: 'sol-tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(listRef.current?.scrollToOffset).toHaveBeenCalledWith({
        offset: 0,
        animated: true,
      });
      expect(getItemId).toHaveBeenCalled();
    });
  });

  describe('Tron transactions', () => {
    it('scrolls to top when a new Tron transaction is added', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => `tron-${item.id}`);

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'trx-tx-1' }],
          },
        },
      );

      // Add a new Tron transaction
      rerender({ data: [{ id: 'trx-tx-2' }, { id: 'trx-tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(listRef.current?.scrollToOffset).toHaveBeenCalledWith({
        offset: 0,
        animated: true,
      });
    });
  });

  describe('Bitcoin transactions', () => {
    it('scrolls to top when a new Bitcoin transaction is added', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => `btc-${item.id}`);

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'btc-tx-1' }],
          },
        },
      );

      // Add a new Bitcoin transaction
      rerender({ data: [{ id: 'btc-tx-2' }, { id: 'btc-tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(listRef.current?.scrollToOffset).toHaveBeenCalledWith({
        offset: 0,
        animated: true,
      });
    });
  });

  describe('Mixed chain transactions', () => {
    it('handles mixed transactions from different chains', () => {
      const listRef = createMockListRef<{ chain: string; id: string }>();
      const getItemId = jest.fn(
        (item: { chain: string; id: string }) => `${item.chain}-${item.id}`,
      );

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [
              { chain: 'evm', id: 'tx-1' },
              { chain: 'solana', id: 'tx-2' },
            ],
          },
        },
      );

      // Add new transaction from different chain at the top
      rerender({
        data: [
          { chain: 'bitcoin', id: 'tx-3' },
          { chain: 'evm', id: 'tx-1' },
          { chain: 'solana', id: 'tx-2' },
        ],
      });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(listRef.current?.scrollToOffset).toHaveBeenCalledWith({
        offset: 0,
        animated: true,
      });
    });
  });

  describe('User scroll prevention', () => {
    it('does not auto-scroll when user is actively scrolling', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { result, rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'tx-1' }],
          },
        },
      );

      // Simulate user scrolling
      act(() => {
        result.current.handleScroll();
      });

      // Add new transaction while user is scrolling
      rerender({ data: [{ id: 'tx-2' }, { id: 'tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should not scroll during user interaction
      expect(listRef.current?.scrollToOffset).not.toHaveBeenCalled();
    });

    it('resumes auto-scroll after user stops scrolling', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { result, rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'tx-1' }],
          },
        },
      );

      // Simulate user scrolling
      act(() => {
        result.current.handleScroll();
      });

      // Wait for user scroll debounce to complete (1000ms)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Add new transaction after user stopped scrolling
      rerender({ data: [{ id: 'tx-2' }, { id: 'tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should scroll now
      expect(listRef.current?.scrollToOffset).toHaveBeenCalledWith({
        offset: 0,
        animated: true,
      });
    });
  });

  describe('Error handling', () => {
    it('handles getItemId returning null gracefully', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn(() => null);

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'tx-1' }],
          },
        },
      );

      // Add new transaction
      rerender({ data: [{ id: 'tx-2' }, { id: 'tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should not scroll when ID is null
      expect(listRef.current?.scrollToOffset).not.toHaveBeenCalled();
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('handles getItemId throwing an error gracefully', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn(() => {
        throw new Error('Invalid transaction structure');
      });

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'tx-1' }],
          },
        },
      );

      // Add new transaction
      rerender({ data: [{ id: 'tx-2' }, { id: 'tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should not crash and log error
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'useTransactionAutoScroll: Failed to extract item ID',
      );
    });

    it('handles scrollToOffset failure gracefully', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      // Make scrollToOffset throw an error
      if (listRef.current) {
        (listRef.current.scrollToOffset as jest.Mock).mockImplementation(() => {
          throw new Error('Scroll failed');
        });
      }

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'tx-1' }],
          },
        },
      );

      // Add new transaction
      rerender({ data: [{ id: 'tx-2' }, { id: 'tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should catch error and log it
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'useTransactionAutoScroll: Auto-scroll failed',
      );
    });

    it('handles empty data array', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [] as { id: string }[],
          },
        },
      );

      // Add transactions to empty array
      rerender({ data: [{ id: 'tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should scroll when first transaction is added
      expect(listRef.current?.scrollToOffset).toHaveBeenCalledWith({
        offset: 0,
        animated: true,
      });
    });

    it('handles undefined or null items in data array', () => {
      const listRef = createMockListRef<{ id: string } | null | undefined>();
      const getItemId = jest.fn((item: { id: string } | null | undefined) => {
        if (!item) return null;
        return item.id;
      });

      renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [null, undefined, { id: 'tx-1' }],
          },
        },
      );

      // Should not crash with null/undefined items
      expect(Logger.error).not.toHaveBeenCalled();
    });
  });

  describe('Configuration options', () => {
    it('respects enabled option when set to false', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { rerender } = renderHook(
        ({ data }) =>
          useTransactionAutoScroll(data, listRef, {
            getItemId,
            enabled: false,
          }),
        {
          initialProps: {
            data: [{ id: 'tx-1' }],
          },
        },
      );

      // Add new transaction
      rerender({ data: [{ id: 'tx-2' }, { id: 'tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should not scroll when disabled
      expect(listRef.current?.scrollToOffset).not.toHaveBeenCalled();
    });

    it('respects custom delay option', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { rerender } = renderHook(
        ({ data }) =>
          useTransactionAutoScroll(data, listRef, {
            getItemId,
            delay: 300,
          }),
        {
          initialProps: {
            data: [{ id: 'tx-1' }],
          },
        },
      );

      // Add new transaction
      rerender({ data: [{ id: 'tx-2' }, { id: 'tx-1' }] });

      // Should not scroll before custom delay
      act(() => {
        jest.advanceTimersByTime(150);
      });
      expect(listRef.current?.scrollToOffset).not.toHaveBeenCalled();

      // Should scroll after custom delay
      act(() => {
        jest.advanceTimersByTime(150);
      });
      expect(listRef.current?.scrollToOffset).toHaveBeenCalledWith({
        offset: 0,
        animated: true,
      });
    });
  });

  describe('Timeout cleanup', () => {
    it('clears scroll timeout on unmount', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { unmount, rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'tx-1' }],
          },
        },
      );

      // Add new transaction to trigger scroll timeout
      rerender({ data: [{ id: 'tx-2' }, { id: 'tx-1' }] });

      // Unmount before timeout fires
      unmount();

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should not scroll after unmount
      expect(listRef.current?.scrollToOffset).not.toHaveBeenCalled();
    });

    it('clears user scroll timeout on unmount', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { result, unmount } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'tx-1' }],
          },
        },
      );

      // Trigger user scroll
      act(() => {
        result.current.handleScroll();
      });

      // Unmount before user scroll timeout fires
      unmount();

      // Advance timers - should not cause errors
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // No errors should be thrown
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('clears pending scroll timeout when new scroll is scheduled', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'tx-1' }],
          },
        },
      );

      // Add first new transaction
      rerender({ data: [{ id: 'tx-2' }, { id: 'tx-1' }] });

      // Immediately add another transaction before first scroll fires
      rerender({
        data: [{ id: 'tx-3' }, { id: 'tx-2' }, { id: 'tx-1' }],
      });

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should only scroll once (second timeout should replace first)
      expect(listRef.current?.scrollToOffset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases', () => {
    it('handles list ref being null', () => {
      const listRef: RefObject<FlashListRef<{ id: string }>> = {
        current: null,
      };
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'tx-1' }],
          },
        },
      );

      // Add new transaction
      rerender({ data: [{ id: 'tx-2' }, { id: 'tx-1' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should not crash when ref is null
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('handles rapid successive transaction additions', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'tx-1' }],
          },
        },
      );

      // Rapidly add multiple transactions
      rerender({ data: [{ id: 'tx-2' }, { id: 'tx-1' }] });
      rerender({
        data: [{ id: 'tx-3' }, { id: 'tx-2' }, { id: 'tx-1' }],
      });
      rerender({
        data: [{ id: 'tx-4' }, { id: 'tx-3' }, { id: 'tx-2' }, { id: 'tx-1' }],
      });

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should handle rapid updates gracefully
      expect(listRef.current?.scrollToOffset).toHaveBeenCalledWith({
        offset: 0,
        animated: true,
      });
    });

    it('handles transaction list length decreasing', () => {
      const listRef = createMockListRef<{ id: string }>();
      const getItemId = jest.fn((item: { id: string }) => item.id);

      const { rerender } = renderHook(
        ({ data }) => useTransactionAutoScroll(data, listRef, { getItemId }),
        {
          initialProps: {
            data: [{ id: 'tx-2' }, { id: 'tx-1' }],
          },
        },
      );

      // Remove a transaction
      rerender({ data: [{ id: 'tx-2' }] });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should not scroll when list decreases
      expect(listRef.current?.scrollToOffset).not.toHaveBeenCalled();
    });
  });
});
