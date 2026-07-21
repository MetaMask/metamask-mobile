import type { ActionPosition } from '../../../../../util/analytics/actionButtonTracking';
import type { HomepageActionButtonsGridRowOrder } from '../../abTestConfig';

export interface HomepageActionButtonSlotProps {
  /** On-screen position (0–7) for ACTION_BUTTON_CLICKED analytics. */
  actionPosition: ActionPosition;
  /** When true, label wraps to 2 lines before tail ellipsis. */
  allowTwoLineLabel?: boolean;
}

export interface HomepageActionButtonsGridProps {
  rowOrder: HomepageActionButtonsGridRowOrder;
  /**
   * Send handler owned by Wallet (includes non-EVM / keyring-snaps paths).
   */
  onSend: () => void;
  /**
   * Receive handler owned by Wallet (navigates to the receiving address list).
   */
  onReceive: () => void;
  /**
   * When true, action labels wrap to 2 lines before ellipsizing.
   * @default false
   */
  allowTwoLineLabel?: boolean;
}

export type { HomepageActionButtonsGridRowOrder };
