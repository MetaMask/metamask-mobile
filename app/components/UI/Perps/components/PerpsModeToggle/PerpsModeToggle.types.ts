import type { SegmentedControlSize } from '@metamask/design-system-react-native';

/**
 * Perps Lite ⇄ Pro mode.
 *
 * NOTE: This is a temporary local definition for the design phase of TAT-3551.
 * The canonical `PerpsMode` enum is owned by the external
 * `@metamask/perps-controller` package (TAT-3582). Once that ships and the
 * mobile dependency is bumped, this local enum should be removed and replaced
 * with the imported one (values are intentionally kept identical: `'lite'` /
 * `'pro'`).
 */
export enum PerpsMode {
  Lite = 'lite',
  Pro = 'pro',
}

/**
 * How the toggle presents itself.
 *
 * `'toggle'` (default) renders the interactive two-segment pill ("Lite" / "Pro")
 * used in the Trade menu and Perps home header.
 *
 * `'active'` renders a read-only single pill showing only the currently active
 * mode, used in the Market header (AC #6.3).
 */
export type PerpsModeToggleVariant = 'toggle' | 'active';

export interface PerpsModeToggleProps {
  /**
   * Currently selected mode.
   */
  mode: PerpsMode;

  /**
   * Called when the user selects a different mode. Not called in the `'active'`
   * variant (read-only).
   */
  onChange?: (mode: PerpsMode) => void;

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

  testID?: string;
}
