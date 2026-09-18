import type { DeviceBackend } from '@metamask/device-mcp';
import type {
  AndroidSnapshotHelperArtifact,
  captureAndroidSnapshotWithHelper,
  ensureAndroidSnapshotHelper,
  parseAndroidSnapshotHelperManifest,
  parseAndroidSnapshotHelperXml,
} from 'agent-device/android-snapshot-helper';

import { wrapAndroidSnapshotBackend } from '../android/snapshot-backend';

const captureHelper: jest.MockedFunction<
  typeof captureAndroidSnapshotWithHelper
> = jest.fn();
const ensureHelper: jest.MockedFunction<typeof ensureAndroidSnapshotHelper> =
  jest.fn();
const parseManifest: jest.MockedFunction<
  typeof parseAndroidSnapshotHelperManifest
> = jest.fn();
const parseHelperXml: jest.MockedFunction<
  typeof parseAndroidSnapshotHelperXml
> = jest.fn();
const helperApi = {
  captureAndroidSnapshotWithHelper: captureHelper,
  ensureAndroidSnapshotHelper: ensureHelper,
  parseAndroidSnapshotHelperManifest: parseManifest,
  parseAndroidSnapshotHelperXml: parseHelperXml,
};

const artifact: AndroidSnapshotHelperArtifact = {
  apkPath: '/agent-device/helper.apk',
  manifest: {
    name: 'android-snapshot-helper',
    version: '0.14.9',
    assetName: 'helper.apk',
    apkUrl: null,
    sha256: 'checksum',
    packageName: 'com.callstack.agentdevice.snapshothelper',
    versionCode: 14009,
    instrumentationRunner:
      'com.callstack.agentdevice.snapshothelper/.SnapshotInstrumentation',
    minSdk: 23,
    outputFormat: 'uiautomator-xml',
    statusProtocol: 'android-snapshot-helper-v1',
    installArgs: ['install', '-r', '-t'],
  },
};
const adb = jest.fn();
const xml = `<hierarchy>
  <node text="Balance &amp; assets" content-desc="Wallet &quot;home&quot;" resource-id="io.metamask:id/root">
    <node text="1 ETH" />
  </node>
</hierarchy>`;
const metadata = { outputFormat: 'uiautomator-xml' as const };

function createBackend(): DeviceBackend {
  return {
    kind: 'adb',
    platform: 'android',
    snapshot: jest.fn().mockRejectedValue(new Error('raw snapshot used')),
  } as unknown as DeviceBackend;
}

