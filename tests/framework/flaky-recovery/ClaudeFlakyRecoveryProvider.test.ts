import { ClaudeProvider } from '../ai-visual/providers/claude';
import {
  ClaudeFlakyRecoveryProvider,
  createClaudeFlakyRecoveryProvider,
  createFlakyRecoveryPrompt,
  parseFlakyDiagnosis,
} from './ClaudeFlakyRecoveryProvider';
import type { FlakyDiagnosisContext } from './FlakyRecoveryTypes';

jest.mock('../ai-visual/providers/claude', () => ({
  ClaudeProvider: jest.fn().mockImplementation(() => ({
    analyzeImage: jest.fn(),
  })),
}));

const mockAnalyzeImage = (rawResponse: string, success = true) => {
  const analyzeImage = jest.fn().mockResolvedValue({ success, rawResponse });
  jest
    .mocked(ClaudeProvider)
    .mockImplementation(() => ({ analyzeImage }) as unknown as ClaudeProvider);
  return analyzeImage;
};

const context = (pageSource = '<hierarchy/>'): FlakyDiagnosisContext => ({
  step: {
    kind: 'tap',
    intent: 'tap the send button',
    targetDescriptors: ['wallet-send-button'],
    errorMessage: 'element not displayed',
    supportsAlternativeLocator: true,
  },
  pageSource,
  screenshotBase64: 'aW1hZ2U=',
});

describe('parseFlakyDiagnosis', () => {
  it('parses a dismiss-overlay diagnosis', () => {
    const raw = JSON.stringify({
      classification: 'recoverable',
      cause: 'unexpected-overlay',
      reason: 'A promo sheet covers the wallet',
      solution: 'Dismiss the promo with Not now',
      fix: {
        type: 'dismiss-overlay',
        label: 'Not now',
        locator: { strategy: 'text', value: 'Not now' },
      },
    });

    expect(parseFlakyDiagnosis(raw)).toEqual({
      classification: 'recoverable',
      cause: 'unexpected-overlay',
      reason: 'A promo sheet covers the wallet',
      solution: 'Dismiss the promo with Not now',
      fix: {
        type: 'dismiss-overlay',
        label: 'Not now',
        locator: { strategy: 'text', value: 'Not now' },
      },
    });
  });

  it('parses an answer wrapped in a json code fence', () => {
    const raw =
      '```json\n{"classification":"real-failure","reason":"wrong screen"}\n```';

    expect(parseFlakyDiagnosis(raw)).toEqual({
      classification: 'real-failure',
      reason: 'wrong screen',
    });
  });

  it('parses wait, scroll, keyboard and alternative-locator fixes', () => {
    const base = { classification: 'recoverable', reason: 'r', solution: 's' };

    expect(
      parseFlakyDiagnosis(
        JSON.stringify({
          ...base,
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 3000 },
        }),
      )?.fix,
    ).toEqual({ type: 'wait', waitMs: 3000 });
    expect(
      parseFlakyDiagnosis(
        JSON.stringify({
          ...base,
          cause: 'needs-scroll',
          fix: { type: 'scroll', direction: 'down', times: 2 },
        }),
      )?.fix,
    ).toEqual({ type: 'scroll', direction: 'down', times: 2 });
    expect(
      parseFlakyDiagnosis(
        JSON.stringify({
          ...base,
          cause: 'keyboard-covering',
          fix: { type: 'hide-keyboard' },
        }),
      )?.fix,
    ).toEqual({ type: 'hide-keyboard' });
    expect(
      parseFlakyDiagnosis(
        JSON.stringify({
          ...base,
          cause: 'stale-locator',
          fix: {
            type: 'alternative-locator',
            label: 'Send',
            equivalence: 'same button',
            locator: { strategy: 'testID', value: 'send-v2' },
          },
        }),
      )?.fix,
    ).toEqual({
      type: 'alternative-locator',
      label: 'Send',
      equivalence: 'same button',
      locator: { strategy: 'testID', value: 'send-v2' },
    });
  });

  it('clamps the wait and scroll fixes', () => {
    const base = { classification: 'recoverable', reason: 'r', solution: 's' };

    expect(
      parseFlakyDiagnosis(
        JSON.stringify({
          ...base,
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 600000 },
        }),
      )?.fix,
    ).toEqual({ type: 'wait', waitMs: 10_000 });
    expect(
      parseFlakyDiagnosis(
        JSON.stringify({
          ...base,
          cause: 'slow-to-appear',
          fix: { type: 'wait', waitMs: 1 },
        }),
      )?.fix,
    ).toEqual({ type: 'wait', waitMs: 1_000 });
    expect(
      parseFlakyDiagnosis(
        JSON.stringify({
          ...base,
          cause: 'needs-scroll',
          fix: { type: 'scroll', direction: 'up', times: 50 },
        }),
      )?.fix,
    ).toEqual({ type: 'scroll', direction: 'up', times: 3 });
  });

  it.each([
    ['not json', 'not json'],
    ['an array', '[]'],
    ['a missing classification', '{"reason":"x"}'],
    ['an unknown classification', '{"classification":"maybe"}'],
  ])('returns null for %s', (_name, raw) => {
    expect(parseFlakyDiagnosis(raw)).toBeNull();
  });

  it.each([
    ['an unknown cause', { cause: 'gremlins', fix: { type: 'hide-keyboard' } }],
    ['a missing fix', { cause: 'slow-to-appear' }],
    [
      'an unknown fix type',
      { cause: 'slow-to-appear', fix: { type: 'tap-coordinates', x: 1, y: 2 } },
    ],
    [
      'a locator with an unknown strategy',
      {
        cause: 'unexpected-overlay',
        fix: {
          type: 'dismiss-overlay',
          locator: { strategy: 'coordinates', value: '1,2' },
        },
      },
    ],
    [
      'an alternative locator without equivalence',
      {
        cause: 'stale-locator',
        fix: {
          type: 'alternative-locator',
          locator: { strategy: 'testID', value: 'x' },
        },
      },
    ],
    [
      'a scroll with an invalid direction',
      { cause: 'needs-scroll', fix: { type: 'scroll', direction: 'sideways' } },
    ],
  ])(
    'downgrades a recoverable answer with %s to a real failure',
    (_n, extra) => {
      const raw = JSON.stringify({
        classification: 'recoverable',
        reason: 'r',
        solution: 's',
        ...extra,
      });

      expect(parseFlakyDiagnosis(raw)).toEqual({
        classification: 'real-failure',
        reason: expect.stringContaining('Unusable recoverable answer'),
      });
    },
  );

  it('downgrades a recoverable answer without a solution', () => {
    const raw = JSON.stringify({
      classification: 'recoverable',
      reason: 'r',
      cause: 'keyboard-covering',
      fix: { type: 'hide-keyboard' },
    });

    expect(parseFlakyDiagnosis(raw)?.classification).toBe('real-failure');
  });
});

