import type { BannerAlertSeverity } from '@metamask/design-system-react-native';

/**
 * The two severities from the cross margin ratio designs.
 * Warning is the elevated state (for example 63%). Danger is the critical state (for example 89%).
 */
export type PerpsCrossMarginRatioSeverity = Extract<
  BannerAlertSeverity,
  'warning' | 'danger'
>;

export interface PerpsCrossMarginRatioBannerProps {
  /**
   * Display-ready cross margin ratio, including the unit (for example "89%").
   * Formatting and rounding are the caller's responsibility.
   */
  ratio: string;
  /**
   * Warning for the elevated ratio, danger for the critical ratio.
   */
  severity: PerpsCrossMarginRatioSeverity;
  /**
   * Optional test ID for the banner root.
   */
  testID?: string;
}
