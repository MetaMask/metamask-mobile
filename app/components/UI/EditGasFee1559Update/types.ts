import { GasFeeOptions } from '../../../core/GasPolling/types';

export interface RenderInputProps {
  updateOption:
    | {
        isCancel: boolean;
        maxFeeThreshold: string;
        maxPriortyFeeThreshold: string;
        showAdvanced: boolean | undefined;
      }
    | undefined;
}
export interface EditGasFee1559UpdateProps {
  /**
   * The selected gas value (low, medium, high)
   */
  selectedGasValue: string;
  /**
   * Gas fee options.
   */
  gasOptions: GasFeeOptions;
  /**
   * Primary currency, either ETH or Fiat
   */
  primaryCurrency: string;
  /**
   * Option to display speed up/cancel view
   */
  updateOption: RenderInputProps;
  /**
   * If the values should animate upon update or not
   */
  animateOnChange: boolean | undefined;
  /**
   * A string representing the network chainId
   */
  chainId: string;
  /**
   * Function to set the gas selected value
   */
  onChange: any;
  /**
   * Function called when user cancels
   */
  onCancel: any;
  /**
   * Function called when user saves the new gas data
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
  dappSuggestedGas: boolean | undefined;
  /**
   * An array of selected gas value and lower that should be ignored.
   */
  ignoreOptions: string[] | undefined;
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
  suggestedEstimateOption: string;
  /**
   * Boolean to determine if the animation is happening
   */
  isAnimating: boolean;
  /**
   * Extra analytics params to be send with the gas analytics
   */
  analyticsParams: {
    chain_id: string;
    gas_estimate_type: string;
    gas_mode: string;
    speed_set: string;
    view: string;
  };
  /**
   * This is used in calculating the new gas price from the advanced view.
   * The maxFeePerGas is the max fee per gas that the user can set.
   * The maxPriorityFeePerGas is the max fee per gas that the user can set for priority transactions.
   */
  selectedGasObject: {
    suggestedMaxFeePerGas: string;
    suggestedMaxPriorityFeePerGas: string;
    suggestedGasLimit: string;
  };
  onlyGas?: boolean;
}
