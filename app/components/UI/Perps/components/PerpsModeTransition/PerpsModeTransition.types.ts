import type { PerpsMode } from '../PerpsModeToggle';

export interface PerpsModeTransitionProps {
  /**
   * Mode being switched to. Controls the displayed title
   * ("Pro Mode" / "Lite Mode").
   */
  mode: PerpsMode;

  /**
   * How long the interstitial stays on screen before `onDone` fires, in ms.
   *
   * @default 1500
   */
  durationMs?: number;

  /**
   * Called once the interstitial has been shown for `durationMs`. Consumers
   * use this to navigate to the destination Perps screen.
   */
  onDone?: () => void;

  testID?: string;
}
