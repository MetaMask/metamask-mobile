import {
  applyIosDevicePoolToWorker,
  assertIosDevicePoolMatchesWorkers,
  deviceForWorker,
  iosPoolSimulatorName,
  parseIosDevicePool,
  resolveIosDevicePoolSize,
} from './iosDevicePool.ts';

describe('iosDevicePool', () => {
  describe('resolveIosDevicePoolSize', () => {
    it('defaults to one when IOS_DEVICE_POOL_SIZE is unset', () => {
      expect(resolveIosDevicePoolSize({})).toBe(1);
    });

    it('returns two for the iOS pool pilot', () => {
      expect(
        resolveIosDevicePoolSize({ IOS_DEVICE_POOL_SIZE: '2' }),
      ).toBe(2);
    });

    it('rejects non-positive pool sizes', () => {
      expect(() =>
        resolveIosDevicePoolSize({ IOS_DEVICE_POOL_SIZE: '0' }),
      ).toThrow(
        'Invalid IOS_DEVICE_POOL_SIZE "0". Expected a positive integer.',
      );
    });
  });

  describe('assertIosDevicePoolMatchesWorkers', () => {
    it('accepts matching pool and worker counts', () => {
      expect(() =>
        assertIosDevicePoolMatchesWorkers({
          IOS_DEVICE_POOL_SIZE: '2',
          E2E_WORKERS: '2',
        }),
      ).not.toThrow();
    });

    it('rejects mismatched pool and worker counts', () => {
      expect(() =>
        assertIosDevicePoolMatchesWorkers({
          IOS_DEVICE_POOL_SIZE: '2',
          E2E_WORKERS: '1',
        }),
      ).toThrow(
        'IOS_DEVICE_POOL_SIZE (2) must match E2E_WORKERS (1) in pool mode.',
      );
    });
  });

  describe('iosPoolSimulatorName', () => {
    it('names clones by worker index', () => {
      expect(iosPoolSimulatorName('iPhone 16 Pro', 0)).toBe(
        'iPhone 16 Pro Appium Pool 0',
      );
      expect(iosPoolSimulatorName('iPhone 16 Pro', 1)).toBe(
        'iPhone 16 Pro Appium Pool 1',
      );
    });
  });

  describe('parseIosDevicePool', () => {
    it('returns no devices when the pool is unset', () => {
      expect(parseIosDevicePool(undefined)).toEqual([]);
    });

    it('trims comma-separated UDIDs', () => {
      expect(
        parseIosDevicePool(
          ' 11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222 ',
        ),
      ).toEqual([
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
      ]);
    });

    it('rejects duplicate UDIDs', () => {
      expect(() =>
        parseIosDevicePool(
          '11111111-1111-1111-1111-111111111111,11111111-1111-1111-1111-111111111111',
        ),
      ).toThrow('duplicate');
    });
  });

  describe('deviceForWorker', () => {
    it('returns no assignment on the single simulator path', () => {
      expect(deviceForWorker(0, {})).toBeUndefined();
    });

    it('throws when pool size is greater than one and IOS_DEVICE_POOL is empty', () => {
      expect(() =>
        deviceForWorker(0, { IOS_DEVICE_POOL_SIZE: '2' }),
      ).toThrow(
        'IOS_DEVICE_POOL_SIZE (2) requires IOS_DEVICE_POOL with 2 UDIDs. iOS simulator UDIDs cannot be derived from pool size.',
      );
    });

    it('does not assign when IOS_DEVICE_POOL is populated but size defaults to one', () => {
      expect(
        deviceForWorker(0, {
          IOS_DEVICE_POOL:
            '11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222',
        }),
      ).toBeUndefined();
    });

    it('assigns distinct UDIDs and WDA ports to two workers', () => {
      const env = {
        IOS_DEVICE_POOL_SIZE: '2',
        IOS_DEVICE_POOL:
          '11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222',
      };
      expect(deviceForWorker(0, env)).toEqual({
        udid: '11111111-1111-1111-1111-111111111111',
        wdaLocalPort: 8100,
        mjpegServerPort: 9100,
      });
      expect(deviceForWorker(1, env)).toEqual({
        udid: '22222222-2222-2222-2222-222222222222',
        wdaLocalPort: 8101,
        mjpegServerPort: 9101,
      });
    });

    it('rejects a worker index outside the configured pool', () => {
      expect(() =>
        deviceForWorker(2, {
          IOS_DEVICE_POOL_SIZE: '2',
          IOS_DEVICE_POOL:
            '11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222',
        }),
      ).toThrow(
        'iOS worker 2 has no device in IOS_DEVICE_POOL (2 devices).',
      );
    });
  });

  describe('applyIosDevicePoolToWorker', () => {
    it('does not mutate env when IOS_DEVICE_POOL is populated but size defaults to one', () => {
      const env: Record<string, string | undefined> = {
        IOS_DEVICE_POOL:
          '11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222',
        IOS_SIMULATOR_UDID: 'existing-udid',
      };
      expect(applyIosDevicePoolToWorker(0, env)).toBeUndefined();
      expect(env).toEqual({
        IOS_DEVICE_POOL:
          '11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222',
        IOS_SIMULATOR_UDID: 'existing-udid',
      });
    });

    it('exports one worker assignment for Appium', () => {
      const env: Record<string, string | undefined> = {
        IOS_DEVICE_POOL_SIZE: '2',
        IOS_DEVICE_POOL:
          '11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222',
      };
      const assignment = applyIosDevicePoolToWorker(1, env);
      expect(assignment?.udid).toBe(
        '22222222-2222-2222-2222-222222222222',
      );
      expect(env).toMatchObject({
        IOS_SIMULATOR_UDID: '22222222-2222-2222-2222-222222222222',
        E2E_WORKER_INDEX: '1',
        IOS_WDA_LOCAL_PORT: '8101',
        IOS_MJPEG_SERVER_PORT: '9101',
      });
    });

    it('does not change iOS env when the pool is unset', () => {
      const env: Record<string, string | undefined> = {
        IOS_SIMULATOR_UDID: 'existing-udid',
      };
      expect(applyIosDevicePoolToWorker(0, env)).toBeUndefined();
      expect(env).toEqual({ IOS_SIMULATOR_UDID: 'existing-udid' });
    });
  });
});
