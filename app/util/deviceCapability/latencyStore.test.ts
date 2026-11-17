import { AppState, type AppStateStatus } from 'react-native';
import {
  addEventListener as addNetInfoEventListener,
  type NetInfoState,
} from '@react-native-community/netinfo';
import Logger from '../Logger';

jest.mock('../Logger');

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
}));

type NetInfoListener = (state: NetInfoState) => void;
type AppStateListener = (state: AppStateStatus) => void;

const netInfoState = (
  type: string,
  isInternetReachable: boolean | null = true,
  details: Record<string, unknown> = {},
) => ({ type, isInternetReachable, details }) as unknown as NetInfoState;

describe('latencyStore', () => {
  let store: typeof import('./latencyStore');
  let emitNetInfo: NetInfoListener;
  let emitAppState: AppStateListener;

  const record = (durationMs: number) =>
    store.recordFetchSample(durationMs, store.getLatencySampleEpoch());

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
    expect(store.getLatencySnapshot()).toBe('OK');
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
    expect(store.getLatencySnapshot()).toBe('SLOW');
  });

  it('notifies once when three good samples release slow', () => {
    [8000, 8000].forEach((duration) => record(duration));
    const listener = jest.fn();
    store.subscribeLatency(listener);

    [300, 300, 300].forEach((duration) => record(duration));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getLatencySnapshot()).toBe('OK');
  });

  it('logs a throwing listener and still notifies the others', () => {
    const failure = new Error('subscriber failed');
    const throwing = jest.fn(() => {
      throw failure;
    });
    const healthy = jest.fn();
    store.subscribeLatency(throwing);
    store.subscribeLatency(healthy);

    expect(() =>
      [8000, 8000].forEach((duration) => record(duration)),
    ).not.toThrow();

    expect(healthy).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith(
      failure,
      'latencyStore: listener threw',
    );
  });

  it('stops notifying after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = store.subscribeLatency(listener);
    unsubscribe();

    [8000, 8000].forEach((duration) => record(duration));

    expect(listener).not.toHaveBeenCalled();
  });

  it('drops a sample started before clearLatencySamples', () => {
    const epochAtStart = store.getLatencySampleEpoch();

    store.clearLatencySamples();
    store.recordFetchSample(8000, epochAtStart);
    store.recordFetchSample(8000, epochAtStart);

    expect(store.getLatencySnapshot()).toBe('UNKNOWN');
  });

  it('records a sample started after clearLatencySamples', () => {
    store.clearLatencySamples();

    record(8000);
    record(8000);

    expect(store.getLatencySnapshot()).toBe('SLOW');
  });

  it('clears samples on background and ignores records until active', () => {
    [8000, 8000].forEach((duration) => record(duration));

    emitAppState('background');

    expect(store.getLatencySnapshot()).toBe('UNKNOWN');

    record(8000);
    record(8000);

    expect(store.getLatencySnapshot()).toBe('UNKNOWN');

    emitAppState('active');
    record(8000);
    record(8000);

    expect(store.getLatencySnapshot()).toBe('SLOW');
  });

  it('re-reads a background import once monitoring starts in the foreground', () => {
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'background',
    });
    jest.isolateModules(() => {
      store = jest.requireActual('./latencyStore');
    });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });

    store.startLatencyMonitoring('HIGH');
    emitNetInfo(netInfoState('wifi'));
    record(8000);
    record(8000);

    expect(store.getLatencySnapshot()).toBe('SLOW');
  });

  it('re-reads a foreground import once monitoring starts in the background', () => {
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    jest.isolateModules(() => {
      store = jest.requireActual('./latencyStore');
    });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'background',
    });

    store.startLatencyMonitoring('HIGH');
    emitNetInfo(netInfoState('wifi'));
    record(8000);
    record(8000);

    expect(store.getLatencySnapshot()).toBe('UNKNOWN');
  });

  it('drops a fetch that starts in background and settles after resume', () => {
    emitAppState('background');
    const epochAtStart = store.getLatencySampleEpoch();

    emitAppState('active');
    store.recordFetchSample(30000, epochAtStart);
    store.recordFetchSample(30000, epochAtStart);

    expect(store.getLatencySnapshot()).toBe('UNKNOWN');
  });

  it('keeps samples through inactive', () => {
    [8000, 8000].forEach((duration) => record(duration));

    emitAppState('inactive');
    emitAppState('active');

    expect(store.getLatencySnapshot()).toBe('SLOW');
  });

  it('drops in-flight samples that span inactive', () => {
    [300, 300, 300].forEach((duration) => record(duration));
    const epochAtStart = store.getLatencySampleEpoch();

    emitAppState('inactive');
    emitAppState('active');
    store.recordFetchSample(30000, epochAtStart);
    store.recordFetchSample(30000, epochAtStart);

    expect(store.getLatencySnapshot()).toBe('OK');
  });

  it('resets slow to unknown on a NetInfo value change', () => {
    [8000, 8000].forEach((duration) => record(duration));

    emitNetInfo(netInfoState('cellular', true, { cellularGeneration: '4g' }));

    expect(store.getLatencySnapshot()).toBe('UNKNOWN');
  });

  it('keeps samples when NetInfo repeats the same values', () => {
    [8000, 8000].forEach((duration) => record(duration));

    emitNetInfo(netInfoState('wifi'));

    expect(store.getLatencySnapshot()).toBe('SLOW');
  });

  it('keeps samples through a reachability-only isInternetReachable flip', () => {
    [8000, 8000].forEach((duration) => record(duration));

    emitNetInfo(netInfoState('wifi', null));
    emitNetInfo(netInfoState('wifi', true));

    expect(store.getLatencySnapshot()).toBe('SLOW');
  });

  it('drops samples recorded before the first NetInfo event', () => {
    jest.isolateModules(() => {
      store = jest.requireActual('./latencyStore');
    });
    store.startLatencyMonitoring('HIGH');

    [8000, 8000].forEach((duration) => record(duration));

    expect(store.getLatencySnapshot()).toBe('UNKNOWN');

    emitNetInfo(netInfoState('wifi'));
    [8000, 8000].forEach((duration) => record(duration));

    expect(store.getLatencySnapshot()).toBe('SLOW');
  });

  it('drops in-flight samples that span a reconnect on the same transport', () => {
    [300, 300, 300].forEach((duration) => record(duration));

    emitNetInfo(netInfoState('wifi', false));
    const epochWhileOffline = store.getLatencySampleEpoch();

    emitNetInfo(netInfoState('wifi', true));
    store.recordFetchSample(30000, epochWhileOffline);
    store.recordFetchSample(30000, epochWhileOffline);

    expect(store.getLatencySnapshot()).toBe('UNKNOWN');
  });

  it('adds no samples while the transport is NONE', () => {
    emitNetInfo(netInfoState('none', false));

    [8000, 8000].forEach((duration) => record(duration));

    expect(store.getLatencySnapshot()).toBe('UNKNOWN');
  });

  it('clears samples when the hardware row changes', () => {
    [8000, 8000].forEach((duration) => record(duration));

    store.startLatencyMonitoring('LOW');

    expect(store.getLatencySnapshot()).toBe('UNKNOWN');
  });

  it('keeps samples when the same hardware row is selected again', () => {
    [8000, 8000].forEach((duration) => record(duration));

    store.startLatencyMonitoring('HIGH');

    expect(store.getLatencySnapshot()).toBe('SLOW');
  });

  it('drops an in-flight sample that spans a hardware row change', () => {
    const epochAtStart = store.getLatencySampleEpoch();

    store.startLatencyMonitoring('LOW');
    store.recordFetchSample(30000, epochAtStart);
    store.recordFetchSample(30000, epochAtStart);

    expect(store.getLatencySnapshot()).toBe('UNKNOWN');
  });

  it('uses the HIGH thresholds for a HIGH hardware row', () => {
    expect(store.getLatencyThresholds()).toEqual({
      hungMs: 8000,
      slowMs: 2500,
    });
  });

  it('uses the MID row for unknown hardware', () => {
    store.startLatencyMonitoring(null);

    expect(store.getLatencyThresholds()).toEqual({
      hungMs: 15000,
      slowMs: 5500,
    });
  });
});
