import { createLogger } from '../framework/logger';

const logger = createLogger({
  name: 'SoftAssert',
});

/**
 * A utility class for collecting and managing multiple assertion errors during asynchronous test execution.
 *
 * `SoftAssert` allows you to perform assertions without immediately throwing on failure.
 * Instead, assertion errors are collected and can be reported or thrown together at the end of a test.
 *
 * @example
 * ```typescript
 * const softAssert = new SoftAssert();
 * await softAssert.checkAndCollect(async () => {
 *   expect(await getValue()).toBe(42);
 * }, 'Value should be 42');
 *
 * softAssert.throwIfErrors();
 * ```
 *
 * @method checkAndCollect - Executes an async assertion function, collecting any thrown error with a description.
 * @method hasErrors - Returns true if any assertion errors have been collected.
 * @method throwIfErrors - Throws a single error summarizing all collected assertion failures, if any exist.
 */
class SoftAssert {
  private assertionErrors: {
    description: string;
    error: string;
  }[];

  constructor() {
    this.assertionErrors = [];
  }

  async checkAndCollect(assertionFn: () => Promise<void>, description: string) {
    try {
      await assertionFn();
    } catch (error: unknown) {
      this.assertionErrors.push({
        description,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  hasErrors() {
    return this.assertionErrors.length > 0;
  }

  throwIfErrors() {
    if (this.hasErrors()) {
      const errorSummary = this.assertionErrors
        .map((err) => `${err.description}: ${err.error}`)
        .join('\n');
      throw new Error(`Assertion failures:\n${errorSummary}`);
    } else {
      logger.info('All assertions passed.');
    }
  }
}

export default SoftAssert;
