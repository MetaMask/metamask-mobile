import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import {
  AVAILABLE_GAS_OPTIONS,
  GAS_ESTIMATE_TYPES_OPTIONS,
} from '../../../types/gas';
import { UpdateTx1559Options } from '../UpdateEIP1559Tx/types';

export interface EditGasFee1559UpdateProps {
  /**
   * The selected gas value (low, medium, high)
   */
  selectedGasValue: AVAILABLE_GAS_OPTIONS | undefined;
  /**
   * Gas fee options.
   */
  gasOptions: GasFeeEstimates;
  /**
   * Primary currency, either ETH or Fiat
   */
  primaryCurrency: string;
  /**
   * Option to display speed up/cancel view
   */
  updateOption?: UpdateTx1559Options;
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
  error?: any;
  /**
   * Warning message to show
   */
  warning?: any;
  /**
   * Boolean that specifies if the gas price was suggested by the dapp
   */
  dappSuggestedGas?: boolean;
  /**
   * An array of selected gas value and lower that should be ignored.
   */
  ignoreOptions?: string[];
  /**
   * Extend options object. Object has option keys and properties will be spread
   */
  extendOptions?: any;
  /**
   * Recommended object with type and render function
   */
  recommended?: any;
  /**
   * Estimate option to compare with for too low warning
   */
  warningMinimumEstimateOption?: AVAILABLE_GAS_OPTIONS;
  /**
   * Boolean to determine if the animation is happening
   */
  isAnimating?: boolean;
  /**
   * Extra analytics params to be send with the gas analytics
   */
  analyticsParams: Partial<{
    active_currency: { value: string; anonymous: boolean };
    chain_id: string;
    gas_estimate_type: GAS_ESTIMATE_TYPES_OPTIONS;
    gas_mode: string;
    speed_set?: string;
  }>;
  view: string;
  /**
   * This is used in calculating the new gas price from the advanced view.
   * The maxFeePerGas is the max fee per gas that the user can set.
   * The maxPriorityFeePerGas is the max fee per gas that the user can set for priority transactions.
   */
  selectedGasObject: {
    suggestedMaxFeePerGas: string | undefined;
    suggestedMaxPriorityFeePerGas: string;
    suggestedGasLimit: string | undefined;
  };
  onlyGas?: boolean;
  suggestedEstimateOption?: AVAILABLE_GAS_OPTIONS;
}
