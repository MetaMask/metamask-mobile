import { renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { useBlinkingCursor } from './useBlinkingCursor';

describe('useBlinkingCursor', () => {
  it('returns an Animated.Value', () => {
    const { result } = renderHook(() => useBlinkingCursor());
    expect(result.current).toBeInstanceOf(Animated.Value);
  });

  it('returns the same Animated.Value across re-renders', () => {
    const { result, rerender } = renderHook(() => useBlinkingCursor());
    const first = result.current;
    rerender({});
    expect(result.current).toBe(first);
  });

  it('returns an Animated.Value when enabled is false', () => {
    const { result } = renderHook(() => useBlinkingCursor(false));
    expect(result.current).toBeInstanceOf(Animated.Value);
  });
});
