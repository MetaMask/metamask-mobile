import { renderHook, act } from '@testing-library/react-hooks';
import { useDepositSdk } from './useDepositSdk';

describe('useDepositSdk', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useDepositSdk());

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.sdkMethod).toBe('function');
  });

  it('should set loading to true when sdkMethod is called', () => {
    const { result } = renderHook(() => useDepositSdk());

    act(() => {
      result.current.sdkMethod('test value');
    });

    expect(result.current.loading).toBe(true);
  });

  it('should set data and reset loading when sdkMethod resolves', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useDepositSdk());

    act(() => {
      result.current.sdkMethod('test value');
    });

    expect(result.current.loading).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitForNextUpdate();

    expect(result.current.data).toBe('Value submitted: test value');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
