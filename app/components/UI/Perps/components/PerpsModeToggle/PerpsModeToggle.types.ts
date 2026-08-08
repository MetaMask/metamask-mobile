import type { SegmentedControlSize } from '@metamask/design-system-react-native';
import type { PerpsMode } from '@metamask/perps-controller';

/**
 * How the toggle presents itself.
 *
 * `'toggle'` (default) renders the interactive two-segment pill ("Lite" / "Pro").
 *
 * `'active'` renders a single pill showing only the currently active mode, used
 * in Perps headers. Pressing it plays the shimmer and flips to the opposite
 * mode.
 */
export type PerpsModeToggleVariant = 'toggle' | 'active';

export interface PerpsModeToggleProps {
  /**
   * Currently selected mode.
   */
  mode: PerpsMode;

  /**
   * Called when the user selects a different mode. In the `'active'` variant,
   * this fires with the opposite mode when the pill is pressed.
   */
  onChange?: (mode: PerpsMode) => void | Promise<void>;

  /**
   * @default 'toggle'
   */
  variant?: PerpsModeToggleVariant;

  /**
   * Size of the underlying segmented control.
   *
   * @default SegmentedControlSize.Sm
   */
  size?: SegmentedControlSize;

  /**
   * When true, the toggle stretches to the width of its parent.
   *
   * @default false
   */
  isFullWidth?: boolean;

  /**
   * Entry point the toggle is rendered from (e.g. Trade menu, Perps home
   * header). Emitted as the `source` property on the Perps UI interaction
   * event so we can attribute mode switches to their origin. Expected to be a
   * value from `PERPS_EVENT_VALUE.SOURCE`.
   */
  source?: string;

  /**
   * When true, fires selection haptics on a meaningful mode change.
   * Defaults off so Lite entry points stay silent.
   */
  enableHaptics?: boolean;

  testID?: string;
}
