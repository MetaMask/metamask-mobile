import AppiumGestures from '../AppiumGestures.ts';
import { getDriver } from '../AppiumUtilities.ts';
import type {
  FlakyFixExecutor,
  ScrollDirection,
} from './FlakyRecoveryTypes.ts';

const SCROLL_SWIPE_DURATION_MS = 600;
const SCROLL_SWIPE_PERCENT = 0.5;

/** `down` reveals content further down, which is a swipe up. */
const SWIPE_DIRECTION_BY_SCROLL: Record<ScrollDirection, ScrollDirection> = {
  down: 'up',
  up: 'down',
  left: 'right',
  right: 'left',
};

export const appiumFlakyFixExecutor: FlakyFixExecutor = {
  takeScreenshot: async () => getDriver().takeScreenshot(),
  async scroll(direction, times) {
    for (let index = 0; index < times; index++) {
      await AppiumGestures.swipe({
        scrollParams: { direction: SWIPE_DIRECTION_BY_SCROLL[direction] },
        duration: SCROLL_SWIPE_DURATION_MS,
        percent: SCROLL_SWIPE_PERCENT,
      });
    }
  },
  hideKeyboard: async () => AppiumGestures.hideKeyboard(),
  sleep: async (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
