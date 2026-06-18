import { renderHook, act } from '@testing-library/react-native';
import { useHorizontalScrollToSelected } from './useHorizontalScrollToSelected';

describe('useHorizontalScrollToSelected', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns scroll handlers and ref', () => {
    const { result } = renderHook(() =>
      useHorizontalScrollToSelected({ selectedKey: undefined }),
    );

    expect(result.current.scrollViewRef).toBeDefined();
    expect(result.current.handleItemLayout).toBeInstanceOf(Function);
    expect(result.current.handleScroll).toBeInstanceOf(Function);
    expect(result.current.handleScrollViewLayout).toBeInstanceOf(Function);
  });

  it('does not scroll when selectedKey is undefined', () => {
    const scrollTo = jest.fn();

    const { result } = renderHook(() =>
      useHorizontalScrollToSelected({ selectedKey: undefined }),
    );

    (result.current.scrollViewRef as { current: unknown }).current = {
      scrollTo,
    };

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls to item when it is out of view', () => {
    const scrollTo = jest.fn();

    const { result } = renderHook(() =>
      useHorizontalScrollToSelected({ selectedKey: 'forex', delay: 350 }),
    );

    (result.current.scrollViewRef as { current: unknown }).current = {
      scrollTo,
    };

    // Simulate viewport width via onLayout
    act(() => {
      result.current.handleScrollViewLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 40 } },
      } as never);
    });

    // Simulate item layout — positioned beyond viewport
    act(() => {
      result.current.handleItemLayout('forex', {
        nativeEvent: { layout: { x: 400, width: 60, y: 0, height: 32 } },
      } as never);
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(scrollTo).toHaveBeenCalledWith({
      x: 400 - 16,
      animated: true,
    });
  });

  it('does not scroll when item is already fully visible', () => {
    const scrollTo = jest.fn();

    const { result } = renderHook(() =>
      useHorizontalScrollToSelected({ selectedKey: 'crypto', delay: 350 }),
    );

    (result.current.scrollViewRef as { current: unknown }).current = {
      scrollTo,
    };

    // Simulate viewport width
    act(() => {
      result.current.handleScrollViewLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 40 } },
      } as never);
    });

    // Simulate item layout — within viewport
    act(() => {
      result.current.handleItemLayout('crypto', {
        nativeEvent: { layout: { x: 20, width: 60, y: 0, height: 32 } },
      } as never);
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('accounts for current scroll offset when checking visibility', () => {
    const scrollTo = jest.fn();

    const { result } = renderHook(() =>
      useHorizontalScrollToSelected({ selectedKey: 'crypto', delay: 350 }),
    );

    (result.current.scrollViewRef as { current: unknown }).current = {
      scrollTo,
    };

    // Simulate viewport width
    act(() => {
      result.current.handleScrollViewLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 40 } },
      } as never);
    });

    // Item at x=20, width=60 — would be visible at offset 0
    act(() => {
      result.current.handleItemLayout('crypto', {
        nativeEvent: { layout: { x: 20, width: 60, y: 0, height: 32 } },
      } as never);
    });

    // User has scrolled past the item
    act(() => {
      result.current.handleScroll({
        nativeEvent: { contentOffset: { x: 100, y: 0 } },
      } as never);
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    // Item is now behind the visible area, should scroll
    expect(scrollTo).toHaveBeenCalledWith({
      x: 20 - 16,
      animated: true,
    });
  });

  it('scrolls when layout arrives after the timeout has already fired', () => {
    const scrollTo = jest.fn();

    const { result } = renderHook(() =>
      useHorizontalScrollToSelected({ selectedKey: 'forex', delay: 350 }),
    );

    (result.current.scrollViewRef as { current: unknown }).current = {
      scrollTo,
    };

    // Timer fires but layout hasn't arrived yet
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(scrollTo).not.toHaveBeenCalled();

    // Viewport layout arrives
    act(() => {
      result.current.handleScrollViewLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 40 } },
      } as never);
    });

    // Item layout arrives after the timeout — should still trigger scroll
    act(() => {
      result.current.handleItemLayout('forex', {
        nativeEvent: { layout: { x: 400, width: 60, y: 0, height: 32 } },
      } as never);
    });

    expect(scrollTo).toHaveBeenCalledWith({
      x: 400 - 16,
      animated: true,
    });
  });

  it('scrolls when viewport layout arrives after item layout and timeout', () => {
    const scrollTo = jest.fn();

    const { result } = renderHook(() =>
      useHorizontalScrollToSelected({ selectedKey: 'forex', delay: 350 }),
    );

    (result.current.scrollViewRef as { current: unknown }).current = {
      scrollTo,
    };

    // Item layout arrives before timeout
    act(() => {
      result.current.handleItemLayout('forex', {
        nativeEvent: { layout: { x: 400, width: 60, y: 0, height: 32 } },
      } as never);
    });

    // Timer fires but viewport width is still 0
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(scrollTo).not.toHaveBeenCalled();

    // Viewport layout arrives late — should trigger the pending scroll
    act(() => {
      result.current.handleScrollViewLayout({
        nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 40 } },
      } as never);
    });

    expect(scrollTo).toHaveBeenCalledWith({
      x: 400 - 16,
      animated: true,
    });
  });
});
