import { createAppiumLogger } from '../../appiumLogger.ts';
import type { ServiceProvider } from '../../services';
import type { SharedAppiumSession } from './types.ts';

const logger = createAppiumLogger('driver');

export type ConfigureImplicitWait = (
  drv: WebdriverIO.Browser,
  implicitMs: number,
) => Promise<void>;

/**
 * Set WDIO implicit wait, retrying because sessions can reject `setTimeout`
 * during startup (notably BrowserStack).
 */
export async function configureImplicitWait(
  drv: WebdriverIO.Browser,
  implicitMs: number,
): Promise<void> {
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await drv.setTimeout({ implicit: implicitMs });
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const backoff = Math.min(2 ** attempt * 1000, 15000);
      logger.warn(
        `driver.setTimeout failed (attempt ${attempt}/${maxRetries}), retrying in ${backoff}ms`,
      );
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

export async function createSession(
  deviceProvider: ServiceProvider,
  sharedSession: SharedAppiumSession,
): Promise<WebdriverIO.Browser> {
  const drv = await deviceProvider.getDriver();
  sharedSession.drv = drv;
  return drv;
}

/**
 * Prefer the worker-shared session when it diverges from the fixture-local
 * pointer (e.g. in-process recreate created a session that was not adopted).
 */
export function resolveLiveDriver(
  fixtureDrv: WebdriverIO.Browser | undefined,
  sharedSession: SharedAppiumSession,
): WebdriverIO.Browser | undefined {
  return sharedSession.drv ?? fixtureDrv;
}

export interface RecreateInProcessSessionOptions {
  currentDrv: WebdriverIO.Browser | undefined;
  deviceProvider: ServiceProvider;
  sharedSession: SharedAppiumSession;
  implicitMs: number;
  /**
   * Bind the new session to fixture/`globalThis.driver` before implicit wait.
   * Must run even if `configureImplicitWait` later throws, so teardown deletes
   * the live UiAutomator2 session (systemPort / instrumentation) instead of
   * the session that was just cleaned up.
   */
  adoptSession: (drv: WebdriverIO.Browser) => void;
  /** Flush session-scoped state (screen recording) before the dying session is deleted. */
  flushDyingSession?: (drv: WebdriverIO.Browser) => Promise<void>;
  /** Re-arm session-scoped state (screen recording) on the replacement session. */
  armNewSession?: (drv: WebdriverIO.Browser) => Promise<void>;
  configureWait?: ConfigureImplicitWait;
}

/**
 * Delete the current WebDriver session and create a replacement in the same
 * Playwright attempt (used when UiAutomator2 dies mid-test).
 */
export async function recreateInProcessSession({
  currentDrv,
  deviceProvider,
  sharedSession,
  implicitMs,
  adoptSession,
  flushDyingSession,
  armNewSession,
  configureWait = configureImplicitWait,
}: RecreateInProcessSessionOptions): Promise<WebdriverIO.Browser> {
  if (currentDrv && flushDyingSession) {
    try {
      await flushDyingSession(currentDrv);
    } catch (error) {
      logger.error(
        'Failed to flush session state before in-process recreate:',
        error,
      );
    }
  }
  try {
    if (currentDrv) {
      await deviceProvider.cleanupSession?.(currentDrv);
    }
  } catch (error) {
    logger.error(
      'Failed to cleanup session before in-process recreate:',
      error,
    );
  }
  sharedSession.drv = undefined;
  const newDrv = await createSession(deviceProvider, sharedSession);
  adoptSession(newDrv);
  if (armNewSession) {
    try {
      await armNewSession(newDrv);
    } catch (error) {
      logger.error(
        'Failed to arm session state after in-process recreate:',
        error,
      );
    }
  }
  await configureWait(newDrv, implicitMs);
  return newDrv;
}
