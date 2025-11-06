/*
 * Appium-backed Matchers compatible with Detox-style Page Objects.
 * Returns a thunk (CompatElementThunk) that resolves a WebDriver element
 * using the global driver provided by the Playwright fixture.
 */

// Minimal API parity for current POCs
export default class Matchers {
  /**
   * Get element by React Native testID / accessibility id
   */
  static async getElementByID(
    elementId: string | RegExp,
    _index?: number,
  ): Promise<DetoxElement> {
    const idStr = String(elementId);
    return (async () => {
      const drv = (globalThis as any).driver;
      if (!drv) throw new Error('globalThis.driver is not available');
      return drv.findElement('accessibility id', idStr);
    }) as unknown as DetoxElement;
  }

  /**
   * Get element by visible text (Android) or label/name (iOS) via xpath/predicate
   */
  static async getElementByText(
    text: string | RegExp,
    _index: number = 0,
  ): Promise<DetoxElement> {
    const value = typeof text === 'string' ? text : String(text);
    return (async () => {
      const drv = (globalThis as any).driver;
      if (!drv) throw new Error('globalThis.driver is not available');
      const platform = (globalThis as any).__E2E_PLATFORM__ ?? 'android';
      if (platform === 'ios') {
        return drv.findElement(
          '-ios predicate string',
          `label == ${JSON.stringify(value)} OR name == ${JSON.stringify(
            value,
          )}`,
        );
      }
      return drv.findElement('xpath', `//*[@text=${JSON.stringify(value)}]`);
    }) as unknown as DetoxElement;
  }

  /**
   * Get element by accessibility label (maps to iOS label/name, Android content-desc)
   */
  static async getElementByLabel(
    label: string | RegExp,
    _index: number = 0,
  ): Promise<DetoxElement> {
    const value = typeof label === 'string' ? label : String(label);
    return (async () => {
      const drv = (globalThis as any).driver;
      if (!drv) throw new Error('globalThis.driver is not available');
      const platform = (globalThis as any).__E2E_PLATFORM__ ?? 'android';
      if (platform === 'ios') {
        return drv.findElement(
          '-ios predicate string',
          `label == ${JSON.stringify(value)} OR name == ${JSON.stringify(
            value,
          )}`,
        );
      }
      // On Android, content-desc is accessible via accessibility id
      return drv.findElement('accessibility id', value);
    }) as unknown as DetoxElement;
  }
}


