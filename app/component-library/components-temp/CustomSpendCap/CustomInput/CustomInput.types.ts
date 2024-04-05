export interface CustomInputProps {
  /**
   * Token native symbol
   * @default 'ETH'
   */
  ticker: string;
  /**
   * Input Value
   */
  value: string;
  /**
   * Function that updates the input value
   */
  setValue: (value: string) => void;
  /**
   * Boolean to determine if input is greater than balance
   * @default false
   */
  isInputGreaterThanBalance: boolean;
  /**
   * Function to update max state
   */
  setMaxSelected: (value: boolean) => void;
  /**
   * Boolean to disable edit
   */
  isEditDisabled: boolean;
  tokenDecimal?: number;
}
