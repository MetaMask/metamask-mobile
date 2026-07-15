import type { ActionPosition } from '../../../../../util/analytics/actionButtonTracking';
import type { HomepageActionButtonsGridRowOrder } from '../../abTestConfig';

export interface HomepageActionButtonSlotProps {
  /** On-screen position (0–7) for ACTION_BUTTON_CLICKED analytics. */
  actionPosition: ActionPosition;
}

export interface HomepageActionButtonsGridProps {
  rowOrder: HomepageActionButtonsGridRowOrder;
  /**
   * Send handler owned by Wallet (includes non-EVM / keyring-snaps paths).
   */
  onSend: () => void;
}

export type { HomepageActionButtonsGridRowOrder };
