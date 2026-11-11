import { act, renderHook } from '@testing-library/react-native';
import { useHeldWhileDragging } from './useHeldWhileDragging';

describe('useHeldWhileDragging', () => {
  it('passes the live value through when no drag is in progress', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useHeldWhileDragging(value),
      { initialProps: { value: 1 } },
    );

    rerender({ value: 2 });

    expect(result.current.value).toBe(2);
  });

  it('holds the value from the start of the drag until it ends', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useHeldWhileDragging(value),
      { initialProps: { value: 1 } },
    );

    act(() => result.current.onDragStart());
    rerender({ value: 2 });
    rerender({ value: 3 });

    expect(result.current.value).toBe(1);

    act(() => result.current.onDragEnd());

    expect(result.current.value).toBe(3);
  });

  it('keeps the first snapshot when a new drag starts before the sheet settles', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useHeldWhileDragging(value),
      { initialProps: { value: 1 } },
    );

    act(() => result.current.onDragStart());
    rerender({ value: 2 });
    act(() => result.current.onDragStart());

    expect(result.current.value).toBe(1);
  });
});
