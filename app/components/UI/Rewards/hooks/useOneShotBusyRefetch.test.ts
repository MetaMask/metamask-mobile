import { act, renderHook } from '@testing-library/react-hooks';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { useOneShotBusyRefetch } from './useOneShotBusyRefetch';

let mockFocusCleanup: (() => void) | undefined;

jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = effect();
        mockFocusCleanup = typeof cleanup === 'function' ? cleanup : undefined;
        return mockFocusCleanup;
      }, [effect]);
    },
  };
});

const busyError = (retryAfterSeconds?: number) =>
  new RewardsMoneyHttpError('busy', 503, undefined, retryAfterSeconds);

describe('useOneShotBusyRefetch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation((array) => {
        if (array instanceof Uint32Array) {
          array[0] = 0;
        }
        return array;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('calls the refetch once Retry-After seconds have passed', () => {
    const refetch = jest.fn();
    const { result } = renderHook(() => useOneShotBusyRefetch());

    act(() => {
      result.current.arm(busyError(2), refetch);
    });
    act(() => {
      jest.advanceTimersByTime(1999);
    });

    expect(refetch).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('refetches a 30 second Retry-After after that wait plus jitter', () => {
    jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation((array) => {
        if (array instanceof Uint32Array) {
          array[0] = 1000;
        }
        return array;
      });
    const refetch = jest.fn();
    const { result } = renderHook(() => useOneShotBusyRefetch());

    act(() => {
      result.current.arm(busyError(30), refetch);
    });
    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    expect(refetch).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('does not schedule a refetch for a Retry-After over 30 seconds', () => {
    const refetch = jest.fn();
    const { result } = renderHook(() => useOneShotBusyRefetch());

    act(() => {
      result.current.arm(busyError(31), refetch);
    });
    act(() => {
      jest.advanceTimersByTime(31_000);
    });

    expect(refetch).not.toHaveBeenCalled();
  });

  it('does not schedule a refetch for an error without Retry-After', () => {
    const refetch = jest.fn();
    const { result } = renderHook(() => useOneShotBusyRefetch());

    act(() => {
      result.current.arm(new Error('network'), refetch);
      result.current.arm(busyError(undefined), refetch);
    });
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(refetch).not.toHaveBeenCalled();
  });

  it('drops the scheduled refetch when cancel runs', () => {
    const refetch = jest.fn();
    const { result } = renderHook(() => useOneShotBusyRefetch());

    act(() => {
      result.current.arm(busyError(2), refetch);
      result.current.cancel();
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(refetch).not.toHaveBeenCalled();
  });

  it('replaces the previous timer when armed again', () => {
    const firstRefetch = jest.fn();
    const secondRefetch = jest.fn();
    const { result } = renderHook(() => useOneShotBusyRefetch());

    act(() => {
      result.current.arm(busyError(2), firstRefetch);
      result.current.arm(busyError(5), secondRefetch);
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(firstRefetch).not.toHaveBeenCalled();
    expect(secondRefetch).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(firstRefetch).not.toHaveBeenCalled();
    expect(secondRefetch).toHaveBeenCalledTimes(1);
  });

  it('drops the scheduled refetch when the screen blurs', () => {
    const refetch = jest.fn();
    const { result } = renderHook(() => useOneShotBusyRefetch());

    act(() => {
      result.current.arm(busyError(2), refetch);
    });
    act(() => {
      mockFocusCleanup?.();
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(refetch).not.toHaveBeenCalled();
  });

  it('does not schedule a refetch when armed after blur', () => {
    const refetch = jest.fn();
    const { result } = renderHook(() => useOneShotBusyRefetch());

    act(() => {
      mockFocusCleanup?.();
      result.current.arm(busyError(2), refetch);
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(refetch).not.toHaveBeenCalled();
  });

  it('drops the scheduled refetch on unmount', () => {
    const refetch = jest.fn();
    const { result, unmount } = renderHook(() => useOneShotBusyRefetch());

    act(() => {
      result.current.arm(busyError(2), refetch);
    });

    unmount();
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(refetch).not.toHaveBeenCalled();
  });
});