describe('wrapAndroidSnapshotBackend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ensureHelper.mockResolvedValue({
      packageName: artifact.manifest.packageName,
      versionCode: artifact.manifest.versionCode,
      installed: false,
      reason: 'current',
    });
    captureHelper.mockResolvedValue({ xml, metadata });
    parseHelperXml.mockReturnValue({
      nodes: [
        {
          index: 0,
          type: 'android.widget.FrameLayout',
          label: 'Balance',
          value: 'Balance',
          identifier: 'io.metamask:id/root',
          rect: { x: 1, y: 2, width: 100, height: 200 },
          enabled: true,
        },
        {
          index: 1,
          parentIndex: 0,
          type: 'android.widget.TextView',
          value: '1 ETH',
          rect: { x: 5, y: 6, width: 20, height: 10 },
          enabled: false,
        },
      ],
      analysis: { rawNodeCount: 2, maxDepth: 1 },
      metadata,
    });
  });

  it('captures helper XML and preserves nested UIElement semantics', async () => {
    const wrapped = wrapAndroidSnapshotBackend(
      createBackend(),
      'emulator-5554',
      { adb, artifact, helperApi, now: () => 123 },
    );

    await expect(wrapped.snapshot()).resolves.toEqual({
      platform: 'android',
      raw: xml,
      timestamp: 123,
      hierarchy: [
        {
          type: 'android.widget.FrameLayout',
          label: 'Wallet &quot;home&quot;',
          value: 'Balance &amp; assets',
          identifier: 'io.metamask:id/root',
          frame: { x: 1, y: 2, width: 100, height: 200 },
          enabled: true,
          children: [
            {
              type: 'android.widget.TextView',
              label: undefined,
              value: '1 ETH',
              identifier: undefined,
              frame: { x: 5, y: 6, width: 20, height: 10 },
              enabled: false,
              children: [],
            },
          ],
        },
      ],
    });
    expect(ensureHelper).toHaveBeenCalledWith({
      adb,
      artifact,
      deviceKey: 'emulator-5554',
      installPolicy: 'missing-or-outdated',
      timeoutMs: 15_000,
    });
    expect(captureHelper).toHaveBeenCalledWith({
      adb,
      packageName: artifact.manifest.packageName,
      instrumentationRunner: artifact.manifest.instrumentationRunner,
      timeoutMs: 8_000,
      commandTimeoutMs: 15_000,
    });
    expect(parseHelperXml).toHaveBeenCalledWith(
      xml,
      metadata,
      { raw: true },
      5_000,
    );
  });

  it('preserves an identifier beyond the parser default node limit', async () => {
    const markerIndex = 801;
    const marker = 'wallet-marker-after-node-800';
    const largeXml = `<hierarchy>${Array.from(
      { length: markerIndex },
      (_, index) => `<node resource-id="node-${index}" />`,
    ).join(
      '',
    )}<node resource-id="${marker}" bounds="[0,0][1,1]" /></hierarchy>`;
    captureHelper.mockResolvedValueOnce({ xml: largeXml, metadata });
    parseHelperXml.mockReturnValueOnce({
      nodes: [
        {
          index: markerIndex,
          type: 'android.view.View',
          identifier: marker,
          rect: { x: 0, y: 0, width: 1, height: 1 },
          enabled: true,
        },
      ],
      analysis: { rawNodeCount: markerIndex + 1, maxDepth: 0 },
      metadata,
    });
    const wrapped = wrapAndroidSnapshotBackend(
      createBackend(),
      'emulator-5554',
      { adb, artifact, helperApi },
    );

    const result = await wrapped.snapshot();

    expect(parseHelperXml).toHaveBeenCalledWith(
      largeXml,
      metadata,
      { raw: true },
      5_000,
    );
    expect(result.hierarchy).toEqual([
      expect.objectContaining({ identifier: marker }),
    ]);
  });

  it('uses capture metadata maxNodes when available', async () => {
    const captureMetadata = { ...metadata, maxNodes: 1_234 };
    captureHelper.mockResolvedValueOnce({ xml, metadata: captureMetadata });
    const wrapped = wrapAndroidSnapshotBackend(
      createBackend(),
      'emulator-5554',
      { adb, artifact, helperApi },
    );

    await wrapped.snapshot();

    expect(parseHelperXml).toHaveBeenCalledWith(
      xml,
      captureMetadata,
      { raw: true },
      1_234,
    );
  });

  it('serializes captures and recovers the queue after failure', async () => {
    const releases: (() => void)[] = [];
    let active = 0;
    let maxActive = 0;
    captureHelper.mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      return { xml, metadata };
    });
    const wrapped = wrapAndroidSnapshotBackend(
      createBackend(),
      'emulator-5554',
      { adb, artifact, helperApi },
    );

    const first = wrapped.snapshot();
    const second = wrapped.snapshot();
    await Promise.resolve();
    await Promise.resolve();
    expect(captureHelper).toHaveBeenCalledTimes(1);
    releases.shift()?.();
    await first;
    await Promise.resolve();
    await Promise.resolve();
    expect(captureHelper).toHaveBeenCalledTimes(2);
    releases.shift()?.();
    await second;
    expect(maxActive).toBe(1);

    const failure = new Error('helper instrumentation failed');
    captureHelper
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ xml, metadata });
    await expect(wrapped.snapshot()).rejects.toBe(failure);
    await expect(wrapped.snapshot()).resolves.toMatchObject({ raw: xml });
  });

  it('routes backend-internal this.snapshot calls through the helper', async () => {
    class TestBackend {
      readonly kind = 'adb' as const;
      readonly platform = 'android' as const;
      snapshot = jest.fn().mockRejectedValue(new Error('raw snapshot used'));
      async internalSnapshot() {
        return await this.snapshot();
      }
    }
    const backend = new TestBackend();
    wrapAndroidSnapshotBackend(
      backend as unknown as DeviceBackend,
      'emulator-5554',
      { adb, artifact, helperApi },
    );

    await expect(backend.internalSnapshot()).resolves.toMatchObject({
      raw: xml,
    });
    expect(captureHelper).toHaveBeenCalledTimes(1);
  });

  it('propagates helper installation and capture errors without raw fallback', async () => {
    const installFailure = new Error('helper install failed');
    ensureHelper.mockRejectedValueOnce(installFailure);
    const backend = createBackend();
    const rawSnapshot = backend.snapshot;
    const wrapped = wrapAndroidSnapshotBackend(backend, 'emulator-5554', {
      adb,
      artifact,
      helperApi,
    });

    await expect(wrapped.snapshot()).rejects.toBe(installFailure);
    expect(captureHelper).not.toHaveBeenCalled();
    expect(rawSnapshot).not.toHaveBeenCalled();

    const captureFailure = new Error('helper capture failed');
    captureHelper.mockRejectedValueOnce(captureFailure);
    await expect(wrapped.snapshot()).rejects.toBe(captureFailure);
    expect(rawSnapshot).not.toHaveBeenCalled();
  });
});
