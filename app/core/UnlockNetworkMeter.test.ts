import { setMeasurement } from '@sentry/react-native';
import {
  __resetUnlockNetworkMeterForTests,
  endUnlockWindow,
  getLastUnlockSummary,
  getUnlockWindowLiveCount,
  isUnlockWindowActive,
  recordUnlockNetworkRequest,
  signalHomepageReadyForUnlockMeter,
  startUnlockWindow,
  UNLOCK_HTTP_REQUEST_COUNT_MEASUREMENT,
  UNLOCK_NETWORK_METER_MAX_WINDOW_MS,
  UNLOCK_NETWORK_METER_QUIET_MS,
} from './UnlockNetworkMeter';

jest.mock('@sentry/react-native', () => ({
  setMeasurement: jest.fn(),
}));

const mockSetMeasurement = jest.mocked(setMeasurement);

describe('UnlockNetworkMeter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    __resetUnlockNetworkMeterForTests();
    mockSetMeasurement.mockClear();
  });

  afterEach(() => {
    __resetUnlockNetworkMeterForTests();
    jest.useRealTimers();
  });

  it('ignores record calls when the unlock window is inactive', () => {
    recordUnlockNetworkRequest('GET', 'https://api.example.com/v1');

    expect(isUnlockWindowActive()).toBe(false);
    expect(getLastUnlockSummary()).toBeNull();
    expect(getUnlockWindowLiveCount()).toBe(0);
  });

  it('records method/host/url while the window is active', () => {
    startUnlockWindow();
    recordUnlockNetworkRequest('post', 'https://api.example.com/a');
    recordUnlockNetworkRequest('GET', 'https://cdn.example.com/b');

    expect(isUnlockWindowActive()).toBe(true);
    expect(getUnlockWindowLiveCount()).toBe(2);

    signalHomepageReadyForUnlockMeter();
    jest.advanceTimersByTime(UNLOCK_NETWORK_METER_QUIET_MS);

    const summary = getLastUnlockSummary();
    expect(summary).toMatchObject({
      total: 2,
      byHost: {
        'api.example.com': 1,
        'cdn.example.com': 1,
      },
      endReason: 'quiescence',
    });
    expect(summary?.requests[0]).toMatchObject({
      method: 'POST',
      host: 'api.example.com',
      url: 'https://api.example.com/a',
    });
    expect(mockSetMeasurement).toHaveBeenCalledWith(
      UNLOCK_HTTP_REQUEST_COUNT_MEASUREMENT,
      2,
      'none',
    );
  });

  it('does not end on quiescence until homepage is ready', () => {
    startUnlockWindow();
    recordUnlockNetworkRequest('GET', 'https://api.example.com/a');

    jest.advanceTimersByTime(UNLOCK_NETWORK_METER_QUIET_MS * 3);

    expect(isUnlockWindowActive()).toBe(true);
    expect(getLastUnlockSummary()).toBeNull();
  });

  it('ends via max window fallback', () => {
    startUnlockWindow();
    recordUnlockNetworkRequest('GET', 'https://api.example.com/a');
    // Do not signal homepage ready — quiescence must not fire first.

    jest.advanceTimersByTime(UNLOCK_NETWORK_METER_MAX_WINDOW_MS);

    expect(getLastUnlockSummary()?.endReason).toBe('max_window');
    expect(isUnlockWindowActive()).toBe(false);
  });

  it('ends manually and emits the Sentry measurement', () => {
    startUnlockWindow();
    recordUnlockNetworkRequest('GET', 'https://api.example.com/a');

    const summary = endUnlockWindow('manual');

    expect(summary?.total).toBe(1);
    expect(summary?.endReason).toBe('manual');
    expect(mockSetMeasurement).toHaveBeenCalledWith(
      UNLOCK_HTTP_REQUEST_COUNT_MEASUREMENT,
      1,
      'none',
    );
  });

  it('resets an in-flight window when startUnlockWindow is called again', () => {
    startUnlockWindow();
    recordUnlockNetworkRequest('GET', 'https://api.example.com/old');
    startUnlockWindow();
    recordUnlockNetworkRequest('GET', 'https://api.example.com/new');
    endUnlockWindow('manual');

    expect(getLastUnlockSummary()?.total).toBe(1);
    expect(getLastUnlockSummary()?.requests[0]?.url).toBe(
      'https://api.example.com/new',
    );
  });
});
