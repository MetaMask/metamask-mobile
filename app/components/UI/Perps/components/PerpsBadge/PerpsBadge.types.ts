import type { MarketType } from '../../controllers/types';

export type BadgeType = MarketType | 'experimental' | 'dex';

export interface PerpsBadgeProps {
  /**
   * Type of badge to display
   */
  type: BadgeType;
  /**
   * Optional custom label (overrides i18n label)
   */
  customLabel?: string;
  /**
   * Optional test ID for E2E testing
   */
  testID?: string;
}
