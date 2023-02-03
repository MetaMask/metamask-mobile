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
   * Boolean to determine if the input is disabled
   * @default false
   */
  inputDisabled?: boolean;
  /**
   * Boolean to determine if default value is selected
   * @default false
   */
  defaultValueSelected: boolean;
  /**
   * Function to update max state
   */
  setMaxSelected: (value: boolean) => void;
}
