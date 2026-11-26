import { ClaudeProvider } from '../ai-visual/providers/claude';
import { createAppiumLogger } from '../appiumLogger.ts';
import { pageSourceContainsSecrets } from '../ai-locator/ClaudeLocatorRecoveryProvider.ts';
import type { RecoveredLocator } from '../ai-locator/SelfHealingLocator.ts';
import {
  MAX_SCROLL_FIX_TIMES,
  MAX_WAIT_FIX_MS,
  MIN_WAIT_FIX_MS,
} from './FlakyRecoveryGuardrails.ts';
import { isFlakyRecoveryEnabled } from './FlakyRecoveryConfig.ts';
import type {
  FlakyCause,
  FlakyDiagnosis,
  FlakyDiagnosisContext,
  FlakyFix,
  FlakyRecoveryProvider,
  ScrollDirection,
} from './FlakyRecoveryTypes.ts';

const logger = createAppiumLogger('ClaudeFlakyRecoveryProvider');

const MAX_PAGE_SOURCE_CHARS = 100_000;
const MAX_TEXT_FIELD_CHARS = 400;
const LOGGED_RESPONSE_CHARS = 300;

const CAUSES: readonly FlakyCause[] = [
  'unexpected-overlay',
  'slow-to-appear',
  'needs-scroll',
  'keyboard-covering',
  'stale-locator',
];
const DIRECTIONS: readonly ScrollDirection[] = ['up', 'down', 'left', 'right'];
const LOCATOR_STRATEGIES = ['testID', 'label', 'text', 'nativeXPath'] as const;

/**
 * Asks Claude whether a failed interaction / wait step failed for a flaky
 * reason and, if so, for one corrective action. Refuses (returns null before
 * any model call) when the screen can expose secrets.
 */
export class ClaudeFlakyRecoveryProvider implements FlakyRecoveryProvider {
  private readonly provider: ClaudeProvider;

  constructor() {
    this.provider = new ClaudeProvider({ maxTokens: 1024 });
  }

  async diagnose(
    context: FlakyDiagnosisContext,
  ): Promise<FlakyDiagnosis | null> {
    if (pageSourceContainsSecrets(context.pageSource)) {
      return null;
    }
    const result = await this.provider.analyzeImage(
      createFlakyRecoveryPrompt(context),
      Buffer.from(context.screenshotBase64, 'base64'),
    );
    if (!result.success) {
      logger.warn(`Claude call failed: ${result.summary}`);
      return null;
    }
    const diagnosis = parseFlakyDiagnosis(result.rawResponse);
    if (!diagnosis) {
      logger.warn(
        `Unparseable flaky diagnosis: ${result.rawResponse.slice(0, LOGGED_RESPONSE_CHARS)}`,
      );
    }
    return diagnosis;
  }
}

/** Creates the provider, or undefined when the feature is off or cannot start. */
export function createClaudeFlakyRecoveryProvider(
  env: Record<string, string | undefined> = process.env,
): ClaudeFlakyRecoveryProvider | undefined {
  if (!isFlakyRecoveryEnabled(env)) {
    return undefined;
  }
  try {
    return new ClaudeFlakyRecoveryProvider();
  } catch {
    return undefined;
  }
}

export function createFlakyRecoveryPrompt(
  context: FlakyDiagnosisContext,
): string {
  const { step } = context;
  return `A mobile UI test of the MetaMask wallet app failed on one step. Decide
whether the failure is FLAKY (a timing or UI-state problem that one corrective
action can fix) or a REAL failure (the app or the test is genuinely wrong).

Step kind: ${step.kind}
Step intent: ${truncate(step.intent)}
Target control (testID / text / label, may be empty): ${truncate(step.targetDescriptors.join(' | '))}
Failure: ${truncate(step.errorMessage)}

Accessibility tree:
${context.pageSource.slice(0, MAX_PAGE_SOURCE_CHARS)}

Answer with ONLY one JSON object (no prose, no markdown, no code fence) of this exact shape:
{"classification":"recoverable|real-failure","cause":"unexpected-overlay|slow-to-appear|needs-scroll|keyboard-covering|stale-locator","reason":"why the step failed","solution":"one sentence: what the fix does","fix":{...}}

The fix object depends on the cause and must be exactly one of:
- unexpected-overlay: {"type":"dismiss-overlay","label":"visible label","locator":{"strategy":"testID|label|text|nativeXPath","value":"..."}}
- slow-to-appear: {"type":"wait","waitMs":${MIN_WAIT_FIX_MS}-${MAX_WAIT_FIX_MS}}
- needs-scroll: {"type":"scroll","direction":"up|down|left|right","times":1-${MAX_SCROLL_FIX_TIMES}}  (direction is the way the CONTENT moves: "down" reveals content further down the list)
- keyboard-covering: {"type":"hide-keyboard"}
- stale-locator: {"type":"alternative-locator","label":"visible label","equivalence":"why it is the same control","locator":{"strategy":"testID|label|text|nativeXPath","value":"..."}}

Rules:
- recoverable only for: an unrelated overlay (marketing, consent, promo,
  onboarding card, rating or backup prompt) covering the app; an element that
  is simply slow to appear (loading, animation); a target that needs a scroll;
  a keyboard covering the target; or a locator that no longer matches but the
  screen shows the same control under another testID / label.
- real-failure for everything else: wrong screen, missing feature, crash,
  error banner, wrong or unexpected value, failed transaction, permission or
  confirmation prompts that belong to the flow, or anything you are unsure of.
  When unsure, answer real-failure.
- Never recover a step that checks an amount, balance, price, fee or expected
  text. Never propose a fix that taps accept, agree, confirm, sign, buy, send,
  swap, trade, delete, or close a position / order / trade.
- dismiss-overlay must decline or close the overlay without consenting ("No
  thanks", "Not now", "Skip", "Maybe later", "Cancel", close X). The target
  control of the step must not be inside the overlay you dismiss.
- alternative-locator must be the same control the step intended, not a
  different control with a similar look. Prefer testID, then label, then text.
  Never return coordinates.
- Omit "cause", "solution" and "fix" when classification is real-failure.`;
}

