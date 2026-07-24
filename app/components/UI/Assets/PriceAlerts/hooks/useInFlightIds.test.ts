import { act, renderHook } from '@testing-library/react-native';
import useInFlightIds from './useInFlightIds';

describe('useInFlightIds', () => {
  it('starts with an empty set and has returns false', () => {
    const { result } = renderHook(() => useInFlightIds());

    expect(result.current.ids.size).toBe(0);
    expect(result.current.has('alert-1')).toBe(false);
  });

  it('adds an id to the reactive set and sync has check', () => {
    const { result } = renderHook(() => useInFlightIds());

    act(() => {
      result.current.add('alert-1');
    });

    expect(result.current.has('alert-1')).toBe(true);
    expect(result.current.ids.has('alert-1')).toBe(true);
  });

  it('removes an id from the reactive set and sync has check', () => {
    const { result } = renderHook(() => useInFlightIds());

    act(() => {
      result.current.add('alert-1');
    });
    act(() => {
      result.current.remove('alert-1');
    });

    expect(result.current.has('alert-1')).toBe(false);
    expect(result.current.ids.has('alert-1')).toBe(false);
  });

  it('keeps sibling ids when removing one', () => {
    const { result } = renderHook(() => useInFlightIds());

    act(() => {
      result.current.add('alert-1');
      result.current.add('alert-2');
    });
    act(() => {
      result.current.remove('alert-1');
    });

    expect(result.current.has('alert-1')).toBe(false);
    expect(result.current.has('alert-2')).toBe(true);
    expect([...result.current.ids]).toEqual(['alert-2']);
  });
});
