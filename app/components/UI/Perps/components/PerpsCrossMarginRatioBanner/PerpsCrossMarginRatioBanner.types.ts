export interface PerpsCrossMarginRatioBannerProps {
  /**
   * Display-ready cross margin ratio, including the unit (for example "89%").
   * Formatting and rounding are the caller's responsibility.
   */
  ratio: string;
  /**
   * Optional test ID for the banner root.
   */
  testID?: string;
}
