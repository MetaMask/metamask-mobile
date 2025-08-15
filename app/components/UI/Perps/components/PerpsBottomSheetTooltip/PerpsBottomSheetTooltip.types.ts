export interface PerpsBottomSheetTooltipProps {
  /**
   * Visibility state of the bottom sheet
   */
  isVisible: boolean;

  /**
   * Function called when bottom sheet should close
   */
  onClose: () => void;

  /**
   * Tooltip content key for localization lookup
   * Maps to strings('perps.tooltips.{contentKey}.title') and strings('perps.tooltips.{contentKey}.content')
   */
  contentKey: PerpsTooltipContentKey;

  /**
   * Optional test ID for testing
   */
  testID?: string;
}

export type PerpsTooltipContentKey =
  | 'leverage'
  | 'liquidation_price'
  | 'margin'
  | 'fees'
  | 'open_interest'
  | 'funding_rate'
  | 'perps_geo_block';
