import type { TextInputSelectionChangeEvent } from 'react-native';
import { LimitOrderExecutionType } from '../../../constants/limitOrders';

export interface ButtonPricePresetsSectionRef {
  blur: () => void;
  focus: () => void;
  isFocused: () => boolean;
}

export interface ButtonPricePresetsSectionProps {
  /**
   * Buy vs sell. Drives headline copy ("Buy when" / "Sell when").
   */
  executionType: LimitOrderExecutionType;
  /**
   * Define the default price presets to render as buttons (eg. 5%, 10%)
   */
  pricePresets: number[];
  /**
   * When true, the Custom slot is a signed percent input matching the presets.
   */
  isCustomActive: boolean;
  /**
   * Unsigned custom percent, e.g. "7". Displayed as "+7%" or "-7%".
   */
  customValue: string;
  /**
   * Controlled caret selection for the custom percent input.
   */
  customSelection?: { start: number; end: number };
  /**
   * Sets the limit price to the current market snapshot.
   */
  onMarketPress: () => void;
  /**
   * Sets the limit price to the given percent offset from market.
   */
  onPercentPress: (percent: number) => void;
  /**
   * Enters custom mode and opens the custom percent keypad.
   */
  onCustomPress: () => void;
  /**
   * Fired when the custom percent input is pressed or focused.
   */
  onCustomInputPress?: () => void;
  /**
   * Fired when the custom percent caret selection changes.
   */
  onCustomSelectionChange?: (event: TextInputSelectionChangeEvent) => void;
  /**
   * Optional test ID for the root element.
   */
  testID?: string;
}
