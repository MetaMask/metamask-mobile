import {
  FLAKY_AI_RECOVERED_ANNOTATION,
  FLAKY_RECORD_ATTACHMENT_PATTERN,
  annotationDescription,
  parseRecoveryRecord,
  publishFlakyRecovery,
  renderRecoveryMarkdown,
  renderRunSummaryMarkdown,
  type FlakyReportingTestInfo,
} from './FlakyRecoveryReporting';
import type { FlakyRecoveryRecord } from './FlakyRecoveryTypes';

const record = (
  overrides: Partial<FlakyRecoveryRecord> = {},
): FlakyRecoveryRecord => ({
  schemaVersion: 1,
  test: { title: 'sends ETH', file: 'wallet/send.spec.ts', retry: 0 },
  recoveryIndex: 1,
  step: {
    kind: 'tap',
    intent: 'tap the send button',
    targetDescriptors: ['wallet-send-button'],
  },
  originalError: 'element ("~wallet-send-button") still not displayed',
  source: 'ai',
  cause: 'unexpected-overlay',
  reason: 'A promo sheet covered the wallet',
  solution: 'Dismissed the promo with "Not now"',
  fix: {
    type: 'dismiss-overlay',
    locator: { strategy: 'text', value: 'Not now' },
  },
  durationMs: 4200,
  recoveredAt: '2026-11-25T11:00:00.000Z',
  screenshots: {},
  ...overrides,
});

const createTestInfo = (): {
  testInfo: FlakyReportingTestInfo;
  attachments: { name: string; body: string | Buffer; contentType: string }[];
} => {
  const attachments: {
    name: string;
    body: string | Buffer;
    contentType: string;
  }[] = [];
  const testInfo: FlakyReportingTestInfo = {
    annotations: [],
    attach: jest.fn(async (name, options) => {
      attachments.push({ name, ...options });
    }),
  };
  return { testInfo, attachments };
};

describe('publishFlakyRecovery', () => {
  it('marks the test with a flaky-ai-recovered annotation', async () => {
    const { testInfo } = createTestInfo();

    await publishFlakyRecovery(testInfo, record(), {});

    expect(testInfo.annotations).toEqual([
      {
        type: 'flaky-ai-recovered',
        description: expect.stringContaining('Dismissed the promo'),
      },
    ]);
    expect(FLAKY_AI_RECOVERED_ANNOTATION).toBe('flaky-ai-recovered');
  });

  it('adds one annotation per recovery', async () => {
    const { testInfo } = createTestInfo();

    await publishFlakyRecovery(testInfo, record({ recoveryIndex: 1 }), {});
    await publishFlakyRecovery(testInfo, record({ recoveryIndex: 2 }), {});

    expect(testInfo.annotations.map((a) => a.description)).toEqual([
      expect.stringContaining('#1 '),
      expect.stringContaining('#2 '),
    ]);
  });

  it('attaches the JSON record, a markdown note and both screenshots', async () => {
    const { testInfo, attachments } = createTestInfo();

    const published = await publishFlakyRecovery(testInfo, record(), {
      beforeBase64: 'YmVmb3Jl',
      afterBase64: 'YWZ0ZXI=',
    });

    expect(attachments.map((a) => [a.name, a.contentType])).toEqual([
      ['ai-flaky-recovery-1-before.png', 'image/png'],
      ['ai-flaky-recovery-1-after.png', 'image/png'],
      ['ai-flaky-recovery-1.json', 'application/json'],
      ['ai-flaky-recovery-1.md', 'text/markdown'],
    ]);
    expect(attachments[0].body).toEqual(Buffer.from('before'));
    expect(attachments[1].body).toEqual(Buffer.from('after'));
    expect(published.screenshots).toEqual({
      before: 'ai-flaky-recovery-1-before.png',
      after: 'ai-flaky-recovery-1-after.png',
    });
    const json = JSON.parse(String(attachments[2].body));
    expect(json).toMatchObject({
      step: { kind: 'tap', intent: 'tap the send button' },
      cause: 'unexpected-overlay',
      solution: 'Dismissed the promo with "Not now"',
      screenshots: published.screenshots,
    });
  });

  it('skips screenshots that were not captured', async () => {
    const { testInfo, attachments } = createTestInfo();

    const published = await publishFlakyRecovery(testInfo, record(), {});

    expect(attachments.map((a) => a.name)).toEqual([
      'ai-flaky-recovery-1.json',
      'ai-flaky-recovery-1.md',
    ]);
    expect(published.screenshots).toEqual({});
  });

  it('names the json attachment so the reporter pattern matches it', () => {
    expect(
      FLAKY_RECORD_ATTACHMENT_PATTERN.test('ai-flaky-recovery-2.json'),
    ).toBe(true);
    expect(FLAKY_RECORD_ATTACHMENT_PATTERN.test('ai-flaky-recovery-2.md')).toBe(
      false,
    );
    expect(
      FLAKY_RECORD_ATTACHMENT_PATTERN.test('ai-flaky-recovery-2-before.png'),
    ).toBe(false);
  });
});

