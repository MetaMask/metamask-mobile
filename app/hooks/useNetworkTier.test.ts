import { act, renderHook } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import {
  clearLatencySamples,
  recordFetchSample,
} from '../util/deviceCapability/latencyStore';
import {
  useNetworkLatency,
  useNetworkTier,
  useNetworkTierState,
} from './useNetworkTier';

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}));

const mockUseNetInfo = jest.mocked(useNetInfo);

const mockNetInfoState = (state: {
  type: string;
  isInternetReachable: boolean | null;
  details: Record<string, unknown>;
}) => {
  mockUseNetInfo.mockReturnValue(
    state as unknown as ReturnType<typeof useNetInfo>,
  );
};

const MID_HUNG_MS = 15000;

const recordSamples = (durations: number[]) =>
  act(() => {
    durations.forEach((durationMs) =>
      recordFetchSample({ atMs: Date.now(), durationMs }),
    );
  });

describe('useNetworkTier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearLatencySamples();
  });

  describe('useNetworkLatency', () => {
    it.each([
      ['wifi', {}, 'WIFI'],
      ['cellular', { cellularGeneration: '5g' }, 'FAST_CELLULAR'],
      ['cellular', { cellularGeneration: '3g' }, 'SLOW_CELLULAR'],
      ['vpn', {}, null],
    ])(
      'reports slow without changing the %s %o transport tier',
      (type, details, expectedTier) => {
        mockNetInfoState({ type, isInternetReachable: true, details });
        const { result } = renderHook(() => ({
          tier: useNetworkTier(),
          latency: useNetworkLatency(),
        }));

        recordSamples([MID_HUNG_MS, MID_HUNG_MS]);

        expect(result.current).toEqual({
          tier: expectedTier,
          latency: 'slow',
        });
      },
    );

    it('reports ok on 3g without changing SLOW_CELLULAR', () => {
      mockNetInfoState({
        type: 'cellular',
        isInternetReachable: true,
        details: { cellularGeneration: '3g' },
      });
      const { result } = renderHook(() => ({
        tier: useNetworkTier(),
        latency: useNetworkLatency(),
      }));

      recordSamples([300, 300, 300]);

      expect(result.current).toEqual({ tier: 'SLOW_CELLULAR', latency: 'ok' });
    });

    it('reports unknown latency while offline over a slow bucket', () => {
      mockNetInfoState({
        type: 'none',
        isInternetReachable: false,
        details: {},
      });
      const { result } = renderHook(() => useNetworkLatency());

      recordSamples([MID_HUNG_MS, MID_HUNG_MS]);

      expect(result.current).toBe('unknown');
    });

    it('does not re-render useNetworkTier when the latency bucket changes', () => {
      mockNetInfoState({
        type: 'wifi',
        isInternetReachable: true,
        details: {},
      });
      let renders = 0;
      renderHook(() => {
        renders += 1;
        return useNetworkTier();
      });
      const rendersBefore = renders;

      recordSamples([MID_HUNG_MS, MID_HUNG_MS]);

      expect(renders).toBe(rendersBefore);
    });

    it('re-renders only when the latency bucket changes', () => {
      mockNetInfoState({
        type: 'wifi',
        isInternetReachable: true,
        details: {},
      });
      let renders = 0;
      renderHook(() => {
        renders += 1;
        return useNetworkLatency();
      });
      recordSamples([300, 300, 300]);
      const rendersAtOk = renders;

      recordSamples([300, 400, 500, 300]);
      const rendersAfterSameBucket = renders;
      recordSamples([MID_HUNG_MS, MID_HUNG_MS]);

      expect(rendersAfterSameBucket).toBe(rendersAtOk);
      expect(renders).toBe(rendersAtOk + 1);
    });
  });

  it('returns WIFI for mocked wifi NetInfo', () => {
    mockNetInfoState({
      type: 'wifi',
      isInternetReachable: true,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('WIFI');
  });

  it('returns FAST_CELLULAR for mocked cellular 5g NetInfo', () => {
    mockNetInfoState({
      type: 'cellular',
      isInternetReachable: true,
      details: { cellularGeneration: '5g' },
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('FAST_CELLULAR');
  });

  it('returns SLOW_CELLULAR for mocked cellular 3g NetInfo', () => {
    mockNetInfoState({
      type: 'cellular',
      isInternetReachable: true,
      details: { cellularGeneration: '3g' },
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('SLOW_CELLULAR');
  });

  it('returns NONE for mocked none NetInfo', () => {
    mockNetInfoState({
      type: 'none',
      isInternetReachable: false,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('NONE');
  });

  it('returns null for mocked unknown NetInfo', () => {
    mockNetInfoState({
      type: 'unknown',
      isInternetReachable: null,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBeNull();
  });

  it('reports the initial unknown NetInfo state as unresolved', () => {
    mockNetInfoState({
      type: 'unknown',
      isInternetReachable: null,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTierState());

    expect(result.current).toEqual({
      tier: null,
      isResolved: false,
    });
  });

  it('reports unclassified but initialized transports as resolved unknown', () => {
    mockNetInfoState({
      type: 'vpn',
      isInternetReachable: true,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTierState());

    expect(result.current).toEqual({
      tier: null,
      isResolved: true,
    });
  });

  it('reports explicit unreachability as resolved even for an unknown type', () => {
    mockNetInfoState({
      type: 'unknown',
      isInternetReachable: false,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTierState());

    expect(result.current).toEqual({
      tier: 'NONE',
      isResolved: true,
    });
  });

  it('returns NONE for wifi when internet is not reachable', () => {
    mockNetInfoState({
      type: 'wifi',
      isInternetReachable: false,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('NONE');
  });

  it('returns NONE for unknown type when internet is not reachable', () => {
    mockNetInfoState({
      type: 'unknown',
      isInternetReachable: false,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('NONE');
  });

  it('returns NONE for cellular when internet is not reachable', () => {
    mockNetInfoState({
      type: 'cellular',
      isInternetReachable: false,
      details: { cellularGeneration: '5g' },
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('NONE');
  });

  it('returns WIFI when wifi reachability is still null', () => {
    mockNetInfoState({
      type: 'wifi',
      isInternetReachable: null,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBe('WIFI');
  });

  it('returns null for cellular without generation in details', () => {
    mockNetInfoState({
      type: 'cellular',
      isInternetReachable: true,
      details: {},
    });

    const { result } = renderHook(() => useNetworkTier());

    expect(result.current).toBeNull();
  });
});
