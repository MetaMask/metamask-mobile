import {
  applyAndroidDevicePoolToWorker,
  deviceForWorker,
  parseAndroidDevicePool,
  resolveAndroidDevicePoolSize,
} from './androidDevicePool.ts';

describe('androidDevicePool', () => {
  describe('parseAndroidDevicePool', () => {
    it('returns no devices when the pool is unset', () => {
      const result = parseAndroidDevicePool(undefined);

      expect(result).toEqual([]);
    });

    it('trims comma-separated adb serials', () => {
      const result = parseAndroidDevicePool(
        ' emulator-5554,emulator-5556 ',
      );

      expect(result).toEqual(['emulator-5554', 'emulator-5556']);
    });

    it('rejects duplicate adb serials', () => {
      const parseDuplicates = () =>
        parseAndroidDevicePool('emulator-5554,emulator-5554');

      expect(parseDuplicates).toThrow(
        'ANDROID_DEVICE_POOL contains duplicate serial "emulator-5554".',
      );
    });
  });

  describe('resolveAndroidDevicePoolSize', () => {
    it('defaults to one when ANDROID_DEVICE_POOL_SIZE is unset', () => {
      const result = resolveAndroidDevicePoolSize({});

      expect(result).toBe(1);
    });

    it('returns two for the Android pool pilot', () => {
      const result = resolveAndroidDevicePoolSize({
        ANDROID_DEVICE_POOL_SIZE: '2',
      });

      expect(result).toBe(2);
    });

    it('rejects non-positive pool sizes', () => {
      const resolveZero = () =>
        resolveAndroidDevicePoolSize({ ANDROID_DEVICE_POOL_SIZE: '0' });

      expect(resolveZero).toThrow(
        'Invalid ANDROID_DEVICE_POOL_SIZE "0". Expected a positive integer.',
      );
    });
  });

  describe('deviceForWorker', () => {
    it('returns no assignment when the pool is unset', () => {
      const result = deviceForWorker(0, {});

      expect(result).toBeUndefined();
    });

    it('pins workers from ANDROID_DEVICE_POOL_SIZE when ANDROID_DEVICE_POOL is unset', () => {
      const env = { ANDROID_DEVICE_POOL_SIZE: '2' };

      const first = deviceForWorker(0, env);
      const second = deviceForWorker(1, env);

      expect(first?.serial).toBe('emulator-5554');
      expect(second?.serial).toBe('emulator-5556');
      expect(first?.systemPort).not.toBe(second?.systemPort);
    });

    it('assigns distinct adb and Appium ports to two workers', () => {
      const env = {
        ANDROID_DEVICE_POOL: 'emulator-5554,emulator-5556',
      };

      const first = deviceForWorker(0, env);
      const second = deviceForWorker(1, env);

      expect(first).toEqual({
        serial: 'emulator-5554',
        systemPort: 8200,
        chromedriverPort: 9100,
        mjpegServerPort: 7810,
      });
      expect(second).toEqual({
        serial: 'emulator-5556',
        systemPort: 8201,
        chromedriverPort: 9101,
        mjpegServerPort: 7811,
      });
      expect(first?.serial).not.toBe(second?.serial);
      expect(first?.systemPort).not.toBe(second?.systemPort);
    });

    it('rejects a worker index outside the configured pool', () => {
      const assignMissingWorker = () =>
        deviceForWorker(2, {
          ANDROID_DEVICE_POOL: 'emulator-5554,emulator-5556',
        });

      expect(assignMissingWorker).toThrow(
        'Android worker 2 has no device in ANDROID_DEVICE_POOL (2 devices).',
      );
    });
  });

  describe('applyAndroidDevicePoolToWorker', () => {
    it('exports one worker assignment for Appium and adb', () => {
      const env: Record<string, string | undefined> = {
        ANDROID_DEVICE_POOL: 'emulator-5554,emulator-5556',
      };

      const assignment = applyAndroidDevicePoolToWorker(1, env);

      expect(assignment?.serial).toBe('emulator-5556');
      expect(env).toMatchObject({
        ANDROID_DEVICE_UDID: 'emulator-5556',
        ANDROID_SERIAL: 'emulator-5556',
        E2E_WORKER_INDEX: '1',
        ANDROID_UIAUTOMATOR2_SYSTEM_PORT: '8201',
        ANDROID_CHROMEDRIVER_PORT: '9101',
        ANDROID_MJPEG_SERVER_PORT: '7811',
      });
    });

    it('does not change adb or Appium env when the pool is unset', () => {
      const env: Record<string, string | undefined> = {
        ANDROID_DEVICE_UDID: 'existing-device',
      };

      const assignment = applyAndroidDevicePoolToWorker(0, env);

      expect(assignment).toBeUndefined();
      expect(env).toEqual({ ANDROID_DEVICE_UDID: 'existing-device' });
    });

    it('exports ANDROID_DEVICE_POOL from pool size for workers', () => {
      const env: Record<string, string | undefined> = {
        ANDROID_DEVICE_POOL_SIZE: '2',
      };

      applyAndroidDevicePoolToWorker(0, env);

      expect(env.ANDROID_DEVICE_POOL).toBe('emulator-5554,emulator-5556');
    });
  });
});
