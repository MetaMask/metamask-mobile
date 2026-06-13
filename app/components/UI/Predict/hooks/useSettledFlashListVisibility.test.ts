import { act, renderHook } from '@testing-library/react-native';
import { useSettledFlashListVisibility } from './useSettledFlashListVisibility';

interface TestItem {
  key: string;
}

describe('useSettledFlashListVisibility', () => {
  const getVisibleKey = (item: TestItem) => item.key;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('commits visible keys after the settle delay when not scrolling', () => {
    const { result } = renderHook(() =>
      useSettledFlashListVisibility<TestItem>({
        getVisibleKey,
        settleDelayMs: 200,
      }),
    );

    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [{ item: { key: 'outcome-1' } }],
      });
    });

    expect(result.current.visibleKeys.size).toBe(0);

    act(() => {
      jest.advanceTimersByTime(199);
    });

    expect(result.current.visibleKeys.size).toBe(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect([...result.current.visibleKeys]).toEqual(['outcome-1']);
  });

  it('waits for scroll end before committing visible keys', () => {
    const { result } = renderHook(() =>
      useSettledFlashListVisibility<TestItem>({
        getVisibleKey,
        settleDelayMs: 200,
      }),
    );

    act(() => {
      result.current.onScrollBeginDrag();
      result.current.onViewableItemsChanged({
        viewableItems: [{ item: { key: 'outcome-1' } }],
      });
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.visibleKeys.size).toBe(0);

    act(() => {
      result.current.onScrollEndDrag();
      jest.advanceTimersByTime(199);
    });

    expect(result.current.visibleKeys.size).toBe(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect([...result.current.visibleKeys]).toEqual(['outcome-1']);
  });

  it('waits for scroll idle before committing visible keys', () => {
    const { result } = renderHook(() =>
      useSettledFlashListVisibility<TestItem>({
        getVisibleKey,
        settleDelayMs: 200,
      }),
    );

    act(() => {
      result.current.onScrollBeginDrag();
      result.current.onViewableItemsChanged({
        viewableItems: [{ item: { key: 'outcome-1' } }],
      });
      result.current.onScrollEndDrag();
      jest.advanceTimersByTime(100);
      result.current.onScroll();
      result.current.onViewableItemsChanged({
        viewableItems: [{ item: { key: 'outcome-2' } }],
      });
      jest.advanceTimersByTime(199);
    });

    expect(result.current.visibleKeys.size).toBe(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect([...result.current.visibleKeys]).toEqual(['outcome-2']);
  });

  it('clears visible keys when disabled', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useSettledFlashListVisibility<TestItem>({
          enabled,
          getVisibleKey,
          settleDelayMs: 200,
        }),
      { initialProps: { enabled: true } },
    );

    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [{ item: { key: 'outcome-1' } }],
      });
      jest.advanceTimersByTime(200);
    });

    expect([...result.current.visibleKeys]).toEqual(['outcome-1']);

    rerender({ enabled: false });

    expect(result.current.visibleKeys.size).toBe(0);
  });

  it('clears visible keys when reset key changes', () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) =>
        useSettledFlashListVisibility<TestItem>({
          getVisibleKey,
          resetKey,
          settleDelayMs: 200,
        }),
      { initialProps: { resetKey: 'outcomes:first-group' } },
    );

    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [{ item: { key: 'outcome-1' } }],
      });
      jest.advanceTimersByTime(200);
    });

    expect([...result.current.visibleKeys]).toEqual(['outcome-1']);

    rerender({ resetKey: 'outcomes:second-group' });

    expect(result.current.visibleKeys.size).toBe(0);
  });

  it('commits the next viewability update immediately after reset key changes', () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) =>
        useSettledFlashListVisibility<TestItem>({
          getVisibleKey,
          resetKey,
          settleDelayMs: 200,
        }),
      { initialProps: { resetKey: 'outcomes:first-group' } },
    );

    rerender({ resetKey: 'outcomes:second-group' });

    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [{ item: { key: 'outcome-2' } }],
      });
    });

    expect([...result.current.visibleKeys]).toEqual(['outcome-2']);
  });
});
