import type { Browser } from 'webdriverio';
import { ClaudeProvider } from '../ai-visual/providers/claude';
import type {
  LocatorRecoveryContext,
  LocatorRecoveryProvider,
  RecoveredLocator,
} from './SelfHealingLocator';

const LOCATOR_RECOVERY_ENABLED = 'true';

/**
 * Uses the existing Claude visual provider to recover a native Appium locator.
 *
 * This provider is intentionally opt-in. It captures the accessibility tree
 * and screenshot only after the deterministic locator fails.
 */
export class ClaudeLocatorRecoveryProvider implements LocatorRecoveryProvider {
  private readonly provider: ClaudeProvider;

  constructor() {
    this.provider = new ClaudeProvider({ maxTokens: 512 });
  }

  async recover(
    context: LocatorRecoveryContext,
  ): Promise<RecoveredLocator | null> {
    const [pageSource, screenshot] = await Promise.all([
      context.driver.getPageSource(),
      context.driver.saveScreenshot(),
    ]);
    const prompt = createLocatorRecoveryPrompt(
      context.intent,
      context.primaryError,
      pageSource,
    );
    const result = await this.provider.analyzeImage(prompt, screenshot);

    if (!result.success) {
      return null;
    }

    return parseRecoveredLocator(result.rawResponse);
  }
}

/**
 * Creates the opt-in recovery provider used by performance tests.
 *
 * Keeping this factory undefined by default ensures regular performance runs
 * never make a network request or add model latency.
 */
export function createClaudeLocatorRecoveryProvider():
  | ClaudeLocatorRecoveryProvider
  | undefined {
  if (process.env.AI_LOCATOR_RECOVERY_ENABLED !== LOCATOR_RECOVERY_ENABLED) {
    return undefined;
  }

  return new ClaudeLocatorRecoveryProvider();
}

function createLocatorRecoveryPrompt(
  intent: string,
  primaryError: string,
  pageSource: string,
): string {
  return `Recover a native mobile Appium locator for this user intent.

Intent: ${intent}
Primary locator error: ${primaryError}

Accessibility tree:
${pageSource}

Return only valid JSON with this exact shape:
{"strategy":"testID|label|text|nativeXPath","value":"..."}

Rules:
- Prefer testID, then label, then visible text.
- Use nativeXPath only when the accessibility tree has no stable identifier.
- Return one enabled control that performs the requested intent.
- Never return coordinates, CSS selectors, or a locator for a different action.`;
}

function parseRecoveredLocator(rawResponse: string): RecoveredLocator | null {
  const json = rawResponse
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecoveredLocator(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isRecoveredLocator(value: unknown): value is RecoveredLocator {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.value === 'string' &&
    (candidate.strategy === 'testID' ||
      candidate.strategy === 'label' ||
      candidate.strategy === 'text' ||
      candidate.strategy === 'nativeXPath')
  );
}
