import { act, renderHook } from '@testing-library/react-native';
import React, { createRef } from 'react';
import { View } from 'react-native';
import { useExploreScrollContext } from '../components/ExploreScroll';
import useExploreSectionVisibility from './useExploreSectionVisibility';

jest.mock('../components/ExploreScroll', () => ({
  __esModule: true,
  useExploreScrollContext: jest.fn(),
}));

interface ViewportBounds {
  screenY: number;
  height: number;
}

const mockUseExploreScrollContext =
  useExploreScrollContext as jest.MockedFunction<
    typeof useExploreScrollContext
  >;

describe('useExploreSectionVisibility', () => {
  let viewportBounds: ViewportBounds;
  let subscribedCallback: ((bounds: ViewportBounds) => void) | undefined;
  let unsubscribe: jest.Mock;

  beforeEach(() => {
    viewportBounds = { screenY: 100, height: 800 };
    subscribedCallback = undefined;
    unsubscribe = jest.fn();

    mockUseExploreScrollContext.mockReturnValue({
      isAvailable: true,
      measureViewport: (callback) => callback(viewportBounds),
      subscribeToScroll: (callback) => {
        subscribedCallback = callback;
        return unsubscribe;
      },
    });
  });

  it('marks section visible when at least 30% intersects the viewport', () => {
    const sectionRef = createRef<View>();
    sectionRef.current = {
      measureInWindow: jest.fn((callback) => callback(0, 150, 100, 200)),
    } as unknown as View;

    const { result } = renderHook(() =>
      useExploreSectionVisibility(sectionRef, true, false),
    );

    expect(result.current.isVisible).toBe(true);
  });

  it('uses fresh viewport bounds supplied by scroll notifications', () => {
    const sectionRef = createRef<View>();
    sectionRef.current = {
      measureInWindow: jest.fn((callback) => callback(0, 850, 100, 200)),
    } as unknown as View;

    const { result } = renderHook(() =>
      useExploreSectionVisibility(sectionRef, true, false),
    );

    expect(result.current.isVisible).toBe(false);

    act(() => {
      subscribedCallback?.({ screenY: 800, height: 800 });
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('cleans up scroll subscription when disabled', () => {
    const sectionRef = createRef<View>();
    sectionRef.current = {
      measureInWindow: jest.fn((callback) => callback(0, 1200, 100, 200)),
    } as unknown as View;

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useExploreSectionVisibility(sectionRef, enabled, false),
      { initialProps: { enabled: true } },
    );

    rerender({ enabled: false });

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(result.current.isVisible).toBe(false);
  });

  it('ignores delayed viewport measurements after being disabled', () => {
    let pendingViewportCallback: ((bounds: ViewportBounds) => void) | undefined;
    mockUseExploreScrollContext.mockReturnValue({
      isAvailable: true,
      measureViewport: (callback) => {
        pendingViewportCallback = callback;
      },
      subscribeToScroll: (callback) => {
        subscribedCallback = callback;
        return unsubscribe;
      },
    });

    const sectionRef = createRef<View>();
    sectionRef.current = {
      measureInWindow: jest.fn((callback) => callback(0, 150, 100, 200)),
    } as unknown as View;

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useExploreSectionVisibility(sectionRef, enabled, false),
      { initialProps: { enabled: true } },
    );

    rerender({ enabled: false });

    act(() => {
      pendingViewportCallback?.(viewportBounds);
    });

    expect(result.current.isVisible).toBe(false);
  });
});
