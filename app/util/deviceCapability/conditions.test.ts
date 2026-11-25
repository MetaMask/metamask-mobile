import {
  addEventListener,
  type NetInfoState,
} from '@react-native-community/netinfo';
import { getTotalMemorySync } from 'react-native-device-info';
import { getNetworkConditions, subscribeNetworkConditions } from './conditions';
import {
  getLatencySampleEpoch,
  recordFetchSample,
  startLatencyMonitoring,
} from './latencyStore';
import { setDeviceCapabilityOverride } from './override';

jest.mock('../Logger');
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
}));
jest.mock('react-native-device-info', () => ({
  getTotalMemorySync: jest.fn(() => 8 * 1024 ** 3),
}));

function wifi(isInternetReachable: boolean): NetInfoState {
  return { type: 'wifi', isInternetReachable } as NetInfoState;
}

describe('network conditions', () => {
  it('follows measured transport and latency through the existing NetInfo listener', () => {
    startLatencyMonitoring('HIGH');
    const [onNetworkChange] = jest.mocked(addEventListener).mock.calls[0];
    const listener = jest.fn(() => getNetworkConditions());
    const unsubscribe = subscribeNetworkConditions(listener);

    onNetworkChange(wifi(true));
    for (let i = 0; i < 3; i++) {
      recordFetchSample(100, getLatencySampleEpoch());
    }
    onNetworkChange(wifi(false));
    unsubscribe();
    onNetworkChange(wifi(true));

    expect(listener.mock.results.map(({ value }) => value)).toEqual([
      { hardware: 'HIGH', network: 'WIFI', latency: 'UNKNOWN' },
      { hardware: 'HIGH', network: 'WIFI', latency: 'OK' },
      { hardware: 'HIGH', network: 'NONE', latency: 'UNKNOWN' },
    ]);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(getTotalMemorySync).toHaveBeenCalledTimes(1);
  });

  it('publishes the effective dev override and restores measured conditions', () => {
    const measured = getNetworkConditions();
    const dev = jest.replaceProperty(
      global as typeof global & { __DEV__: boolean },
      '__DEV__',
      true,
    );
    const listener = jest.fn(() => getNetworkConditions());
    const unsubscribe = subscribeNetworkConditions(listener);
    const override = {
      hardware: 'LOW',
      network: 'SLOW_CELLULAR',
      latency: 'SLOW',
    } as const;

    try {
      setDeviceCapabilityOverride(override);
      setDeviceCapabilityOverride(override);
      setDeviceCapabilityOverride({});

      expect(listener.mock.results.map(({ value }) => value)).toEqual([
        override,
        measured,
      ]);
    } finally {
      unsubscribe();
      setDeviceCapabilityOverride();
      dev.restore();
    }
  });
});
