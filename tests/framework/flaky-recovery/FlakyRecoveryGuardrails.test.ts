import {
  assessStepEligibility,
  isEquivalentAlternativeLocator,
  isSafeAlternativeFix,
  isSafeDismissFix,
  validateDiagnosis,
} from './FlakyRecoveryGuardrails';
import type { FlakyDiagnosis, FlakyFix } from './FlakyRecoveryTypes';

const step = {
  kind: 'tap' as const,
  intent: 'tap the send button',
  targetDescriptors: ['wallet-send-button'],
  supportsAlternativeLocator: true,
};

const recoverable = (
  cause: NonNullable<FlakyDiagnosis['cause']>,
  fix: FlakyFix,
): FlakyDiagnosis => ({
  classification: 'recoverable',
  cause,
  reason: 'reason',
  solution: 'solution',
  fix,
});

describe('assessStepEligibility', () => {
  it.each(['tap', 'wait', 'scroll-to', 'type'] as const)(
    'accepts a %s step that is an interaction issue',
    (kind) => {
      expect(
        assessStepEligibility({
          kind,
          intent: 'open the account list',
          errorMessage:
            'element ("~account-list") still not displayed after 15000ms',
        }),
      ).toEqual({ eligible: true });
    },
  );

  it('rejects an unknown step kind', () => {
    expect(
      assessStepEligibility({
        kind: 'assert-text' as never,
        intent: 'x',
        errorMessage: 'y',
      }).eligible,
    ).toBe(false);
  });

  it.each([
    'balance is 1.5 ETH',
    'amount equals 100',
    'wait for the total to equal $12.34',
    'token price shows 3,200 USD',
    'expected text to be visible',
    'text matches "Hello"',
    'fee displays 0.001 ETH',
  ])('refuses the value assertion intent %p', (intent) => {
    const result = assessStepEligibility({
      kind: 'wait',
      intent,
      errorMessage: 'not displayed',
    });

    expect(result.eligible).toBe(false);
  });

  it.each([
    'expect(locator).toHaveText("1 ETH")',
    'Expected: "1 ETH" Received: "0 ETH"',
    'text does not match',
  ])('refuses the comparison failure %p', (errorMessage) => {
    const result = assessStepEligibility({
      kind: 'wait',
      intent: 'wait for something',
      errorMessage,
    });

    expect(result.eligible).toBe(false);
  });

  it.each([
    'tap close position',
    'close order',
    'Close_Trade button',
    'tap close long',
  ])('refuses the destructive trading step %p', (intent) => {
    const result = assessStepEligibility({
      kind: 'tap',
      intent,
      errorMessage: 'not found',
    });

    expect(result).toEqual({
      eligible: false,
      reason: expect.stringContaining('closes a position'),
    });
  });

  it('does not refuse waiting for a balance row to appear', () => {
    expect(
      assessStepEligibility({
        kind: 'wait',
        intent: 'wait for the account balance section',
        errorMessage: 'element ("~balance-section") still not displayed',
      }),
    ).toEqual({ eligible: true });
  });
});

describe('isEquivalentAlternativeLocator', () => {
  it('accepts a renamed testID of the same control', () => {
    expect(
      isEquivalentAlternativeLocator(step, ['send-button-v2', 'Send']),
    ).toBe(true);
  });

  it('rejects a control that shares nothing with the step', () => {
    expect(
      isEquivalentAlternativeLocator(step, ['settings-logout', 'Log out']),
    ).toBe(false);
  });

  it('rejects an empty description', () => {
    expect(isEquivalentAlternativeLocator(step, [])).toBe(false);
    expect(isEquivalentAlternativeLocator(step, ['  ', undefined, null])).toBe(
      false,
    );
  });

  it('rejects a destructive trading control even when a word is shared', () => {
    expect(
      isEquivalentAlternativeLocator(
        { intent: 'tap the position row', targetDescriptors: [] },
        ['close-position-button', 'Close position'],
      ),
    ).toBe(false);
  });

  it('rejects a consent word the original step did not have', () => {
    expect(
      isEquivalentAlternativeLocator(
        { intent: 'tap the account row', targetDescriptors: [] },
        ['account-delete-button', 'Delete account'],
      ),
    ).toBe(false);
  });

  it('accepts a consent word the original step already had', () => {
    expect(
      isEquivalentAlternativeLocator(
        { intent: 'tap confirm', targetDescriptors: ['confirm-button'] },
        ['footer-confirm-button', 'Confirm'],
      ),
    ).toBe(true);
  });
});

