import { GasFeeOptions } from '../../../core/GasPolling/types';

export interface EditGasFeeLegacyUpdateProps {
  /**
   * Gas option selected (low, medium, high)
   */
  selected: string;
  /**
   * Gas fee options to select from
   */
  gasOptions: GasFeeOptions;
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
   * Primary currency, either ETH or Fiat
   */
  primaryCurrency: string;
  /**
   * A string representing the network chainId
   */
  chainId: string;
  /**
   * Estimate type returned by the gas fee controller, can be market-fee, legacy or eth_gasPrice
   */
  gasEstimateType: string;

  /**
   * Error message to show
   */
  error: any;
  /**
   * Warning message to show
   */
  warning: any | undefined;
  /**
   * Ignore option array
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
}
