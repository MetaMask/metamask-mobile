import {
  adbDeviceArgs,
  chromeCdpForwardPort,
  hostListenPortForDevicePort,
  metamaskWebViewCdpForwardPort,
  resolveE2eWorkerIndex,
  resolveWorkerAndroidSerial,
  webviewCdpForwardPort,
} from './e2eWorkerPorts.ts';

describe('e2eWorkerPorts', () => {
  describe('resolveE2eWorkerIndex', () => {
    it('defaults to worker 0 when E2E_WORKER_INDEX is unset', () => {
      const workerIndex = resolveE2eWorkerIndex({});

      expect(workerIndex).toBe(0);
    });

    it('returns the worker index from E2E_WORKER_INDEX', () => {
      const workerIndex = resolveE2eWorkerIndex({ E2E_WORKER_INDEX: '1' });

      expect(workerIndex).toBe(1);
    });

    it('falls back to Playwright TEST_PARALLEL_INDEX before the device fixture runs', () => {
      const workerIndex = resolveE2eWorkerIndex({ TEST_PARALLEL_INDEX: '1' });

      expect(workerIndex).toBe(1);
    });

    it('rejects a negative worker index', () => {
      const resolveNegative = () =>
        resolveE2eWorkerIndex({ E2E_WORKER_INDEX: '-1' });

      expect(resolveNegative).toThrow(
        'Invalid worker index "-1". Expected a non-negative integer.',
      );
    });
  });

  describe('hostListenPortForDevicePort', () => {
    it('keeps the device port on worker 0', () => {
      const hostPort = hostListenPortForDevicePort(8093, {
        E2E_WORKER_INDEX: '0',
      });

      expect(hostPort).toBe(8093);
    });

    it('offsets the host listen port for worker 1', () => {
      const hostPort = hostListenPortForDevicePort(8093, {
        E2E_WORKER_INDEX: '1',
      });

      expect(hostPort).toBe(8193);
    });

    it('offsets the host listen port from TEST_PARALLEL_INDEX in beforeAll', () => {
      const hostPort = hostListenPortForDevicePort(8094, {
        TEST_PARALLEL_INDEX: '1',
      });

      expect(hostPort).toBe(8194);
    });
  });

  describe('CDP forward ports', () => {
    it('keeps historical Chrome and WebView forwards on worker 0', () => {
      const env = { E2E_WORKER_INDEX: '0' };

      expect(chromeCdpForwardPort(env)).toBe(9222);
      expect(webviewCdpForwardPort(env)).toBe(9223);
      expect(metamaskWebViewCdpForwardPort(env)).toBe(10902);
    });

    it('does not overlap worker 1 Chrome and WebView forwards with worker 0', () => {
      const worker0 = { E2E_WORKER_INDEX: '0' };
      const worker1 = { E2E_WORKER_INDEX: '1' };

      expect(chromeCdpForwardPort(worker1)).toBe(9232);
      expect(webviewCdpForwardPort(worker1)).toBe(9233);
      expect(metamaskWebViewCdpForwardPort(worker1)).toBe(10912);
      expect(chromeCdpForwardPort(worker1)).not.toBe(
        webviewCdpForwardPort(worker0),
      );
    });
  });

  describe('adbDeviceArgs', () => {
    it('returns no serial flags on the single emulator path', () => {
      const args = adbDeviceArgs({});

      expect(args).toEqual([]);
    });

    it('pins adb to ANDROID_SERIAL', () => {
      const args = adbDeviceArgs({ ANDROID_SERIAL: 'emulator-5556' });

      expect(args).toEqual(['-s', 'emulator-5556']);
    });

    it('pins adb to the pool device when ANDROID_SERIAL is not exported yet', () => {
      const args = adbDeviceArgs({
        ANDROID_DEVICE_POOL_SIZE: '2',
        TEST_PARALLEL_INDEX: '1',
      });

      expect(args).toEqual(['-s', 'emulator-5556']);
    });
  });

  describe('resolveWorkerAndroidSerial', () => {
    it('returns no serial on the single emulator path', () => {
      const serial = resolveWorkerAndroidSerial({});

      expect(serial).toBeUndefined();
    });

    it('gives each pooled worker a distinct serial', () => {
      const env = { ANDROID_DEVICE_POOL: 'emulator-5554,emulator-5556' };

      const worker0 = resolveWorkerAndroidSerial({
        ...env,
        TEST_PARALLEL_INDEX: '0',
      });
      const worker1 = resolveWorkerAndroidSerial({
        ...env,
        TEST_PARALLEL_INDEX: '1',
      });

      expect(worker0).toBe('emulator-5554');
      expect(worker1).toBe('emulator-5556');
    });
  });
});
