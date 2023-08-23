export interface EditGasFeeLegacyUpdateProps {
  /**
   * Function called when user cancels
   */
  onCancel: any;
  /**
   * Function called when user saves the new gas
   */
  onSave: (gasTxn: any, newGasObject: any) => void;
  /**
   * Error message to show
   */
  error: any;
  /**
   * Warning message to show
   */
  warning?: any;
  /**
   * Extend options object. Object has option keys and properties will be spread
   */
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
  analyticsParams: any;
  view: string;
  onlyGas?: boolean;
  selectedGasObject: any;
  hasDappSuggestedGas?: boolean;
}

export interface EditLegacyGasTransaction {
  suggestedGasLimit: string;
  suggestedGasPrice: string;
  transactionFee: string;
  transactionFeeFiat: string;
}
