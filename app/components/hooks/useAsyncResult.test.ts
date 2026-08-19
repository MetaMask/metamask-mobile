import { renderHook, waitFor } from '@testing-library/react-native';
import { useAsyncResult, useAsyncResultOrThrow } from './useAsyncResult';

describe('useAsyncResult', () => {
  it('should return pending state initially', async () => {
    const { result } = renderHook(() => useAsyncResult(async () => 'test'));
    expect(result.current).toEqual({ pending: true });
    await waitFor(() => {
      expect(result.current).toEqual({ pending: false, value: 'test' });
    });
  });

  it('should return success state with value on successful async function', async () => {
    const { result } = renderHook(() => useAsyncResult(async () => 'test'));
    await waitFor(() => {
      expect(result.current).toEqual({ pending: false, value: 'test' });
    });
  });

  it('should return error state on async function error', async () => {
    const error = new Error('test error');
    const { result } = renderHook(() =>
      useAsyncResult(() => Promise.reject(error)),
    );
    await waitFor(() => {
      expect(result.current).toEqual({ pending: false, error });
    });
  });

  it('should cancel async function on unmount', async () => {
    const { unmount, result } = renderHook(() =>
      useAsyncResult(async () => 'test'),
    );
    unmount();
    await Promise.resolve();
    expect(result.current).toEqual({ pending: true });
  });
});

describe('useAsyncResultStrict', () => {
  it('correctly passes through the pending and success states', async () => {
    const { result } = renderHook(() =>
      useAsyncResultOrThrow(async () => 'test'),
    );
    expect(result.current).toEqual({ pending: true });
    await waitFor(() => {
      expect(result.current).toEqual({ pending: false, value: 'test' });
    });
  });
});
