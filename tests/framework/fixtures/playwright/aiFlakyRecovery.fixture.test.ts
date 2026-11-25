/**
 * @jest-environment node
 */
import type { TestInfo } from '@playwright/test';
import { ClaudeProvider } from '../../ai-visual/providers/claude';
import { interruptingScreenGuard } from '../../interrupting-screens/InterruptingScreenGuard';
import type { FlakyRecoveryRuntime } from '../../flaky-recovery/FlakyRecoverySession';
import {
  aiFlakyRecoveryFixture,
  isPerformanceTest,
} from './aiFlakyRecovery.fixture';

jest.mock('../../ai-visual/providers/claude', () => ({
  ClaudeProvider: jest.fn().mockImplementation(() => ({
    analyzeImage: jest.fn(),
  })),
}));

type FixtureFn = (
  deps: Record<string, never>,
  use: () => Promise<void>,
  testInfo: TestInfo,
) => Promise<void>;

const [runFixture] = aiFlakyRecoveryFixture.aiFlakyRecovery as unknown as [
  FixtureFn,
];

const createTestInfo = (titlePath: string[], tags: string[] = []) => {
  const attachments: { name: string }[] = [];
  const testInfo = {
    title: titlePath[titlePath.length - 1],
    titlePath,
    tags,
    file: '/repo/tests/smoke-appium/accounts/a.spec.ts',
    retry: 0,
    annotations: [] as { type: string; description?: string }[],
    attach: jest.fn(async (name: string) => {
      attachments.push({ name });
    }),
  };
  return {
    testInfo: testInfo as unknown as TestInfo,
    attachments,
    raw: testInfo,
  };
};

const smokePath = ['a.spec.ts', '@SmokeAccounts Accounts', 'sends ETH'];

describe('aiFlakyRecovery fixture', () => {
  const ENV_KEYS = [
    'AI_FLAKY_RECOVERY_ENABLED',
    'AI_FLAKY_RECOVERY_MAX_PER_TEST',
    'ANTHROPIC_API_KEY',
  ];
  const originalEnv = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  );
  let configure: jest.SpyInstance;

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    configure = jest
      .spyOn(interruptingScreenGuard, 'configure')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
    jest.restoreAllMocks();
  });

  describe('isPerformanceTest', () => {
    it.each([
      [['perf.spec.ts', '@Performance @PerformanceLogin Login', 'loads']],
      [['perf.spec.ts', '@PerformanceSwaps Swaps', 'swaps']],
    ])('detects performance title paths %j', (titlePath) => {
      expect(isPerformanceTest(titlePath)).toBe(true);
    });

    it('detects a performance tag', () => {
      expect(isPerformanceTest(smokePath, ['@Performance'])).toBe(true);
    });

    it('does not flag smoke tests', () => {
      expect(isPerformanceTest(smokePath)).toBe(false);
    });
  });

  it('does nothing when the feature is disabled', async () => {
    const { testInfo } = createTestInfo(smokePath);
    const use = jest.fn().mockResolvedValue(undefined);

    await runFixture({}, use, testInfo);

    expect(use).toHaveBeenCalledTimes(1);
    expect(configure).not.toHaveBeenCalled();
  });

  it('does nothing with the flag but without an API key', async () => {
    process.env.AI_FLAKY_RECOVERY_ENABLED = 'true';
    const { testInfo } = createTestInfo(smokePath);
    const use = jest.fn().mockResolvedValue(undefined);

    await runFixture({}, use, testInfo);

    expect(configure).not.toHaveBeenCalled();
  });

  it('never configures the guard for performance tests', async () => {
    process.env.AI_FLAKY_RECOVERY_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    const { testInfo } = createTestInfo([
      'perf.spec.ts',
      '@Performance @PerformanceLogin Login',
      'loads',
    ]);
    const use = jest.fn().mockResolvedValue(undefined);

    await runFixture({}, use, testInfo);

    expect(use).toHaveBeenCalledTimes(1);
    expect(configure).not.toHaveBeenCalled();
  });

  it('arms the guard for the test and disarms it afterwards', async () => {
    process.env.AI_FLAKY_RECOVERY_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    const { testInfo } = createTestInfo(smokePath);
    const use = jest.fn().mockImplementation(async () => {
      expect(configure).toHaveBeenCalledTimes(1);
      expect(configure.mock.calls[0][0]).toEqual({
        flakyRecovery: expect.anything(),
      });
    });

    await runFixture({}, use, testInfo);

    expect(configure).toHaveBeenCalledTimes(2);
    expect(configure).toHaveBeenLastCalledWith(undefined);
  });

  it('disarms the guard even when the test fails', async () => {
    process.env.AI_FLAKY_RECOVERY_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    const { testInfo } = createTestInfo(smokePath);

    await expect(
      runFixture(
        {},
        async () => {
          throw new Error('test failed');
        },
        testInfo,
      ),
    ).rejects.toThrow('test failed');

    expect(configure).toHaveBeenLastCalledWith(undefined);
  });

  it('marks the test as flaky-ai-recovered and attaches the evidence on recovery', async () => {
    process.env.AI_FLAKY_RECOVERY_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    process.env.AI_FLAKY_RECOVERY_MAX_PER_TEST = '1';
    const { testInfo, attachments, raw } = createTestInfo(smokePath);

    await runFixture(
      {},
      async () => {
        const runtime = (
          configure.mock.calls[0][0] as { flakyRecovery: FlakyRecoveryRuntime }
        ).flakyRecovery;
        expect(runtime.limits.maxRecoveriesPerTest).toBe(1);
        await runtime.recordRecovery(
          {
            kind: 'tap',
            intent: 'tap the send button',
            targetDescriptors: [],
            errorMessage: 'not displayed',
            supportsAlternativeLocator: false,
          },
          {
            source: 'ai',
            cause: 'unexpected-overlay',
            reason: 'promo sheet',
            solution: 'Dismissed the promo',
            fix: { type: 'hide-keyboard' },
            durationMs: 10,
          },
          { beforeBase64: 'YQ==', afterBase64: 'Yg==' },
        );
      },
      testInfo,
    );

    expect(raw.annotations).toEqual([
      {
        type: 'flaky-ai-recovered',
        description: expect.stringContaining('Dismissed the promo'),
      },
    ]);
    expect(attachments.map((a) => a.name)).toEqual([
      'ai-flaky-recovery-1-before.png',
      'ai-flaky-recovery-1-after.png',
      'ai-flaky-recovery-1.json',
      'ai-flaky-recovery-1.md',
    ]);
  });

  it('does nothing when the Claude client cannot start', async () => {
    process.env.AI_FLAKY_RECOVERY_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    jest.mocked(ClaudeProvider).mockImplementationOnce(() => {
      throw new Error('no client');
    });
    const { testInfo } = createTestInfo(smokePath);
    const use = jest.fn().mockResolvedValue(undefined);

    await runFixture({}, use, testInfo);

    expect(use).toHaveBeenCalledTimes(1);
    expect(configure).not.toHaveBeenCalled();
  });
});
