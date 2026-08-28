import type { TextInputSelectionChangeEvent } from 'react-native';
import { LimitOrderExecutionType } from '../../../constants/limitOrders';

export interface InputSectionRef {
  blur: () => void;
  focus: () => void;
  isFocused: () => boolean;
}

export interface InputSectionProps {
  /**
   * Buy vs sell. Drives headline copy ("Buy when" / "Sell when").
   */
  executionType: LimitOrderExecutionType;
  /**
   * Quoted-token symbol for the unit chip, e.g. "WBTC".
   */
  quotedSymbol?: string;
  /**
   * When true the primary amount is fiat and a currency prefix is shown.
   */
  isLimitFiatMode: boolean;
  /**
   * Press handler for the quote-unit chip. When omitted the chip is not interactive.
   */
  onQuoteUnitPress?: () => void;
  /**
   * Closes the keypad. Used for presses that are not on the amount input.
   */
  onDismissKeypad?: () => void;
  /**
   * Primary amount shown in the large input.
   */
  value: string;
  /**
   * Fired when the amount input is pressed or focused. Parent owns the keypad.
   */
  onInputPress?: () => void;
  /**
   * Controlled caret selection, matching the swaps source amount input.
   */
  selection?: { start: number; end: number };
  /**
   * Fired when the caret selection changes.
   */
  onSelectionChange?: (event: TextInputSelectionChangeEvent) => void;
  /**
   * Secondary denomination shown under the amount, e.g. "0.0561 ETH".
   */
  secondaryValue?: string;
  /**
   * Toggles the primary amount between fiat and native. When omitted the
   * swap icon is hidden and the secondary row is not pressable.
   */
  onAmountTypeTogglePress?: () => void;
  /**
   * Market comparison shown after the secondary value.
   */
  marketComparison?: { label: string; isNegative: boolean };
  /**
   * Optional test ID for the root element.
   */
  testID?: string;
}