describe('validateDiagnosis', () => {
  it('rejects a real failure', () => {
    expect(
      validateDiagnosis(
        { classification: 'real-failure', reason: 'bug' },
        step,
      ),
    ).toEqual({ valid: false, reason: 'model classified the failure as real' });
  });

  it('rejects a recoverable answer without a fix', () => {
    expect(
      validateDiagnosis(
        { classification: 'recoverable', reason: 'r', cause: 'slow-to-appear' },
        step,
      ).valid,
    ).toBe(false);
  });

  it.each([
    ['unexpected-overlay', { type: 'wait', waitMs: 2000 }],
    ['slow-to-appear', { type: 'hide-keyboard' }],
    [
      'needs-scroll',
      { type: 'dismiss-overlay', locator: { strategy: 'text', value: 'Skip' } },
    ],
  ] as const)('rejects cause %s paired with a mismatched fix', (cause, fix) => {
    const result = validateDiagnosis(recoverable(cause, fix), step);

    expect(result).toEqual({
      valid: false,
      reason: expect.stringContaining('does not match cause'),
    });
  });

  it.each([
    [
      'unexpected-overlay',
      { type: 'dismiss-overlay', locator: { strategy: 'text', value: 'Skip' } },
    ],
    ['slow-to-appear', { type: 'wait', waitMs: 2000 }],
    ['needs-scroll', { type: 'scroll', direction: 'down', times: 1 }],
    ['keyboard-covering', { type: 'hide-keyboard' }],
    [
      'stale-locator',
      {
        type: 'alternative-locator',
        locator: { strategy: 'testID', value: 'send-button-v2' },
        equivalence: 'same control',
      },
    ],
  ] as const)('accepts cause %s with its matching fix', (cause, fix) => {
    expect(validateDiagnosis(recoverable(cause, fix), step)).toEqual({
      valid: true,
      fix,
    });
  });

  it('rejects scrolling as the fix for a scroll step', () => {
    const result = validateDiagnosis(
      recoverable('needs-scroll', {
        type: 'scroll',
        direction: 'down',
        times: 1,
      }),
      { kind: 'scroll-to', supportsAlternativeLocator: false },
    );

    expect(result.valid).toBe(false);
  });

  it('rejects an alternative locator when the step cannot be retried with one', () => {
    const result = validateDiagnosis(
      recoverable('stale-locator', {
        type: 'alternative-locator',
        locator: { strategy: 'testID', value: 'x' },
        equivalence: 'same',
      }),
      { kind: 'tap', supportsAlternativeLocator: false },
    );

    expect(result).toEqual({
      valid: false,
      reason: 'this step cannot be retried with another locator',
    });
  });
});

describe('isSafeDismissFix', () => {
  const dismiss = (
    value: string,
    label?: string,
  ): Extract<FlakyFix, { type: 'dismiss-overlay' }> => ({
    type: 'dismiss-overlay',
    locator: { strategy: 'text', value },
    label,
  });

  it('allows a non-consenting control', () => {
    expect(isSafeDismissFix(dismiss('Not now', 'Not now'), ['Not now'])).toBe(
      true,
    );
  });

  it.each(['I agree', 'Confirm', 'Close position', 'Enable notifications'])(
    'refuses the consenting or destructive control %p',
    (value) => {
      expect(isSafeDismissFix(dismiss(value), [value])).toBe(false);
    },
  );

  it('refuses when the on-device text is consenting even if the label looks safe', () => {
    expect(isSafeDismissFix(dismiss('close', 'Close'), ['Allow'])).toBe(false);
  });
});

describe('isSafeAlternativeFix', () => {
  it('checks the on-device text of the alternative', () => {
    const fix: Extract<FlakyFix, { type: 'alternative-locator' }> = {
      type: 'alternative-locator',
      locator: { strategy: 'testID', value: 'send-button-v2' },
      equivalence: 'same',
    };

    expect(isSafeAlternativeFix(fix, step, ['Send'])).toBe(true);
    expect(isSafeAlternativeFix(fix, step, ['Delete wallet'])).toBe(false);
  });
});
