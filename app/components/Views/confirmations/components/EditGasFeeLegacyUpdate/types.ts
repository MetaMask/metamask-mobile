export interface EditGasFeeLegacyUpdateProps {
  /**
   * Function called when user cancels
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCancel: any;
  /**
   * Function called when user saves the new gas
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (gasTxn: any, newGasObject: any) => void;
  /**
   * Error message to show
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
  /**
   * Warning message to show
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warning?: any;
  /**
   * Extend options object. Object has option keys and properties will be spread
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extendOptions?: any;
  /**
   * Function to call when update animation starts
   */
  onUpdatingValuesStart: () => void;
  /**
   * Function to call when update animation ends
   */
  onUpdatingValuesEnd: () => void;
  /**
   * If the values should animate upon update or not
   */
  animateOnChange: boolean | undefined;
  /**
   * Boolean to determine if the animation is happening
   */
  isAnimating: boolean;
  /**
   * Extra analytics params to be send with the gas analytics
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analyticsParams: any;
  view: string;
  onlyGas?: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedGasObject: any;
  hasDappSuggestedGas?: boolean;
  chainId: string;
}

export interface EditLegacyGasTransaction {
  suggestedGasLimit: string;
  suggestedGasPrice: string;
  transactionFee: string;
  transactionFeeFiat: string;
}
