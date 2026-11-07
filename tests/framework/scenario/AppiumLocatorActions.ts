import Assertions from '../Assertions.ts';
import Gestures from '../Gestures.ts';
import {
  getElementForLocator,
  type RecoveredLocator,
} from '../ai-locator/SelfHealingLocator.ts';
import type { LocatorActions } from './ScenarioExecutor.ts';

/** Short waits: alternatives are tried only after the binding already timed out. */
const ALTERNATIVE_TAP_TIMEOUT_MS = 5_000;
const ALTERNATIVE_VISIBLE_TIMEOUT_MS = 10_000;

/** Executes lockfile alternatives and AI-recovered locators on the device. */
export const appiumLocatorActions: LocatorActions = {
  async tap(locator: RecoveredLocator, description: string): Promise<void> {
    await Gestures.waitAndTap(getElementForLocator(locator), {
      timeout: ALTERNATIVE_TAP_TIMEOUT_MS,
      elemDescription: description,
    });
  },
  async assertVisible(
    locator: RecoveredLocator,
    description: string,
  ): Promise<void> {
    await Assertions.expectElementToBeVisible(getElementForLocator(locator), {
      timeout: ALTERNATIVE_VISIBLE_TIMEOUT_MS,
      description,
    });
  },
};
