export interface CustomSpendCapProps {
  ticker: string;
  dappProposedValue: string;
  accountBalance: string;
  domain: string;
  /**
   * @param value - The value of the input field
   */
  onInputChanged: (value: string) => void;
}
