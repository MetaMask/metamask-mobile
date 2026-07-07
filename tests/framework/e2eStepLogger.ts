import { createPlaywrightLogger } from './playwrightLogger.ts';

export type E2EStepRunner = <T>(
  stepName: string,
  fn: () => Promise<T>,
) => Promise<T>;

/**
 * Creates a step logger that emits START/DONE/FAILED lines with elapsed ms.
 * The last START without a matching DONE/FAILED pinpoints CI timeouts.
 */
export function createE2EStepLogger(scope: string): E2EStepRunner {
  const logger = createPlaywrightLogger(scope);

  return async <T>(stepName: string, fn: () => Promise<T>): Promise<T> => {
    const startedAt = Date.now();
    logger.info(`START: ${stepName}`);
    try {
      const result = await fn();
      logger.info(`DONE: ${stepName} (${Date.now() - startedAt}ms)`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        `FAILED: ${stepName} after ${Date.now() - startedAt}ms — ${message}`,
      );
      throw error;
    }
  };
}
