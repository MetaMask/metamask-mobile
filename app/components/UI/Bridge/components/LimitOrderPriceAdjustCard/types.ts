import type { Ref } from 'react';
import type { TextInputSelectionChangeEvent } from 'react-native';
import type { LimitOrderExecutionType } from '../../constants/limitOrders';
import type { InputSectionRef } from './InputSection/types';
import type { ButtonPricePresetsSectionRef } from './ButtonPricePresetsSection/types';

export type { InputSectionRef, ButtonPricePresetsSectionRef };

export interface LimitOrderPriceAdjustCardProps {
  /**
   * Adds bottom padding when a swaps error/warning banner is visible below
   * this card.
   */
  hasVisibleBanner?: boolean;
  /**
   * Closes the keypad when empty space in the card is pressed, and when
   * non-input controls in the limit-price row are pressed.
   */
  onDismissKeypad?: () => void;
  /**
   * Buy vs sell. Drives headline copy ("Buy when" / "Sell when") and the
   * sign shown on percent presets.
   */
  orderSide: LimitOrderExecutionType;
  /**
   * Quoted-token symbol for the unit chip, e.g. "WBTC".
   */
  quoteTokenSymbol?: string;
  /**
   * When true the primary amount is fiat and a currency prefix is shown.
   */
  isLimitFiatMode: boolean;
  /**
   * Press handler for the quote-unit chip. When omitted the chip is not
   * interactive.
   */
  onQuoteUnitPress?: () => void;
  /**
   * Limit price shown in the large input.
   */
  limitPrice: string;
  /**
   * Fired when the limit-price input is pressed or focused. Parent owns the
   * keypad.
   */
  onLimitPriceInputPress?: () => void;
  /**
   * Controlled caret selection for the limit-price input.
   */
  limitPriceSelection?: { start: number; end: number };
  /**
   * Fired when the limit-price caret selection changes.
   */
  onLimitPriceSelectionChange?: (event: TextInputSelectionChangeEvent) => void;
  /**
   * Alternate denomination shown under the limit price, e.g. "0.0561 ETH".
   */
  secondaryLimitPrice?: string;
  /**
   * Toggles the primary amount between fiat and native. When omitted the
   * swap icon is hidden and the secondary row is not pressable.
   */
  onAmountTypeTogglePress?: () => void;
  /**
   * Market comparison shown after the secondary limit price.
   */
  marketComparison?: { label: string; isNegative: boolean };
  /**
   * Percent offsets from market rendered as preset buttons, e.g. `[5, 10]`.
   */
  pricePresets: number[];
  /**
   * When true, the Custom slot is an unsigned percent input.
   */
  isCustomPercentActive: boolean;
  /**
   * Unsigned custom percent shown in the Custom input, e.g. "7".
   */
  customPercent: string;
  /**
   * Controlled caret selection for the custom percent input.
   */
  customPercentSelection?: { start: number; end: number };
  /**
   * Sets the limit price to the current market snapshot.
   */
  onMarketPresetPress: () => void;
  /**
   * Sets the limit price to the given percent offset from market.
   */
  onPercentPresetPress: (percent: number) => void;
  /**
   * Enters custom mode and opens the custom percent keypad.
   */
  onCustomPresetPress: () => void;
  /**
   * Fired when the custom percent input is pressed or focused.
   */
  onCustomPercentInputPress?: () => void;
  /**
   * Fired when the custom percent caret selection changes.
   */
  onCustomPercentSelectionChange?: (
    event: TextInputSelectionChangeEvent,
  ) => void;
  /**
   * Imperative handle for the limit-price input (`blur` / `focus` /
   * `isFocused`).
   */
  limitPriceInputRef?: Ref<InputSectionRef>;
  /**
   * Imperative handle for the custom percent input (`blur` / `focus` /
   * `isFocused`).
   */
  customPercentInputRef?: Ref<ButtonPricePresetsSectionRef>;
}
