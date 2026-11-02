jest.mock('../../framework/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
  LogLevel: { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' },
}));

const mockQueryAppState = jest.fn();
jest.mock('../../framework/AppiumUtilities', () => ({
  getDriver: () => ({ queryAppState: mockQueryAppState }),
}));

const mockSleep = jest.fn();
jest.mock('../../framework/Utilities', () => ({
  sleep: (ms: number) => mockSleep(ms),
}));

import type { CurrentDeviceDetails } from '../../framework/fixtures/playwright';
import {
  APP_STATE_BEFORE_LAUNCH_ANNOTATION,
  prepareInTestLaunch,
} from './launchAppInTest';

const SETTLE_KEY = 'TESTMU_PRE_LAUNCH_SETTLE_SECONDS';

const androidDevice: CurrentDeviceDetails = {
  platform: 'android',
  deviceName: 'Pixel 8 Pro',
  packageName: 'io.metamask',
  appId: 'io.metamask.MetaMask',
  launchableActivity: 'io.metamask.MainActivity',
  isBrowserstack: false,
  isRemoteCloud: true,
};

const iosDevice: CurrentDeviceDetails = {
  ...androidDevice,
  platform: 'ios',
  deviceName: 'iPhone 16 Pro Max',
};

const newTestInfo = () => ({
  annotations: [] as { type: string; description?: string }[],
});

describe('prepareInTestLaunch', () => {
  const originalSettle = process.env[SETTLE_KEY];

  beforeEach(() => {
    mockQueryAppState.mockReset();
    mockSleep.mockReset();
    mockSleep.mockResolvedValue(undefined);
    Reflect.deleteProperty(process.env, SETTLE_KEY);
  });

  afterAll(() => {
    if (originalSettle === undefined) {
      Reflect.deleteProperty(process.env, SETTLE_KEY);
    } else {
      process.env[SETTLE_KEY] = originalSettle;
    }
  });

  it('records the app state and does not wait when no settle time is set', async () => {
    mockQueryAppState.mockResolvedValue(1);
    const testInfo = newTestInfo();

    await prepareInTestLaunch(androidDevice, testInfo);

    expect(mockQueryAppState).toHaveBeenCalledWith('io.metamask');
    expect(testInfo.annotations).toStrictEqual([
      { type: APP_STATE_BEFORE_LAUNCH_ANNOTATION, description: '1' },
    ]);
    expect(mockSleep).not.toHaveBeenCalled();
  });

  it('queries the bundle id on iOS', async () => {
    mockQueryAppState.mockResolvedValue(1);

    await prepareInTestLaunch(iosDevice, newTestInfo());

    expect(mockQueryAppState).toHaveBeenCalledWith('io.metamask.MetaMask');
  });

  it.each([
    ['30', 30_000],
    ['2.5', 2_500],
    [' 0 ', 0],
    ['', 0],
  ])(
    'waits TESTMU_PRE_LAUNCH_SETTLE_SECONDS=%p as %p ms after the state check',
    async (envValue, expectedMs) => {
      process.env[SETTLE_KEY] = envValue;
      mockQueryAppState.mockResolvedValue(1);

      await prepareInTestLaunch(androidDevice, newTestInfo());

      if (expectedMs === 0) {
        expect(mockSleep).not.toHaveBeenCalled();
      } else {
        expect(mockSleep).toHaveBeenCalledWith(expectedMs);
        expect(mockQueryAppState.mock.invocationCallOrder[0]).toBeLessThan(
          mockSleep.mock.invocationCallOrder[0],
        );
      }
    },
  );

  it.each([0, 3, 4])(
    'throws without waiting when the app state is %p',
    async (appState) => {
      process.env[SETTLE_KEY] = '30';
      mockQueryAppState.mockResolvedValue(appState);
      const testInfo = newTestInfo();

      await expect(
        prepareInTestLaunch(androidDevice, testInfo),
      ).rejects.toThrow(
        `io.metamask was in app state ${appState} before the in-test launch`,
      );
      expect(testInfo.annotations).toStrictEqual([
        {
          type: APP_STATE_BEFORE_LAUNCH_ANNOTATION,
          description: String(appState),
        },
      ]);
      expect(mockSleep).not.toHaveBeenCalled();
    },
  );

  it.each(['soon', '-1', 'Infinity'])(
    'throws before any device command when TESTMU_PRE_LAUNCH_SETTLE_SECONDS is %p',
    async (envValue) => {
      process.env[SETTLE_KEY] = envValue;

      await expect(
        prepareInTestLaunch(androidDevice, newTestInfo()),
      ).rejects.toThrow('TESTMU_PRE_LAUNCH_SETTLE_SECONDS must be');
      expect(mockQueryAppState).not.toHaveBeenCalled();
    },
  );

  it('propagates a failed app state query', async () => {
    mockQueryAppState.mockRejectedValue(new Error('not implemented'));

    await expect(
      prepareInTestLaunch(androidDevice, newTestInfo()),
    ).rejects.toThrow('not implemented');
    expect(mockSleep).not.toHaveBeenCalled();
  });
});
