export interface CustomSpendCapProps {
  ticker: string;
  dappProposedValue: string;
  accountBalance: string;
  domain: string;
  /**
   * @param value - The value of the input field
   */
  onInputChanged: (value: string) => void;
  /**
   * isEditDisabled - Boolean to disable edit
   * @default false
   */
  isEditDisabled: boolean;
  /**
   * function to return to input field
   */
  editValue: () => void;
  /**
   * token spend value - The value of the input field
   */
  tokenSpendValue: string;
}
