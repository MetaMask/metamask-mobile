/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'child_process';
import { setupAdbReverse } from './utils.ts';

jest.mock('../../framework', () => ({
  sleep: jest.fn().mockResolvedValue(undefined),
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }),
}));

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execFileSync: jest.fn(),
}));

const mockedExecFileSync = jest.mocked(execFileSync);

describe('setupAdbReverse', () => {
  const previousPoolSize = process.env.ANDROID_DEVICE_POOL_SIZE;
  const previousIosUdid = process.env.IOS_SIMULATOR_UDID;
  const previousIosPoolSize = process.env.IOS_DEVICE_POOL_SIZE;

  afterEach(() => {
    mockedExecFileSync.mockReset();
    if (previousPoolSize === undefined) {
      delete process.env.ANDROID_DEVICE_POOL_SIZE;
    } else {
      process.env.ANDROID_DEVICE_POOL_SIZE = previousPoolSize;
    }
    if (previousIosUdid === undefined) {
      delete process.env.IOS_SIMULATOR_UDID;
    } else {
      process.env.IOS_SIMULATOR_UDID = previousIosUdid;
    }
    if (previousIosPoolSize === undefined) {
      delete process.env.IOS_DEVICE_POOL_SIZE;
    } else {
      process.env.IOS_DEVICE_POOL_SIZE = previousIosPoolSize;
    }
  });

  it('throws when adb reverse fails for an Android device pool', () => {
    delete process.env.IOS_SIMULATOR_UDID;
    delete process.env.IOS_DEVICE_POOL_SIZE;
    process.env.ANDROID_DEVICE_POOL_SIZE = '2';
    mockedExecFileSync.mockImplementation(() => {
      throw new Error('device offline');
    });

    expect(() => setupAdbReverse(8093, 8193)).toThrow(
      'Could not set up ADB reverse tcp:8093 → tcp:8193: device offline',
    );
  });

  it('skips adb entirely on iOS even when ANDROID_DEVICE_POOL_SIZE leaked', () => {
    process.env.ANDROID_DEVICE_POOL_SIZE = '3';
    process.env.IOS_DEVICE_POOL_SIZE = '2';
    process.env.IOS_SIMULATOR_UDID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    expect(() => setupAdbReverse(8093, 8193)).not.toThrow();
    expect(mockedExecFileSync).not.toHaveBeenCalled();
  });
});
