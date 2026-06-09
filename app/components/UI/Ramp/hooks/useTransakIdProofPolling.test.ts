import { renderHook, act } from '@testing-library/react-native';
import useTransakIdProofPolling from './useTransakIdProofPolling';

const mockGetIdProofStatus = jest.fn();

jest.mock('./useTransakController', () => ({
  useTransakController: () => ({
    getIdProofStatus: mockGetIdProofStatus,
  }),
}));

describe('useTransakIdProofPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetIdProofStatus.mockResolvedValue({ status: 'NOT_SUBMITTED' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('auto-starts polling on mount and calls immediately', async () => {
    renderHook(() => useTransakIdProofPolling('wf-123', 2000));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledWith('wf-123');
  });

  it('does not auto-start when autoStart is false', async () => {
    renderHook(() => useTransakIdProofPolling('wf-123', 2000, false));

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockGetIdProofStatus).not.toHaveBeenCalled();
  });

  it('polls at the configured interval', async () => {
    renderHook(() => useTransakIdProofPolling('wf-123', 2000));

    // Immediate poll
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(1);

    // First interval poll
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(2);

    // Second interval poll
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(3);
  });

  it('returns idProofStatus from the poll response', async () => {
    mockGetIdProofStatus.mockResolvedValue({ status: 'SUBMITTED' });

    const { result } = renderHook(() =>
      useTransakIdProofPolling('wf-123', 2000),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.idProofStatus).toBe('SUBMITTED');
  });

  it('returns null idProofStatus for empty response', async () => {
    mockGetIdProofStatus.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useTransakIdProofPolling('wf-123', 2000),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.idProofStatus).toBeNull();
  });

  it('auto-stops polling when status becomes SUBMITTED', async () => {
    mockGetIdProofStatus.mockResolvedValue({ status: 'SUBMITTED' });

    renderHook(() => useTransakIdProofPolling('wf-123', 2000));

    // Immediate poll returns SUBMITTED
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(1);

    // Advance timer — should NOT poll again
    await act(async () => {
      jest.advanceTimersByTime(4000);
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(1);
  });

  it('swallows poll errors and continues polling', async () => {
    mockGetIdProofStatus
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ status: 'SUBMITTED' });

    const { result } = renderHook(() =>
      useTransakIdProofPolling('wf-123', 2000),
    );

    // Immediate poll: error swallowed
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.idProofStatus).toBeNull();
    expect(result.current.error).toBeNull();

    // Next interval: success
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(result.current.idProofStatus).toBe('SUBMITTED');
  });

  it('stops and sets error after maxPollingAttempts exceeded', async () => {
    const { result } = renderHook(() =>
      useTransakIdProofPolling('wf-123', 1000, true, 2),
    );

    // Immediate poll (attempt 1)
    await act(async () => {
      await Promise.resolve();
    });

    // Interval poll (attempt 2)
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    // Only 2 actual poll calls should have occurred
    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(2);

    // Attempt 3 exceeds max — should set error and stop
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.error).toBe(
      'Kyc workflow polling reached maximum attempts. Please try again later.',
    );

    const callCount = mockGetIdProofStatus.mock.calls.length;

    // No more polls
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(callCount);
  });

  it('polls indefinitely when maxPollingAttempts is 0', async () => {
    renderHook(() => useTransakIdProofPolling('wf-123', 500, true, 0));

    // Immediate poll
    await act(async () => {
      await Promise.resolve();
    });

    // Run 35 intervals (well beyond default 30)
    for (let i = 0; i < 35; i++) {
      await act(async () => {
        jest.advanceTimersByTime(500);
        await Promise.resolve();
      });
    }

    // 1 immediate + 35 intervals = 36 calls
    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(36);
  });

  it('stopPolling clears the interval', async () => {
    const { result } = renderHook(() =>
      useTransakIdProofPolling('wf-123', 2000),
    );

    // Immediate poll
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stopPolling();
    });

    await act(async () => {
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(1);
  });

  it('startPolling resets count and restarts', async () => {
    const { result } = renderHook(() =>
      useTransakIdProofPolling('wf-123', 2000, false),
    );

    // Not auto-started
    expect(mockGetIdProofStatus).not.toHaveBeenCalled();

    // Manually start
    await act(async () => {
      result.current.startPolling();
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(1);

    // Interval poll works
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(2);
  });

  it('cleans up interval on unmount', async () => {
    const { unmount } = renderHook(() =>
      useTransakIdProofPolling('wf-123', 2000),
    );

    // Immediate poll
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(mockGetIdProofStatus).toHaveBeenCalledTimes(1);
  });
});
