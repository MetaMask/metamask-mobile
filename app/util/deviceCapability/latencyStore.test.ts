import { AppState, type AppStateStatus } from 'react-native';
import {
  addEventListener as addNetInfoEventListener,
  type NetInfoState,
} from '@react-native-community/netinfo';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
}));

type NetInfoListener = (state: NetInfoState) => void;
type AppStateListener = (state: AppStateStatus) => void;

const NOW_MS = 1_000_000;

const netInfoState = (
  type: string,
  isInternetReachable: boolean | null = true,
  details: Record<string, unknown> = {},
) => ({ type, isInternetReachable, details }) as unknown as NetInfoState;

describe('latencyStore', () => {
  let store: typeof import('./latencyStore');
  let emitNetInfo: NetInfoListener;
  let emitAppState: AppStateListener;

  const record = (durationMs: number, atMs = NOW_MS) =>
    store.recordFetchSample({ atMs, durationMs });

  beforeEach(() => {
    jest.mocked(addNetInfoEventListener).mockImplementation((listener) => {
      emitNetInfo = listener as NetInfoListener;
      return jest.fn();
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, listener) => {
        emitAppState = listener as AppStateListener;
        return { remove: jest.fn() };
      });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    jest.isolateModules(() => {
      store = jest.requireActual('./latencyStore');
    });
    store.startLatencyMonitoring('HIGH');
    emitNetInfo(netInfoState('wifi'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not notify while the bucket stays ok', () => {
    [300, 300, 300].forEach((duration) => record(duration));
    const listener = jest.fn();
    store.subscribeLatency(listener);

    [300, 400, 500].forEach((duration) => record(duration));

    expect(listener).not.toHaveBeenCalled();
    expect(store.getLatencySnapshot()).toBe('ok');
  });

  it('keeps the same snapshot reference for a same-bucket sample', () => {
    [300, 300, 300].forEach((duration) => record(duration));
    const before = store.getLatencySnapshot();

    record(400);

    expect(store.getLatencySnapshot()).toBe(before);
  });

  it('notifies once when the bucket becomes slow', () => {
    [300, 300, 300].forEach((duration) => record(duration));
    const listener = jest.fn();
    store.subscribeLatency(listener);

    [8000, 8000, 8000].forEach((duration) => record(duration));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getLatencySnapshot()).toBe('slow');
  });

  it('notifies once when three good samples release slow', () => {
    [8000, 8000].forEach((duration) => record(duration));
    const listener = jest.fn();
    store.subscribeLatency(listener);

    [300, 300, 300].forEach((duration) => record(duration));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getLatencySnapshot()).toBe('ok');
  });

  it('stops notifying after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = store.subscribeLatency(listener);
    unsubscribe();

    [8000, 8000].forEach((duration) => record(duration));

    expect(listener).not.toHaveBeenCalled();
  });

  it('resets slow to unknown on background to active', () => {
    [8000, 8000].forEach((duration) => record(duration));

    emitAppState('background');
    emitAppState('active');

    expect(store.getLatencySnapshot()).toBe('unknown');
    expect(store.getLatencyDebugSnapshot().sampleCount).toBe(0);
  });

  it('keeps samples through inactive', () => {
    [8000, 8000].forEach((duration) => record(duration));

    emitAppState('inactive');
    emitAppState('active');

    expect(store.getLatencySnapshot()).toBe('slow');
  });

  it('resets slow to unknown on a NetInfo value change', () => {
    [8000, 8000].forEach((duration) => record(duration));

    emitNetInfo(netInfoState('cellular', true, { cellularGeneration: '4g' }));

    expect(store.getLatencySnapshot()).toBe('unknown');
  });

  it('keeps samples when NetInfo repeats the same values', () => {
    [8000, 8000].forEach((duration) => record(duration));

    emitNetInfo(netInfoState('wifi'));

    expect(store.getLatencySnapshot()).toBe('slow');
  });

  it('adds no samples while the transport is NONE', () => {
    emitNetInfo(netInfoState('none', false));

    [8000, 8000].forEach((duration) => record(duration));

    expect(store.isLatencyTransportNone()).toBe(true);
    expect(store.getLatencySnapshot()).toBe('unknown');
    expect(store.getLatencyDebugSnapshot().sampleCount).toBe(0);
  });

  it('reports the debug values for the hardware row in use', () => {
    [300, 8000, 500].forEach((duration) => record(duration));

    const result = store.getLatencyDebugSnapshot();

    expect(result).toEqual({
      bucket: 'ok',
      hardwareRow: 'HIGH',
      medianMs: 500,
      hungCount: 1,
      sampleCount: 3,
      transportLabel: 'wifi',
    });
    expect(store.getLatencyThresholds()).toEqual({
      hungMs: 8000,
      slowMs: 2500,
    });
  });

  it('reports cellular generation and other NetInfo types', () => {
    emitNetInfo(netInfoState('cellular', true, { cellularGeneration: '5g' }));
    expect(store.getLatencyDebugSnapshot().transportLabel).toBe('5g');

    emitNetInfo(netInfoState('vpn'));
    expect(store.getLatencyDebugSnapshot().transportLabel).toBe('vpn');
  });

  it('uses the MID row for unknown hardware', () => {
    store.startLatencyMonitoring(null);

    const result = store.getLatencyDebugSnapshot();

    expect(result.hardwareRow).toBe('MID');
    expect(store.getLatencyThresholds()).toEqual({
      hungMs: 15000,
      slowMs: 5500,
    });
  });
});
