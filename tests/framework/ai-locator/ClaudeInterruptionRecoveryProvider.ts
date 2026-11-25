import type { Browser } from 'webdriverio';
import { ClaudeProvider } from '../ai-visual/providers/claude';
import {
  isLocatorRecoveryEnabled,
  pageSourceContainsSecrets,
} from './ClaudeLocatorRecoveryProvider';
import type { RecoveredLocator } from './SelfHealingLocator';

export interface InterruptionRecoveryContext {
  driver: Browser;
  /** Page source already captured by the guard (avoids a second round trip). */
  pageSource: string;
  /** What the test was trying to do when it failed. */
  intent: string;
  primaryError: string;
}

export interface InterruptionDecision {
  /** True when an unrelated overlay is covering the flow. */
  blocking: boolean;
  /** Short kebab-case name for the overlay, used to promote it to the registry. */
  screenName: string;
  reason: string;
  /** Visible label of the dismiss control, as read by the model. */
  dismissLabel?: string;
  dismissLocator?: RecoveredLocator;
}

export interface InterruptionRecoveryProvider {
  identifyInterruption(
    context: InterruptionRecoveryContext,
  ): Promise<InterruptionDecision | null>;
}

/**
 * Words that mean the control consents, accepts, pays or moves the flow
 * forward. A dismiss candidate matching any of these is never tapped.
 */
export const UNSAFE_ACTION_PATTERN =
  /\b(accept|agree|i agree|confirm|sign|buy|purchase|pay|subscribe|approve|allow|enable|turn on|opt[\s-]?in|yes|continue|get started|try now|start|deposit|send|swap|trade|connect|submit|claim|upgrade|install|update|ok|okay|next|done|save|import|create|reveal|unlock|delete|remove|reset|close[\s_-]+(?:position|order|trade|market|long|short)s?)\b/i;

/**
 * At least one of the candidate's strings must look like a dismissal.
 * `close` is a whole word, so it matches a close button but not "enclosed".
 */
const DISMISS_ACTION_PATTERN =
  /(no[\s,-]*thanks|not[\s-]now|\bclose\b|\bdismiss\b|\bskip\b|\bcancel\b|\blater\b|got[\s-]it|^x$|^×$)/i;

/**
 * Guardrail for AI-suggested dismiss controls.
 *
 * Every non-empty string describing the control (locator value, model label,
 * on-device text / content-desc) must be free of consent / purchase words,
 * and at least one must read like a dismissal. Exported for unit tests and
 * reused by the guard on the element's real text before tapping.
 */
export function isSafeDismissControl(
  descriptors: (string | null | undefined)[],
): boolean {
  const values = descriptors
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  if (values.length === 0) {
    return false;
  }
  if (values.some((value) => UNSAFE_ACTION_PATTERN.test(value))) {
    return false;
  }
  return values.some((value) => DISMISS_ACTION_PATTERN.test(value));
}

const MAX_PAGE_SOURCE_CHARS = 100_000;

/**
 * Asks Claude whether an unrelated overlay (marketing sheet, onboarding
 * prompt, notification opt-in, …) blocks the flow, and which control
 * dismisses it without consenting.
 *
 * Shares the locator-recovery opt-in and secret-screen refusal: the model is
 * never called on SRP / private-key screens.
 */
export class ClaudeInterruptionRecoveryProvider
  implements InterruptionRecoveryProvider
{
  private readonly provider: ClaudeProvider;

  constructor() {
    this.provider = new ClaudeProvider({ maxTokens: 512 });
  }

  async identifyInterruption(
    context: InterruptionRecoveryContext,
  ): Promise<InterruptionDecision | null> {
    if (pageSourceContainsSecrets(context.pageSource)) {
      return null;
    }

    const screenshotBase64 = await context.driver.takeScreenshot();
    const result = await this.provider.analyzeImage(
      createInterruptionPrompt(context),
      Buffer.from(screenshotBase64, 'base64'),
    );
    if (!result.success) {
      return null;
    }
    return parseInterruptionDecision(result.rawResponse);
  }
}

/**
 * Creates the AI interruption fallback, or undefined when it must not run.
 * Uses the same gate as locator recovery (`AI_LOCATOR_RECOVERY_ENABLED=true`
 * and `ANTHROPIC_API_KEY`), so regular runs never call the model.
 */
export function createClaudeInterruptionRecoveryProvider(
  env: Record<string, string | undefined> = process.env,
): ClaudeInterruptionRecoveryProvider | undefined {
  if (!isLocatorRecoveryEnabled(env)) {
    return undefined;
  }
  try {
    return new ClaudeInterruptionRecoveryProvider();
  } catch {
    return undefined;
  }
}

function createInterruptionPrompt(
  context: InterruptionRecoveryContext,
): string {
  return `A mobile UI test of the MetaMask wallet app failed. Decide whether an
unexpected overlay (bottom sheet, modal, full-screen prompt) unrelated to the
test step is covering the app and blocking it.

Test step intent: ${context.intent}
Failure: ${context.primaryError}

Accessibility tree:
${context.pageSource.slice(0, MAX_PAGE_SOURCE_CHARS)}

Return only valid JSON with this exact shape:
{"blocking":true|false,"screenName":"kebab-case-name","reason":"...","dismissLabel":"visible label","dismissLocator":{"strategy":"testID|label|text|nativeXPath","value":"..."}}

Rules:
- blocking is true only for overlays the test did not ask for: marketing or
  data-collection consent, push-notification opt-in, "what's new", feature
  promotions, onboarding tutorials, rating prompts, backup reminders.
- blocking is false when the step's target belongs to the visible sheet, or the
  screen is a transaction, signature, permission, connection, swap, send or
  any other confirmation. When unsure, return blocking false.
- dismissLocator must be the control that declines or closes the overlay
  without consenting: "No thanks", "Not now", "Maybe later", "Skip", "Cancel",
  or a close (X) button. Never accept, agree, confirm, enable, sign, buy,
  continue or similar actions.
- Prefer testID, then label, then visible text. Never return coordinates.
- Omit dismissLabel and dismissLocator when blocking is false.`;
}

function parseInterruptionDecision(
  rawResponse: string,
): InterruptionDecision | null {
  const json = rawResponse
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') {
    return null;
  }

  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate.blocking !== 'boolean') {
    return null;
  }

  return {
    blocking: candidate.blocking,
    screenName:
      typeof candidate.screenName === 'string'
        ? candidate.screenName
        : 'unknown-overlay',
    reason: typeof candidate.reason === 'string' ? candidate.reason : '',
    dismissLabel:
      typeof candidate.dismissLabel === 'string'
        ? candidate.dismissLabel
        : undefined,
    dismissLocator: isRecoveredLocator(candidate.dismissLocator)
      ? candidate.dismissLocator
      : undefined,
  };
}

function isRecoveredLocator(value: unknown): value is RecoveredLocator {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.value === 'string' &&
    candidate.value.length > 0 &&
    (candidate.strategy === 'testID' ||
      candidate.strategy === 'label' ||
      candidate.strategy === 'text' ||
      candidate.strategy === 'nativeXPath')
  );
}
