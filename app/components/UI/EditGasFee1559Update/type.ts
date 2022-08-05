export interface EditGasFee1559UpdateProps {
  /**
   * Gas option selected (low, medium, high)
   */
  selectedGasValue: string;
  suggestedGasLimit: string;
  /**
   * Gas fee options to select from
   */
  gasOptions: {
    baseFeeTrend: string;
    estimatedBaseFee: string;
    high: {
      maxWaitTimeEstimate: number;
      minWaitTimeEstimate: number;
      suggestedMaxFeePerGas: string;
      suggestedMaxPriorityFeePerGas: string;
    };
    historicalBaseFeeRange: [string, string];
    historicalPriorityFeeRange: [string, string];
    latestPriorityFeeRange: [string, string];
    low: {
      maxWaitTimeEstimate: number;
      minWaitTimeEstimate: number;
      suggestedMaxFeePerGas: string;
      suggestedMaxPriorityFeePerGas: string;
    };
    medium: {
      maxWaitTimeEstimate: number;
      minWaitTimeEstimate: number;
      suggestedMaxFeePerGas: string;
      suggestedMaxPriorityFeePerGas: string;
    };
    networkCongestion: number;
    priorityFeeTrend: string;
    // suggestedEstimateOption
  };
  /**
   * Primary currency, either ETH or Fiat
   */
  primaryCurrency: string;

  /**
   * Option to display speed up/cancel view
   */
  updateOption: {
    isCancel: boolean;
    maxFeeThreshold: string;
    maxPriortyFeeThreshold: string;
    showAdvanced: boolean;
  };
  /**
   * If the values should animate upon update or not
   */
  animateOnChange: boolean;
  /**
   * A string representing the network chainId
   */
  chainId: string;
  /**
   * Function called when user selected or changed the gas
   */
  onChange: any;
  /**
   * Function called when user cancels
   */
  onCancel: any;
  /**
   * Function called when user saves the new gas
   */
  onSave: any;

  /**
   * Error message to show
   */
  error: any;
  /**
   * Warning message to show
   */
  warning: any;
  /**
   * Boolean that specifies if the gas price was suggested by the dapp
   */
  dappSuggestedGas: boolean;
  /**
   * Ignore option array
   */
  ignoreOptions: any;
  /**
   * Extend options object. Object has option keys and properties will be spread
   */
  extendOptions: any;
  /**
   * Recommended object with type and render function
   */
  recommended: any;
  /**
   * Estimate option to compare with for too low warning
   */
  warningMinimumEstimateOption: string;
  /**
   * Suggested estimate option to show recommended values
   */
  //   suggestedEstimateOption: string;
  /**
   * Boolean to determine if the animation is happening
   */
  isAnimating: boolean;
  /**
   * Extra analytics params to be send with the gas analytics
   */
  analyticsParams: any;
  /**
   * (For analytics purposes) View (Approve, Transfer, Confirm) where this component is being used
   */
  view: string;

  existingGas: any;
}
