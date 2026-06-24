import { act, renderHook } from '@testing-library/react-hooks';
import { useTransactionAutoScroll } from './useTransactionAutoScroll';
import Logger from '../../../util/Logger';

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('useTransactionAutoScroll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const keyExtractor = (item: { id: string }) => item.id;

  it('does not scroll on initial render, then scrolls when a new first item appears', () => {
    const listRef = {
      current: {
        scrollToOffset: jest.fn(),
      },
    };
    const { rerender } = renderHook(
      ({ data }) =>
        useTransactionAutoScroll(data, listRef as never, {
          delay: 50,
          keyExtractor,
        }),
      {
        initialProps: { data: [{ id: 'old' }] },
      },
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(listRef.current.scrollToOffset).not.toHaveBeenCalled();

    rerender({ data: [{ id: 'new' }, { id: 'old' }] });

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(listRef.current.scrollToOffset).toHaveBeenCalledWith({
      animated: true,
      offset: 0,
    });
  });

  it('clears pending auto-scroll when disabled and ignores new items while user is scrolling', () => {
    const listRef = {
      current: {
        scrollToOffset: jest.fn(),
      },
    };
    const { rerender, result } = renderHook(
      ({ data, enabled }) =>
        useTransactionAutoScroll(data, listRef as never, {
          delay: 50,
          enabled,
          keyExtractor,
        }),
      {
        initialProps: { data: [{ id: 'old' }], enabled: true },
      },
    );

    act(() => {
      result.current.handleScroll();
    });
    rerender({ data: [{ id: 'new' }, { id: 'old' }], enabled: true });

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(listRef.current.scrollToOffset).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    rerender({
      data: [{ id: 'newer' }, { id: 'new' }, { id: 'old' }],
      enabled: false,
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(listRef.current.scrollToOffset).not.toHaveBeenCalled();
  });

  it('logs extractor and scroll errors without throwing', () => {
    const listRef = {
      current: {
        scrollToOffset: jest.fn(() => {
          throw new Error('scroll failed');
        }),
      },
    };
    const { rerender } = renderHook(
      ({ data }) =>
        useTransactionAutoScroll(data, listRef as never, {
          delay: 50,
          keyExtractor: (item: { id: string }) => {
            if (item.id === 'bad') {
              throw new Error('bad item');
            }
            return item.id;
          },
        }),
      {
        initialProps: { data: [{ id: 'old' }] },
      },
    );

    rerender({ data: [{ id: 'bad' }, { id: 'old' }] });
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'useTransactionAutoScroll: Failed to extract item ID',
    );

    rerender({ data: [{ id: 'new' }, { id: 'bad' }, { id: 'old' }] });
    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'useTransactionAutoScroll: Auto-scroll failed',
    );
  });
});
