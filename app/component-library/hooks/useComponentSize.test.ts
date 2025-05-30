/* eslint-disable @typescript-eslint/no-shadow */
import { renderHook, act } from '@testing-library/react-hooks';
import { useComponentSize } from './useComponentSize';
import type { LayoutChangeEvent } from 'react-native';

describe('useComponentSize', () => {
  it('should initialize with size null and provide an onLayout function', () => {
    const { result } = renderHook(() => useComponentSize());
    expect(result.current.size).toBeNull();
    expect(typeof result.current.onLayout).toBe('function');
  });

  it('should update size on first layout event', () => {
    const { result } = renderHook(() => useComponentSize());
    const event = {
      nativeEvent: { layout: { width: 100, height: 200 } },
    } as LayoutChangeEvent;

    act(() => {
      result.current.onLayout(event);
    });

    expect(result.current.size).toStrictEqual({ width: 100, height: 200 });
  });

  it('should not update size when layout dimensions are unchanged', () => {
    const { result } = renderHook(() => useComponentSize());
    const event = {
      nativeEvent: { layout: { width: 50, height: 75 } },
    } as LayoutChangeEvent;

    act(() => {
      result.current.onLayout(event);
    });
    const firstSize = result.current.size;

    act(() => {
      result.current.onLayout(event);
    });
    const secondSize = result.current.size;

    expect(secondSize).toBe(firstSize);
  });

  it('should update size when layout dimensions change', () => {
    const { result } = renderHook(() => useComponentSize());
    const firstEvent = {
      nativeEvent: { layout: { width: 60, height: 90 } },
    } as LayoutChangeEvent;
    const secondEvent = {
      nativeEvent: { layout: { width: 120, height: 180 } },
    } as LayoutChangeEvent;

    act(() => {
      result.current.onLayout(firstEvent);
    });
    const initialSize = result.current.size;

    act(() => {
      result.current.onLayout(secondEvent);
    });

    expect(result.current.size).toStrictEqual({ width: 120, height: 180 });
    expect(result.current.size).not.toBe(initialSize);
  });
});