describe('createFlakyRecoveryPrompt', () => {
  it('includes the step, target, error and page source', () => {
    const prompt = createFlakyRecoveryPrompt(context('<tree id="abc"/>'));

    expect(prompt).toContain('Step kind: tap');
    expect(prompt).toContain('tap the send button');
    expect(prompt).toContain('wallet-send-button');
    expect(prompt).toContain('element not displayed');
    expect(prompt).toContain('<tree id="abc"/>');
  });

  it('tells the model never to recover value assertions or trading actions', () => {
    const prompt = createFlakyRecoveryPrompt(context());

    expect(prompt).toMatch(/amount, balance, price, fee or expected\s+text/);
    expect(prompt).toContain('close a position / order / trade');
  });
});

describe('ClaudeFlakyRecoveryProvider', () => {
  it('diagnoses with the screenshot and parses the answer', async () => {
    const analyzeImage = mockAnalyzeImage(
      '{"classification":"real-failure","reason":"app bug"}',
    );
    const provider = new ClaudeFlakyRecoveryProvider();

    const diagnosis = await provider.diagnose(context());

    expect(diagnosis).toEqual({
      classification: 'real-failure',
      reason: 'app bug',
    });
    expect(analyzeImage).toHaveBeenCalledWith(
      expect.stringContaining('Step kind: tap'),
      Buffer.from('aW1hZ2U=', 'base64'),
    );
  });

  it('refuses before calling the model on a secret-bearing screen', async () => {
    const analyzeImage = mockAnalyzeImage('{}');
    const provider = new ClaudeFlakyRecoveryProvider();

    const diagnosis = await provider.diagnose(
      context('<View resource-id="import-from-seed-screen"/>'),
    );

    expect(diagnosis).toBeNull();
    expect(analyzeImage).not.toHaveBeenCalled();
  });

  it('returns null when the model call fails', async () => {
    mockAnalyzeImage('', false);
    const provider = new ClaudeFlakyRecoveryProvider();

    expect(await provider.diagnose(context())).toBeNull();
  });
});

describe('createClaudeFlakyRecoveryProvider', () => {
  it('returns undefined when the feature is off', () => {
    expect(createClaudeFlakyRecoveryProvider({})).toBeUndefined();
    expect(
      createClaudeFlakyRecoveryProvider({ ANTHROPIC_API_KEY: 'sk-test' }),
    ).toBeUndefined();
  });

  it('returns a provider when enabled', () => {
    mockAnalyzeImage('{}');

    expect(
      createClaudeFlakyRecoveryProvider({
        AI_FLAKY_RECOVERY_ENABLED: 'true',
        ANTHROPIC_API_KEY: 'sk-test',
      }),
    ).toBeInstanceOf(ClaudeFlakyRecoveryProvider);
  });

  it('returns undefined when the Claude client cannot be created', () => {
    jest.mocked(ClaudeProvider).mockImplementation(() => {
      throw new Error('no key');
    });

    expect(
      createClaudeFlakyRecoveryProvider({
        AI_FLAKY_RECOVERY_ENABLED: 'true',
        ANTHROPIC_API_KEY: 'sk-test',
      }),
    ).toBeUndefined();
  });
});
