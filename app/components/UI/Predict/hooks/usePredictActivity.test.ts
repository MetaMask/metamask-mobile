import { renderHook, act } from '@testing-library/react-hooks';
import { usePredictActivity } from './usePredictActivity';
import Engine from '../../../../core/Engine';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getActivity: jest.fn(),
    },
  },
}));

// Mock navigation focus effect without auto-invocation; provide manual trigger
jest.mock('@react-navigation/native', () => {
  let focusCb: (() => void) | null = null;
  return {
    useFocusEffect: (cb: () => void) => {
      focusCb = cb;
    },
    __esModule: true,
    __mock: {
      invokeFocusEffect: () => {
        focusCb?.();
      },
    },
  };
});

describe('usePredictActivity', () => {
  const mockGetActivity = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context.PredictController.getActivity as jest.Mock) =
      mockGetActivity;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes and auto-loads activity on mount', async () => {
    const data = [{ id: '1' }];
    mockGetActivity.mockResolvedValueOnce(data);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictActivity(),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.activity).toEqual([]);
    expect(result.current.error).toBe(null);

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.activity).toEqual(data);
    expect(result.current.error).toBe(null);
    expect(mockGetActivity).toHaveBeenCalledWith({
      providerId: undefined,
    });
  });

  it('respects providerId option when loading', async () => {
    mockGetActivity.mockResolvedValueOnce([]);

    const { waitForNextUpdate } = renderHook(() =>
      usePredictActivity({ providerId: 'polymarket' }),
    );

    await waitForNextUpdate();

    expect(mockGetActivity).toHaveBeenCalledWith({
      providerId: 'polymarket',
    });
  });

  it('can refresh with isRefresh=true and sets isRefreshing flag', async () => {
    mockGetActivity.mockResolvedValueOnce([{ id: '1' }]);
    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictActivity(),
    );

    await waitForNextUpdate();

    mockGetActivity.mockResolvedValueOnce([{ id: '2' }]);
    await act(async () => {
      await result.current.loadActivity({ isRefresh: true });
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.activity).toEqual([{ id: '2' }]);
  });

  it('handles errors and sets error message', async () => {
    mockGetActivity.mockRejectedValueOnce(new Error('Boom'));

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictActivity(),
    );

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Boom');
    expect(result.current.activity).toEqual([]);
  });

  it('supports disabling auto-load via loadOnMount=false', () => {
    const { result } = renderHook(() =>
      usePredictActivity({ loadOnMount: false }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.activity).toEqual([]);
    expect(mockGetActivity).not.toHaveBeenCalled();
  });

  it('triggers refresh on focus when refreshOnFocus=true', async () => {
    mockGetActivity.mockResolvedValueOnce([]);

    const { waitForNextUpdate } = renderHook(() =>
      usePredictActivity({ refreshOnFocus: true }),
    );

    await waitForNextUpdate();

    mockGetActivity.mockResolvedValueOnce([]);
    const { __mock } = jest.requireMock('@react-navigation/native');
    await act(async () => {
      __mock.invokeFocusEffect();
      await Promise.resolve();
    });

    expect(mockGetActivity).toHaveBeenCalledTimes(2);
  });
});
