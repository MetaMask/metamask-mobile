import { FrameworkDetector } from './FrameworkDetector.ts';

/**
 * Escape hatch for page-object methods that need entirely different
 * control flow per framework (~3% of cases).
 *
 * Use `UnifiedGestures` for the common case. Reach for `encapsulatedAction`
 * only when the Detox and Appium flows differ structurally (e.g. different
 * sequences of taps, waits, or scrolls).
 *
 * @example
 * ```typescript
 * async dismissOnboarding() {
 *   await encapsulatedAction({
 *     detox: async () => {
 *       await Gestures.swipe(this.overlay, 'up');
 *       await Gestures.tap(this.dismissButton);
 *     },
 *     appium: async () => {
 *       const btn = await asPlaywrightElement(this.dismissButton);
 *       await btn.click();
 *     },
 *   });
 * }
 * ```
 */
export async function encapsulatedAction(config: {
  detox?: () => Promise<void>;
  appium?: () => Promise<void>;
}): Promise<void> {
  if (FrameworkDetector.isDetox() && config.detox) {
    await config.detox();
  } else if (FrameworkDetector.isAppium() && config.appium) {
    await config.appium();
  } else {
    throw new Error('No action configuration provided');
  }
}
