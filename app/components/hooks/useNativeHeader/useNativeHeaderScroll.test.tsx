import React from 'react';
import { fireEvent, render, renderHook } from '@testing-library/react-native';
import Animated from 'react-native-reanimated';
import { useNativeHeaderScroll } from './useNativeHeaderScroll';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 0, left: 0, right: 0 }),
}));

// Status bar (47) plus the native bar (44).
const NATIVE_RESTING_OFFSET = -91;

const setUp = (isNativeHeader: boolean) => {
  const { result } = renderHook(() => useNativeHeaderScroll(isNativeHeader));
  const { getByTestId } = render(
    <Animated.ScrollView onScroll={result.current.onScroll} testID="scroll" />,
  );
  const scrollTo = (y: number) =>
    fireEvent.scroll(getByTestId('scroll'), {
      nativeEvent: { contentOffset: { x: 0, y } },
    });
  return { scroll: result.current, scrollTo };
};

describe('useNativeHeaderScroll', () => {
  it('measures from the resting offset under the native bar', () => {
    const { scroll, scrollTo } = setUp(true);

    scrollTo(NATIVE_RESTING_OFFSET);
    expect(scroll.scrollDistance.value).toBe(0);

    scrollTo(NATIVE_RESTING_OFFSET + 64);
    expect(scroll.scrollDistance.value).toBe(64);
  });

  it('measures from 0 without the native bar', () => {
    const { scroll, scrollTo } = setUp(false);

    scrollTo(64);

    expect(scroll.scrollDistance.value).toBe(64);
  });

  it('starts at rest before the first scroll event', () => {
    const { scroll } = setUp(true);

    expect(scroll.scrollDistance.value).toBe(0);
  });

  it('tracks the raw offset in scrollY', () => {
    const { scroll, scrollTo } = setUp(true);

    scrollTo(12);

    expect(scroll.scrollY.value).toBe(12);
  });
});
