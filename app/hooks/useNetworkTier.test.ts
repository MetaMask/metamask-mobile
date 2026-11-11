import { act, renderHook } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import {
  clearLatencySamples,
  recordFetchSample,
} from '../util/deviceCapability/latencyStore';
import { useNetworkTier, useNetworkTierState } from './useNetworkTier';

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

  describe('latency fold', () => {
    it.each([
      ['wifi', {}],
      ['cellular', { cellularGeneration: '5g' }],
      ['cellular', { cellularGeneration: '3g' }],
      ['vpn', {}],
    ])(
      'returns SLOW_CELLULAR for %s %o when latency is slow',
      (type, details) => {
        mockNetInfoState({ type, isInternetReachable: true, details });
        const { result } = renderHook(() => useNetworkTier());

        recordSamples([MID_HUNG_MS, MID_HUNG_MS]);

        expect(result.current).toBe('SLOW_CELLULAR');
      },
    );

    it('reports the transport tier and latency separately', () => {
      mockNetInfoState({ type: 'vpn', isInternetReachable: true, details: {} });
      const { result } = renderHook(() => useNetworkTierState());

      recordSamples([MID_HUNG_MS, MID_HUNG_MS]);

      expect(result.current).toEqual({
        tier: 'SLOW_CELLULAR',
        transportTier: null,
        latency: 'slow',
        isResolved: true,
      });
    });

    it('keeps vpn at null when latency is ok', () => {
      mockNetInfoState({ type: 'vpn', isInternetReachable: true, details: {} });
      const { result } = renderHook(() => useNetworkTierState());

      recordSamples([300, 300, 300]);

      expect(result.current.tier).toBeNull();
      expect(result.current.latency).toBe('ok');
    });

    it('keeps NONE with unknown latency over a slow bucket', () => {
      mockNetInfoState({
        type: 'none',
        isInternetReachable: false,
        details: {},
      });
      const { result } = renderHook(() => useNetworkTierState());

      recordSamples([MID_HUNG_MS, MID_HUNG_MS]);

      expect(result.current.tier).toBe('NONE');
      expect(result.current.latency).toBe('unknown');
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
        return useNetworkTier();
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
      transportTier: null,
      latency: 'unknown',
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
      transportTier: null,
      latency: 'unknown',
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
      transportTier: 'NONE',
      latency: 'unknown',
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
