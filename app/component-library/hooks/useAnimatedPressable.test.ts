import { renderHook, act } from '@testing-library/react-native';
import { Animated, GestureResponderEvent } from 'react-native';
import { useAnimatedPressable } from './useAnimatedPressable';

describe('useAnimatedPressable', () => {
  let timingSpy: jest.SpyInstance;

  beforeEach(() => {
    timingSpy = jest.spyOn(Animated, 'timing');
  });

  afterEach(() => {
    timingSpy.mockRestore();
  });

  it('returns scaleAnim, handlePressIn, and handlePressOut', () => {
    const { result } = renderHook(() => useAnimatedPressable());

    expect(result.current.scaleAnim).toBeDefined();
    expect(result.current.scaleAnim).toBeInstanceOf(Animated.Value);
    expect(typeof result.current.handlePressIn).toBe('function');
    expect(typeof result.current.handlePressOut).toBe('function');
  });

  it('starts scale-down animation when handlePressIn is called', () => {
    const mockStart = jest.fn();
    timingSpy.mockReturnValue({ start: mockStart });

    const { result } = renderHook(() => useAnimatedPressable());

    act(() => {
      result.current.handlePressIn({} as GestureResponderEvent);
    });

    expect(timingSpy).toHaveBeenCalledTimes(1);
    expect(timingSpy).toHaveBeenCalledWith(
      result.current.scaleAnim,
      expect.objectContaining({
        toValue: 0.98,
        duration: 150,
        useNativeDriver: true,
      }),
    );
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('starts scale-up animation when handlePressOut is called', () => {
    const mockStart = jest.fn();
    timingSpy.mockReturnValue({ start: mockStart });

    const { result } = renderHook(() => useAnimatedPressable());

    act(() => {
      result.current.handlePressOut({} as GestureResponderEvent);
    });

    expect(timingSpy).toHaveBeenCalledTimes(1);
    expect(timingSpy).toHaveBeenCalledWith(
      result.current.scaleAnim,
      expect.objectContaining({
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    );
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('invokes optional onPressIn when handlePressIn is called', () => {
    const onPressIn = jest.fn();
    const mockEvent = { nativeEvent: {} };
    timingSpy.mockReturnValue({ start: jest.fn() });

    const { result } = renderHook(() => useAnimatedPressable({ onPressIn }));

    act(() => {
      result.current.handlePressIn(mockEvent as GestureResponderEvent);
    });

    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onPressIn).toHaveBeenCalledWith(mockEvent);
  });

  it('invokes optional onPressOut when handlePressOut is called', () => {
    const onPressOut = jest.fn();
    const mockEvent = { nativeEvent: {} };
    timingSpy.mockReturnValue({ start: jest.fn() });

    const { result } = renderHook(() => useAnimatedPressable({ onPressOut }));

    act(() => {
      result.current.handlePressOut(mockEvent as GestureResponderEvent);
    });

    expect(onPressOut).toHaveBeenCalledTimes(1);
    expect(onPressOut).toHaveBeenCalledWith(mockEvent);
  });

  it('runs without options and does not throw', () => {
    timingSpy.mockReturnValue({ start: jest.fn() });

    const { result } = renderHook(() => useAnimatedPressable());

    expect(() => {
      act(() => {
        result.current.handlePressIn({} as GestureResponderEvent);
        result.current.handlePressOut({} as GestureResponderEvent);
      });
    }).not.toThrow();
    expect(timingSpy).toHaveBeenCalledTimes(2);
  });

  it('invokes both onPressIn and onPressOut when both are provided', () => {
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    timingSpy.mockReturnValue({ start: jest.fn() });

    const { result } = renderHook(() =>
      useAnimatedPressable({ onPressIn, onPressOut }),
    );

    act(() => {
      result.current.handlePressIn({} as GestureResponderEvent);
    });
    act(() => {
      result.current.handlePressOut({} as GestureResponderEvent);
    });

    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onPressOut).toHaveBeenCalledTimes(1);
  });
});
