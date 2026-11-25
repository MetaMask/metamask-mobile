import {
  isSafeDismissControl,
  UNSAFE_ACTION_PATTERN,
} from '../ai-locator/ClaudeInterruptionRecoveryProvider.ts';
import {
  FLAKY_STEP_KINDS,
  type FlakyCause,
  type FlakyDiagnosis,
  type FlakyFix,
  type FlakyFixType,
  type FlakyStep,
} from './FlakyRecoveryTypes.ts';

export const MIN_WAIT_FIX_MS = 1_000;
export const MAX_WAIT_FIX_MS = 10_000;
export const MAX_SCROLL_FIX_TIMES = 3;

/** Which fix each diagnosed cause is allowed to propose. */
export const FIX_TYPE_BY_CAUSE: Readonly<Record<FlakyCause, FlakyFixType>> = {
  'unexpected-overlay': 'dismiss-overlay',
  'slow-to-appear': 'wait',
  'needs-scroll': 'scroll',
  'keyboard-covering': 'hide-keyboard',
  'stale-locator': 'alternative-locator',
};

/**
 * Intent text that asserts a value (amount, balance, expected text). These
 * are real checks, never timing issues, so they are never recovered.
 */
const VALUE_INTENT_PATTERN =
  /\b(equals?|equal to|has text|have text|text (?:is|equals?|matches)|expected (?:text|value|amount|balance|label)|(?:amount|balance|price|fee|total|value|quote|rate)\s+(?:is|equals?|should|shows?|displays?|matches?|=)|[+-]?\d[\d,]*(?:\.\d+)?\s?(?:eth|weth|usdc|usdt|dai|btc|wbtc|sol|bnb|matic|pol|usd|%)|\$\s?\d)/i;

