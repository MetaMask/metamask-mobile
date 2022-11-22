export interface CustomInputProps {
  /**
   * Token native symbol
   * @default 'ETH'
   */
  ticker: string;
  /**
   * Function to be called on input change
   */
  getUpdatedValue: (value: string) => void;
  /**
   * Maximum available value. Token balance.
   */
  maxAvailableValue: string;
  /**
   * Defined value of the input
   */
  defaultValue?: string;
}
