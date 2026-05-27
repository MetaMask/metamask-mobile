import {
  calculateDeltas,
  createMobileMemoryReport,
  parseAndroidMeminfo,
  parseByteSize,
  parseIosPsOutput,
  parseMobileMemoryProfilerArgs,
  type MobileMemorySample,
} from './mobile-memory-profiler';

const baselineSample: MobileMemorySample = {
  label: 'baseline',
  timestamp: '2026-05-27T00:00:00.000Z',
  platform: 'android',
  appId: 'io.metamask',
  deviceId: 'emulator-5554',
  processId: 111,
  memory: {
    rssBytes: 200,
    pssBytes: 100,
    nativeHeapBytes: 50,
    javaHeapBytes: 25,
    graphicsBytes: null,
    codeBytes: null,
    stackBytes: null,
    privateOtherBytes: null,
    systemBytes: null,
    swapPssBytes: null,
    virtualSizeBytes: null,
  },
};

const finalSample: MobileMemorySample = {
  label: 'iteration-1',
  timestamp: '2026-05-27T00:01:00.000Z',
  platform: 'android',
  appId: 'io.metamask',
  deviceId: 'emulator-5554',
  processId: 112,
  memory: {
    rssBytes: 260,
    pssBytes: 140,
    nativeHeapBytes: 65,
    javaHeapBytes: 30,
    graphicsBytes: null,
    codeBytes: null,
    stackBytes: null,
    privateOtherBytes: null,
    systemBytes: null,
    swapPssBytes: null,
    virtualSizeBytes: null,
  },
};