/** Failure messages of comparison assertions (text / value mismatch). */
const VALUE_ERROR_PATTERN =
  /(toHaveText|toEqual|toBe\(|toContain|expected\b[^\n]*\b(received|actual|to equal|to have|to be)\b|text (?:does not|doesn't) match|value (?:does not|doesn't) match|actual (?:text|value))/i;

/** Closing a position / order / trade mutates state; a retried tap could repeat it. */
const DESTRUCTIVE_TRADING_PATTERN =
  /close[\s_-]+(?:position|order|trade|market|long|short)s?/i;

const STOPWORD_TOKENS = new Set([
  'the',
  'and',
  'for',
  'tap',
  'tapping',
  'click',
  'press',
  'wait',
  'waiting',
  'button',
  'element',
  'view',
  'screen',
  'visible',
  'displayed',
  'display',
  'shown',
  'with',
  'from',
  'into',
  'that',
  'this',
  'not',
  'still',
  'after',
  'ms',
  'icon',
  'text',
  'item',
  'row',
  'container',
  'current',
  'mobile',
  'control',
]);

export type StepEligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

/**
 * Pre-model gate: only interaction / timing steps qualify, and never value
 * assertions or state-mutating trading actions.
 */
export function assessStepEligibility(
  step: Pick<FlakyStep, 'kind' | 'intent' | 'errorMessage'>,
): StepEligibility {
  if (!FLAKY_STEP_KINDS.includes(step.kind)) {
    return {
      eligible: false,
      reason: `step kind "${step.kind}" is not recoverable`,
    };
  }
  if (VALUE_INTENT_PATTERN.test(step.intent)) {
    return {
      eligible: false,
      reason: 'step asserts a value (amount, balance or expected text)',
    };
  }
  if (VALUE_ERROR_PATTERN.test(step.errorMessage)) {
    return {
      eligible: false,
      reason: 'failure is a value / text comparison, not an interaction issue',
    };
  }
  if (DESTRUCTIVE_TRADING_PATTERN.test(step.intent)) {
    return {
      eligible: false,
      reason: 'step closes a position / order / trade and must not be repeated',
    };
  }
  return { eligible: true };
}

function unsafeWords(values: (string | undefined)[]): Set<string> {
  const words = new Set<string>();
  const pattern = new RegExp(UNSAFE_ACTION_PATTERN.source, 'gi');
  for (const value of values) {
    for (const match of value?.matchAll(pattern) ?? []) {
      words.add(match[0].toLowerCase());
    }
  }
  return words;
}

function tokenize(values: (string | undefined)[]): Set<string> {
  const tokens = new Set<string>();
  for (const value of values) {
    if (!value) {
      continue;
    }
    const spaced = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
    for (const token of spaced.split(/[^a-z0-9]+/)) {
      if (token.length >= 3 && !STOPWORD_TOKENS.has(token)) {
        tokens.add(token);
      }
    }
  }
  return tokens;
}

/**
 * A replacement locator must describe the same control: it shares a word with
 * the step intent or the original target, never reads like a destructive
 * trading action, and adds no consent / purchase word (accept, confirm, buy,
 * delete, …) the original step did not already have. Keeps the model from
 * redirecting a tap to another control.
 */
export function isEquivalentAlternativeLocator(
  step: Pick<FlakyStep, 'intent' | 'targetDescriptors'>,
  alternativeDescriptors: (string | null | undefined)[],
): boolean {
  const alternatives = alternativeDescriptors.filter((value): value is string =>
    Boolean(value?.trim()),
  );
  if (alternatives.length === 0) {
    return false;
  }
  if (alternatives.some((value) => DESTRUCTIVE_TRADING_PATTERN.test(value))) {
    return false;
  }
  const originalValues = [step.intent, ...step.targetDescriptors];
  const originalUnsafe = unsafeWords(originalValues);
  for (const word of unsafeWords(alternatives)) {
    if (!originalUnsafe.has(word)) {
      return false;
    }
  }
  const original = tokenize(originalValues);
  const candidate = tokenize(alternatives);
  for (const token of candidate) {
    if (original.has(token)) {
      return true;
    }
  }
  return false;
}

export type FixValidation =
  | { valid: true; fix: FlakyFix }
  | { valid: false; reason: string };

/**
 * Static validation of a model diagnosis: the fix must match the diagnosed
 * cause and be possible for this step. Device-level safety checks that need
 * the on-screen control (dismiss / alternative locator) run separately in
 * {@link isSafeDismissFix} and {@link isSafeAlternativeFix}.
 */
export function validateDiagnosis(
  diagnosis: FlakyDiagnosis,
  step: Pick<FlakyStep, 'kind' | 'supportsAlternativeLocator'>,
): FixValidation {
  if (diagnosis.classification !== 'recoverable') {
    return { valid: false, reason: 'model classified the failure as real' };
  }
  const { cause, fix } = diagnosis;
  if (!cause || !fix) {
    return {
      valid: false,
      reason: 'recoverable diagnosis has no cause or fix',
    };
  }
  if (FIX_TYPE_BY_CAUSE[cause] !== fix.type) {
    return {
      valid: false,
      reason: `fix "${fix.type}" does not match cause "${cause}"`,
    };
  }
  if (fix.type === 'scroll' && step.kind === 'scroll-to') {
    return {
      valid: false,
      reason: 'a scroll step cannot be fixed by scrolling',
    };
  }
  if (fix.type === 'alternative-locator' && !step.supportsAlternativeLocator) {
    return {
      valid: false,
      reason: 'this step cannot be retried with another locator',
    };
  }
  return { valid: true, fix };
}

/** Same refusal list as the interrupting-screen AI: only non-consenting controls. */
export function isSafeDismissFix(
  fix: Extract<FlakyFix, { type: 'dismiss-overlay' }>,
  onDeviceDescriptors: string[],
): boolean {
  return isSafeDismissControl([
    fix.locator.value,
    fix.label,
    ...onDeviceDescriptors,
  ]);
}

export function isSafeAlternativeFix(
  fix: Extract<FlakyFix, { type: 'alternative-locator' }>,
  step: Pick<FlakyStep, 'intent' | 'targetDescriptors'>,
  onDeviceDescriptors: string[],
): boolean {
  return isEquivalentAlternativeLocator(step, [
    fix.locator.value,
    fix.label,
    ...onDeviceDescriptors,
  ]);
}
