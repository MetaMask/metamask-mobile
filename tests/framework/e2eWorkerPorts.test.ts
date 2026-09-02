import {
  adbDeviceArgs,
  chromeCdpForwardPort,
  hostListenPortForDevicePort,
  metamaskWebViewCdpForwardPort,
  resolveE2eWorkerIndex,
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

    it('rejects a negative E2E_WORKER_INDEX', () => {
      const resolveNegative = () =>
        resolveE2eWorkerIndex({ E2E_WORKER_INDEX: '-1' });

      expect(resolveNegative).toThrow(
        'Invalid E2E_WORKER_INDEX "-1". Expected a non-negative integer.',
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
    it('returns no serial flags when ANDROID_SERIAL is unset', () => {
      const args = adbDeviceArgs({});

      expect(args).toEqual([]);
    });

    it('pins adb to ANDROID_SERIAL', () => {
      const args = adbDeviceArgs({ ANDROID_SERIAL: 'emulator-5556' });

      expect(args).toEqual(['-s', 'emulator-5556']);
    });
  });
});
