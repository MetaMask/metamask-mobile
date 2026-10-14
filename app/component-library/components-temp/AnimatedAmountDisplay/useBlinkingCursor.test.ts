import { renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { useBlinkingCursor } from './useBlinkingCursor';

describe('useBlinkingCursor', () => {
  it('returns an animated value', () => {
    const { result } = renderHook(() => useBlinkingCursor());

    expect(result.current).toBeInstanceOf(Animated.Value);
  });

  it('preserves the animated value across renders', () => {
    const { result, rerender } = renderHook(() => useBlinkingCursor());
    const initialValue = result.current;

    rerender({});

    expect(result.current).toBe(initialValue);
  });

  it('returns an animated value when disabled', () => {
    const { result } = renderHook(() => useBlinkingCursor(false));

    expect(result.current).toBeInstanceOf(Animated.Value);
  });
});
