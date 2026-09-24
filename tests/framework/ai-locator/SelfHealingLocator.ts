import type { Browser } from 'webdriverio';
import type { AppiumElement } from '../AppiumElement.ts';
import Matchers from '../Matchers.ts';

export type RecoveredLocator =
  | { strategy: 'testID'; value: string }
  | { strategy: 'label'; value: string }
  | { strategy: 'text'; value: string }
  | { strategy: 'nativeXPath'; value: string };

export interface LocatorRecoveryContext {
  driver: Browser;
  intent: string;
  primaryError: string;
}

export interface LocatorRecoveryProvider {
  recover(context: LocatorRecoveryContext): Promise<RecoveredLocator | null>;
}

export interface SelfHealingTapOptions {
  /** Human-readable action used by the recovery provider. */
  intent: string;
  /** Deterministic locator. This is always attempted first. */
  primary: () => Promise<AppiumElement>;
  driver: Browser;
  /** AI/MCP adapter. Recovery is disabled when this is omitted. */
  recovery?: LocatorRecoveryProvider;
  /** Performs the framework-specific tap after a locator is resolved. */
  tap?: (element: AppiumElement) => Promise<void>;
  /**
   * Receives recovery metadata for test attachments or reporting.
   * This callback is intentionally outside the timed performance step.
   */
  onRecovered?: (result: {
    intent: string;
    locator: RecoveredLocator;
    durationMs: number;
  }) => Promise<void> | void;
}

/**
 * Taps a deterministic locator and optionally asks an AI/MCP adapter to
 * recover after the deterministic locator fails.
 *
 * The recovery provider is opt-in and is called only after the primary
 * locator fails. Call this before starting a performance timer so model and
 * screenshot latency cannot affect the measured user-visible interval.
 */
export async function tapWithSelfHealingLocator(
  options: SelfHealingTapOptions,
): Promise<'primary' | 'recovered'> {
  try {
    const primaryElement = await options.primary();
    await (options.tap ?? defaultTap)(primaryElement);
    return 'primary';
  } catch (primaryError) {
    if (!options.recovery) {
      throw primaryError;
    }

    const startedAt = Date.now();
    const recoveredLocator = await options.recovery.recover({
      driver: options.driver,
      intent: options.intent,
      primaryError: getErrorMessage(primaryError),
    });

    if (!recoveredLocator) {
      throw primaryError;
    }

    const recoveredElement = await getElementForLocator(recoveredLocator);
    await (options.tap ?? defaultTap)(recoveredElement);
    await options.onRecovered?.({
      intent: options.intent,
      locator: recoveredLocator,
      durationMs: Date.now() - startedAt,
    });

    return 'recovered';
  }
}

async function getElementForLocator(
  locator: RecoveredLocator,
): Promise<AppiumElement> {
  switch (locator.strategy) {
    case 'testID':
      return Matchers.getElementByID(locator.value);
    case 'label':
      return Matchers.getElementByLabel(locator.value);
    case 'text':
      return Matchers.getElementByText(locator.value);
    case 'nativeXPath':
      return Matchers.getElementByNativeXPath(locator.value);
  }
}

async function defaultTap(element: AppiumElement): Promise<void> {
  await element.click();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
