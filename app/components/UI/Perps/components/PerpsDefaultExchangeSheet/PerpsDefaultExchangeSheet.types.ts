import type { ImageSourcePropType } from 'react-native';

/**
 * One exchange the user can set as the default for perps orders.
 */
export interface PerpsDefaultExchangeOption {
  /**
   * Stable id passed back from Save.
   */
  id: string;
  /**
   * Exchange name shown on the card.
   */
  name: string;
  /**
   * 40px logo. Local asset or remote image.
   */
  logoSource: ImageSourcePropType;
  /**
   * Leverage cap shown in the tag, without the "x max" suffix.
   */
  maxLeverage: string;
  /**
   * Maker fee label, including the percent sign.
   */
  makerFee: string;
  /**
   * Taker fee label, including the percent sign.
   */
  takerFee: string;
  /**
   * Open-interest label, including the currency symbol and scale.
   */
  openInterest: string;
}

/**
 * PerpsDefaultExchangeSheet props.
 */
export interface PerpsDefaultExchangeSheetProps {
  /**
   * Whether the sheet is open.
   */
  isVisible: boolean;
  /**
   * Exchanges rendered as selectable cards.
   */
  options: PerpsDefaultExchangeOption[];
  /**
   * Id of the exchange that is already saved. The sheet drafts a new
   * choice until Save.
   */
  selectedOptionId: string;
  /**
   * Called when the sheet is dismissed without saving.
   */
  onClose: () => void;
  /**
   * Called with the drafted exchange id when Save is pressed.
   */
  onSave: (optionId: string) => void;
  /**
   * Optional test ID for the sheet container.
   */
  testID?: string;
  /**
   * Extra space, in pixels, below the save button.
   * The Storybook story sets this so Save clears the preview chrome.
   */
  saveButtonBottomSpacing?: number;
}
