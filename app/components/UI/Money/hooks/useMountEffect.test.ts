import { renderHook } from '@testing-library/react-native';
import useMountEffect from './useMountEffect';

describe('useMountEffect', () => {
  it('fires the effect once on mount', () => {
    const effect = jest.fn();
    renderHook(() => useMountEffect(effect));
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('does not re-fire the effect on re-render', () => {
    const effect = jest.fn();
    const { rerender } = renderHook(() => useMountEffect(effect));
    rerender({});
    rerender({});
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('runs the cleanup returned by the effect on unmount', () => {
    const cleanup = jest.fn();
    const effect = jest.fn().mockReturnValue(cleanup);
    const { unmount } = renderHook(() => useMountEffect(effect));
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('does not run cleanup again on re-render', () => {
    const cleanup = jest.fn();
    const effect = jest.fn().mockReturnValue(cleanup);
    const { rerender, unmount } = renderHook(() => useMountEffect(effect));
    rerender({});
    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
