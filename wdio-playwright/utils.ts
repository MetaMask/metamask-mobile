import test from '@playwright/test';

export function getDriver(): WebdriverIO.Browser {
  const drv = globalThis.driver;
  if (!drv) throw new Error('driver is not available');
  return drv;
}

/**
 * boxedStep - Wraps a function in a Playwright step - Used for the Test Report
 * @param target - The function to wrap
 * @param context - The context of the function
 * @returns - The wrapped function
 */
export function boxedStep(
  target: (...args: unknown[]) => unknown,
  context: ClassMethodDecoratorContext,
) {
  return function replacementMethod(
    this: {
      constructor: {
        name: string;
      };
      elem?: WebdriverIO.Element | { selector: string }; // WebdriverIO element with selector
    },
    ...args: unknown[]
  ) {
    const methodName = context.name as string;
    let stepName = this.constructor.name + '.' + methodName;

    if (this.elem?.selector) {
      stepName += ` [${this.elem.selector}]`;
    }

    // Add args info for certain methods
    if (args.length > 0 && ['fill', 'type', 'setValue'].includes(methodName)) {
      const argPreview =
        String(args[0]).length > 50
          ? String(args[0]).substring(0, 50) + '...'
          : String(args[0]);
      stepName += ` ("${argPreview}")`;
    }

    return test.step(
      stepName,
      async () => {
        try {
          const result = await target.call(this, ...args);
          return result;
        } catch (error) {
          // Take screenshot on error for better debugging
          try {
            const driver = getDriver();
            const screenshot = await driver.takeScreenshot();
            await test.info().attach(`${methodName}-error-screenshot`, {
              body: Buffer.from(screenshot, 'base64'),
              contentType: 'image/png',
            });
          } catch (screenshotError) {
            // Don't fail if screenshot fails
            console.warn(
              'Failed to capture error screenshot:',
              screenshotError,
            );
          }
          throw error;
        }
      },
      { box: true },
    );
  };
}
