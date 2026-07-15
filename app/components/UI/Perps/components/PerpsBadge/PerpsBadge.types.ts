import { type MarketType } from '@metamask/perps-controller';

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
