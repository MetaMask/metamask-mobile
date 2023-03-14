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
   * disableEdit - Boolean to diable edit
   * @default false
   */
  disableEdit: boolean;
  /**
   * function to return to input field
   */
  editValue: () => void;
}
