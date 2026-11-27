import { act, renderHook } from '@testing-library/react-native';
import { useBoolean } from '#app/components/hooks/useBoolean';

describe('useBoolean', () => {
  it('defaults to false', () => {
    const { result } = renderHook(() => useBoolean());

    expect(result.current.value).toBe(false);
  });

  it('respects an initial true', () => {
    const { result } = renderHook(() => useBoolean(true));

    expect(result.current.value).toBe(true);
  });

  it('sets true with setTrue', () => {
    const { result } = renderHook(() => useBoolean());

    act(() => result.current.setTrue());

    expect(result.current.value).toBe(true);
  });

  it('sets false with setFalse', () => {
    const { result } = renderHook(() => useBoolean(true));

    act(() => result.current.setFalse());

    expect(result.current.value).toBe(false);
  });

  it('flips the value with toggle', () => {
    const { result } = renderHook(() => useBoolean());

    act(() => result.current.toggle());

    expect(result.current.value).toBe(true);
  });
});