describe('mobile-memory-profiler', () => {
  describe('parseMobileMemoryProfilerArgs', () => {
    it('uses useful Android defaults', () => {
      const options = parseMobileMemoryProfilerArgs([]);

      expect(options.platform).toBe('android');
      expect(options.appId).toBe('io.metamask');
      expect(options.androidActivity).toBe('io.metamask.MainActivity');
      expect(options.iterations).toBe(5);
      expect(options.flow).toBe('relaunch');
      expect(options.sampleMode).toBe('each');
      expect(options.outputPath).toMatch(
        /test-artifacts\/mobile-memory\/mobile-android-memory-profile-\d+\.json/u,
      );
    });

    it('parses explicit profiling options', () => {
      const options = parseMobileMemoryProfilerArgs([
        '--platform',
        'ios',
        '--app-id',
        'io.metamask.MetaMask.flask',
        '--device',
        'booted',
        '--ios-process-name',
        'MetaMaskFlask',
        '--iterations',
        '25',
        '--flow',
        'idle',
        '--sample',
        'final',
        '--no-launch',
        '--enable-in-app-profiler',
        '--wait-after-flow',
        '250',
        '--interval',
        '50',
        '--hermes-profile',
        '/tmp/profile.cpuprofile',
        '--sourcemap-path',
        '/tmp/sourcemaps',
        '--max-rss-growth',
        '25MiB',
        '--output',
        '/tmp/report.json',
      ]);

      expect(options).toStrictEqual(
        expect.objectContaining({
          platform: 'ios',
          appId: 'io.metamask.MetaMask.flask',
          deviceId: 'booted',
          iosProcessName: 'MetaMaskFlask',
          iterations: 25,
          flow: 'idle',
          sampleMode: 'final',
          launch: false,
          enableInAppProfiler: true,
          waitAfterFlowMs: 250,
          intervalMs: 50,
          hermesProfilePath: '/tmp/profile.cpuprofile',
          sourcemapPath: '/tmp/sourcemaps',
          maxRssGrowthBytes: 25 * 1024 * 1024,
          outputPath: '/tmp/report.json',
        }),
      );
    });

    it('parses wallet send confirmation flow options', () => {
      const options = parseMobileMemoryProfilerArgs([
        '--flow',
        'wallet-send-eth-submit',
        '--recipient-address',
        '0x000000000000000000000000000000000000dEaD',
        '--send-amount',
        '0.001',
        '--appium-url',
        'http://127.0.0.1:4723/wd/hub',
        '--reuse-appium',
        '--appium-startup-timeout',
        '15000',
        '--appium-element-timeout',
        '5000',
        '--allow-transaction-submit',
      ]);

      expect(options).toStrictEqual(
        expect.objectContaining({
          flow: 'wallet-send-eth-submit',
          recipientAddress: '0x000000000000000000000000000000000000dEaD',
          sendAmount: '0.001',
          appiumUrl: 'http://127.0.0.1:4723/wd/hub',
          reuseAppium: true,
          appiumStartupTimeoutMs: 15000,
          appiumElementTimeoutMs: 5000,
          allowTransactionSubmit: true,
        }),
      );
    });

    it('rejects invalid choices and unknown options', () => {
      expect(() =>
        parseMobileMemoryProfilerArgs(['--platform', 'web']),
      ).toThrow('--platform must be one of: android, ios');

      expect(() => parseMobileMemoryProfilerArgs(['--wat'])).toThrow(
        'Unknown option: --wat',
      );
    });
  });

  describe('parseByteSize', () => {
    it('parses byte units', () => {
      expect(parseByteSize('1024')).toBe(1024);
      expect(parseByteSize('1kb')).toBe(1000);
      expect(parseByteSize('1KiB')).toBe(1024);
      expect(parseByteSize('1.5MiB')).toBe(1572864);
    });
  });

  describe('parseAndroidMeminfo', () => {
    it('extracts Android dumpsys meminfo app summary values', () => {
      const metrics = parseAndroidMeminfo(`
        App Summary
                       Pss(KB)                        Rss(KB)
                        ------                         ------
        Java Heap:       14,728                         20,648
        Native Heap:     41,580                         51,784
        Code:            44,836                         72,936
        Stack:              188                            188
        Graphics:        49,216                         49,216
        Private Other:    8,392
        System:          47,203
        TOTAL PSS:      206,143            TOTAL RSS:      398,460       TOTAL SWAP PSS: 12
      `);

      expect(metrics.pssBytes).toBe(206143 * 1024);
      expect(metrics.rssBytes).toBe(398460 * 1024);
      expect(metrics.javaHeapBytes).toBe(14728 * 1024);
      expect(metrics.nativeHeapBytes).toBe(41580 * 1024);
      expect(metrics.graphicsBytes).toBe(49216 * 1024);
      expect(metrics.swapPssBytes).toBe(12 * 1024);
    });
  });

  describe('parseIosPsOutput', () => {
    it('extracts RSS and VSZ for an iOS simulator process', () => {
      const parsed = parseIosPsOutput(
        `
          100 10 20 launchd
          321 123456 654321 /Users/me/MetaMask.app/MetaMask
        `,
        'MetaMask',
      );

      expect(parsed).toStrictEqual({
        pid: 321,
        memory: expect.objectContaining({
          rssBytes: 123456 * 1024,
          virtualSizeBytes: 654321 * 1024,
        }),
      });
    });
  });

  describe('calculateDeltas', () => {
    it('calculates memory deltas', () => {
      expect(calculateDeltas(baselineSample, finalSample)).toStrictEqual({
        rssBytes: 60,
        pssBytes: 40,
        nativeHeapBytes: 15,
        javaHeapBytes: 5,
        virtualSizeBytes: null,
      });
    });
  });

  describe('createMobileMemoryReport', () => {
    it('summarizes samples and threshold results', () => {
      const options = parseMobileMemoryProfilerArgs([
        '--output',
        '/tmp/report.json',
        '--max-rss-growth',
        '70b',
        '--max-pss-growth',
        '30b',
        '--max-native-heap-growth',
        '15b',
        '--max-java-heap-growth',
        '3b',
      ]);

      const report = createMobileMemoryReport({
        createdAt: '2026-05-27T00:00:00.000Z',
        options,
        samples: [baselineSample, finalSample],
        hermesProfileCliResult: null,
      });

      expect(report.summary.deltas.rssBytes).toBe(60);
      expect(report.summary.deltas.pssBytes).toBe(40);
      expect(report.summary.thresholds).toStrictEqual([
        {
          name: 'rssBytes',
          limit: 70,
          actual: 60,
          unit: 'bytes',
          passed: true,
        },
        {
          name: 'pssBytes',
          limit: 30,
          actual: 40,
          unit: 'bytes',
          passed: false,
        },
        {
          name: 'nativeHeapBytes',
          limit: 15,
          actual: 15,
          unit: 'bytes',
          passed: true,
        },
        {
          name: 'javaHeapBytes',
          limit: 3,
          actual: 5,
          unit: 'bytes',
          passed: false,
        },
      ]);
      expect(report.options).not.toHaveProperty('help');
    });
  });
});