describe('renderRecoveryMarkdown', () => {
  it('states the step, diagnosed cause, solution and original error', () => {
    const markdown = renderRecoveryMarkdown(record());

    expect(markdown).toContain('Flaky failure recovered by AI (#1)');
    expect(markdown).toContain('tap — tap the send button');
    expect(markdown).toContain('**Diagnosed cause:** unexpected-overlay');
    expect(markdown).toContain('**Solution applied:** Dismissed the promo');
    expect(markdown).toContain('dismissed overlay via text=Not now');
    expect(markdown).toContain('still not displayed');
  });

  it('flags registry recoveries as not using the model', () => {
    const markdown = renderRecoveryMarkdown(
      record({
        source: 'registry',
        fix: {
          type: 'registry-dismiss',
          screen: 'whats-new-modal',
          locator: { strategy: 'testID', value: 'whats-new-close' },
        },
      }),
    );

    expect(markdown).toContain('known screen, no AI call');
    expect(markdown).toContain('known screen "whats-new-modal"');
  });

  it.each([
    [{ type: 'wait', waitMs: 3000 } as const, 'waited 3000ms'],
    [
      { type: 'scroll', direction: 'down', times: 2 } as const,
      'scrolled down x2',
    ],
    [{ type: 'hide-keyboard' } as const, 'hid the keyboard'],
    [
      {
        type: 'alternative-locator',
        locator: { strategy: 'testID', value: 'send-v2' },
        equivalence: 'same',
      } as const,
      'alternative locator testID=send-v2',
    ],
  ])('describes the fix %j', (fix, expected) => {
    expect(renderRecoveryMarkdown(record({ fix }))).toContain(expected);
  });

  it('truncates a very long original error', () => {
    const markdown = renderRecoveryMarkdown(
      record({ originalError: 'x'.repeat(5000) }),
    );

    expect(markdown.length).toBeLessThan(3000);
  });
});

describe('annotationDescription', () => {
  it('is a single readable line', () => {
    const description = annotationDescription(record());

    expect(description).toBe(
      '#1 tap "tap the send button" recovered (unexpected-overlay, ai): Dismissed the promo with "Not now"',
    );
  });
});

describe('parseRecoveryRecord', () => {
  it('round-trips a published record', () => {
    expect(parseRecoveryRecord(JSON.stringify(record()))).toEqual(record());
  });

  it.each(['not json', '{}', '[]', '{"schemaVersion":2}', 'null'])(
    'returns undefined for %p',
    (body) => {
      expect(parseRecoveryRecord(body)).toBeUndefined();
    },
  );
});

describe('renderRunSummaryMarkdown', () => {
  it('is empty when nothing was recovered', () => {
    expect(renderRunSummaryMarkdown([], 'appium-accounts')).toBe('');
  });

  it('lists every recovery with its solution and counts by source', () => {
    const markdown = renderRunSummaryMarkdown(
      [
        { record: record(), status: 'passed' },
        {
          record: record({
            test: { title: 'swaps | tokens', file: 'swap.spec.ts', retry: 1 },
            source: 'registry',
            solution: 'Dismissed known screen "whats-new-modal"',
          }),
          status: 'failed',
        },
      ],
      'appium-swap-android-smoke-1',
    );

    expect(markdown).toContain('appium-swap-android-smoke-1');
    expect(markdown).toContain('2 recovery(ies): 1 by AI, 1 by a known screen');
    expect(markdown).toContain('| sends ETH | tap: tap the send button |');
    expect(markdown).toContain('swaps \\| tokens');
    expect(markdown).toContain('Dismissed known screen "whats-new-modal"');
    expect(markdown).toContain('| passed |');
    expect(markdown).toContain('| failed |');
  });
});
