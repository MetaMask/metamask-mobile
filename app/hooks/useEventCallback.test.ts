import { act, renderHook } from '@testing-library/react-native';

import { useEventCallback } from './useEventCallback';

// Type helper: `renderHook` in @testing-library/react-native requires
// explicit Props when no initialProps are supplied, and its `rerender`
// demands the props argument even when Props is undefined. This wrapper
// fills in `Props = undefined` and exposes a no-arg rerender.
const renderHookNoProps = <R>(hookToRender: () => R) => {
  const { rerender, ...rest } = renderHook<R, undefined>(hookToRender);
  return { ...rest, rerender: () => rerender(undefined) };
};

describe('useEventCallback', () => {
  it('returns a function with stable identity across re-renders', () => {
    const { rerender, result } = renderHookNoProps(() =>
      useEventCallback(jest.fn()),
    );
    const initial = result.current;

    rerender();
    rerender();
    expect(result.current).toBe(initial);
  });

  it('always invokes the latest supplied callback', () => {
    const calls: string[] = [];
    // The hook returns a callable, so the renderHook result type is the
    // wrapped function — not the callback's return value.
    const { result, rerender } = renderHook<() => number, { label: string }>(
      ({ label }) => useEventCallback(() => calls.push(label)),
      { initialProps: { label: 'a' } },
    );

    act(() => result.current());
    expect(calls).toEqual(['a']);

    rerender({ label: 'b' });
    act(() => result.current());
    expect(calls).toEqual(['a', 'b']);

    rerender({ label: 'c' });
    act(() => result.current());
    expect(calls).toEqual(['a', 'b', 'c']);
  });

  it('forwards arguments to the latest callback', () => {
    const stub = jest.fn();
    const { result } = renderHookNoProps(() => useEventCallback(stub));

    act(() => result.current(1, 'x', { k: true }));
    expect(stub).toHaveBeenCalledWith(1, 'x', { k: true });
  });

  it('returns whatever the latest callback returns', () => {
    const { result, rerender } = renderHook<() => number, { value: number }>(
      ({ value }) => useEventCallback(() => value),
      { initialProps: { value: 10 } },
    );

    expect(result.current()).toBe(10);

    rerender({ value: 42 });
    expect(result.current()).toBe(42);
  });

  it('keeps the callback identity stable across renders even when the inner closure changes', () => {
    const { result, rerender } = renderHookNoProps(() =>
      useEventCallback(() => undefined),
    );
    const initial = result.current;
    rerender();
    rerender();
    expect(result.current).toBe(initial);
  });
});
