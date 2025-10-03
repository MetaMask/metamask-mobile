import { ButtonProps } from '../../../../../component-library/components/Buttons/Button/Button.types';

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

  /**
   * Optional data to pass to custom content renderers
   */
  data?: Record<string, unknown>;

  /**
   * Optional button config to pass to custom content renderers
   */
  buttonConfig?: ButtonProps[];
}

export type PerpsTooltipContentKey =
  | 'leverage'
  | 'liquidation_price'
  | 'margin'
  | 'fees'
  | 'closing_fees'
  | 'withdrawal_fees'
  | 'receive'
  | 'open_interest'
  | 'funding_rate'
  | 'geo_block'
  | 'estimated_pnl'
  | 'limit_price'
  | 'tp_sl'
  | 'close_position_you_receive'
  | 'tpsl_count_warning';