function truncate(value: string): string {
  return value.length > MAX_TEXT_FIELD_CHARS
    ? `${value.slice(0, MAX_TEXT_FIELD_CHARS)}…`
    : value;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function parseLocator(value: unknown): RecoveredLocator | undefined {
  const candidate = asRecord(value);
  if (
    !candidate ||
    typeof candidate.value !== 'string' ||
    candidate.value.length === 0
  ) {
    return undefined;
  }
  const strategy = LOCATOR_STRATEGIES.find(
    (known) => known === candidate.strategy,
  );
  return strategy ? { strategy, value: candidate.value } : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

function parseFix(value: unknown): FlakyFix | undefined {
  const candidate = asRecord(value);
  if (!candidate) {
    return undefined;
  }
  const label =
    typeof candidate.label === 'string' ? candidate.label : undefined;

  switch (candidate.type) {
    case 'dismiss-overlay': {
      const locator = parseLocator(candidate.locator);
      return locator ? { type: 'dismiss-overlay', locator, label } : undefined;
    }
    case 'wait':
      return typeof candidate.waitMs === 'number' &&
        Number.isFinite(candidate.waitMs)
        ? {
            type: 'wait',
            waitMs: clamp(candidate.waitMs, MIN_WAIT_FIX_MS, MAX_WAIT_FIX_MS),
          }
        : undefined;
    case 'scroll': {
      const direction = DIRECTIONS.find(
        (known) => known === candidate.direction,
      );
      if (!direction) {
        return undefined;
      }
      const times =
        typeof candidate.times === 'number' && Number.isFinite(candidate.times)
          ? candidate.times
          : 1;
      return {
        type: 'scroll',
        direction,
        times: clamp(times, 1, MAX_SCROLL_FIX_TIMES),
      };
    }
    case 'hide-keyboard':
      return { type: 'hide-keyboard' };
    case 'alternative-locator': {
      const locator = parseLocator(candidate.locator);
      return locator && typeof candidate.equivalence === 'string'
        ? {
            type: 'alternative-locator',
            locator,
            label,
            equivalence: candidate.equivalence,
          }
        : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * First balanced `{...}` in the text, skipping braces inside JSON strings.
 * Models often wrap the object in prose or a code fence despite the prompt.
 */
export function extractJsonObject(text: string): string | undefined {
  const start = text.indexOf('{');
  if (start === -1) {
    return undefined;
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  return undefined;
}

/**
 * Parses the model answer. A "recoverable" answer without a well-formed cause
 * and fix is downgraded to a real failure, so a malformed reply can never
 * trigger a retry. Returns null for unparseable text.
 */
export function parseFlakyDiagnosis(
  rawResponse: string,
): FlakyDiagnosis | null {
  const json = extractJsonObject(rawResponse);
  if (json === undefined) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const candidate = asRecord(parsed);
  if (!candidate) {
    return null;
  }
  if (
    candidate.classification !== 'recoverable' &&
    candidate.classification !== 'real-failure'
  ) {
    return null;
  }

  const reason = typeof candidate.reason === 'string' ? candidate.reason : '';
  if (candidate.classification === 'real-failure') {
    return { classification: 'real-failure', reason };
  }

  const cause = CAUSES.find((known) => known === candidate.cause);
  const fix = parseFix(candidate.fix);
  const solution =
    typeof candidate.solution === 'string' ? candidate.solution : undefined;
  if (!cause || !fix || !solution) {
    return {
      classification: 'real-failure',
      reason: `Unusable recoverable answer: ${reason}`,
    };
  }
  return { classification: 'recoverable', cause, reason, solution, fix };
}
