import { useEffect, useState } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import {
  addEventListener as addNetInfoEventListener,
  useNetInfo,
  type NetInfoState,
} from '@react-native-community/netinfo';
import {
  clearLatencySamples,
  getLatencySampleEpoch,
  recordFetchSample,
  startLatencyMonitoring,
} from '../util/deviceCapability/latencyStore';
import { useNetworkLatency } from './useNetworkLatency';
import { useNetworkTier } from './useNetworkTier';

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
  addEventListener: jest.fn(),
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
      recordFetchSample(
        { atMs: Date.now(), durationMs },
        getLatencySampleEpoch(),
      ),
    );
  });

describe('useNetworkLatency', () => {
  beforeAll(() => {
    // The store drops samples until the first NetInfo event; emit one so the
    // transport gate opens (it never fires by itself under jest).
    startLatencyMonitoring(null);
    const listener = jest.mocked(addNetInfoEventListener).mock.calls[0]?.[0] as
      | ((state: NetInfoState) => void)
      | undefined;
    listener?.({
      type: 'wifi',
      isInternetReachable: true,
      details: {},
    } as NetInfoState);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    clearLatencySamples();
  });

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
        latency: 'SLOW',
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

    expect(result.current).toEqual({ tier: 'SLOW_CELLULAR', latency: 'OK' });
  });

  it('does not re-render when NetInfo changes', () => {
    const listeners = new Set<() => void>();
    let state: {
      type: string;
      isInternetReachable: boolean | null;
      details: Record<string, unknown>;
    } = {
      type: 'wifi',
      isInternetReachable: true,
      details: {},
    };
    const useSubscribingNetInfo = () => {
      const [, setTick] = useState(0);
      useEffect(() => {
        const listener = () => setTick((tick) => tick + 1);
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }, []);
      return state;
    };
    mockUseNetInfo.mockImplementation(
      useSubscribingNetInfo as unknown as typeof useNetInfo,
    );
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useNetworkLatency();
    });
    const rendersAfterMount = renders;

    state = {
      type: 'none',
      isInternetReachable: false,
      details: {},
    };
    act(() => {
      listeners.forEach((listener) => listener());
    });

    expect(renders).toBe(rendersAfterMount);
    expect(result.current).toBe('UNKNOWN');
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
