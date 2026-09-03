export interface PriceRowProps {
  /**
   * Slippage shown on the row, e.g. "2%".
   */
  value: string;
  /**
   * Fired when the slippage value is pressed.
   */
  onPress: () => void;
  /**
   * Optional test ID for the root element.
   */
  testID?: string;
}
