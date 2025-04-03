import BigNumber from 'bignumber.js';

export interface UpdateEIP1559Props {
  /**
   * Map of accounts to information objects including balances
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accounts: any;
  /**
   * Chain Id
   */
  chainId: string;
  /**
   * ETH or fiat, depending on user setting
   */
  primaryCurrency: string;
  /**
   * Gas fee estimates returned by the gas fee controller
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gasFeeEstimates: any;
  /**
   * Estimate type returned by the gas fee controller, can be market-fee, legacy or eth_gasPrice
   */
  gasEstimateType: string;
  /**
   * A string that represents the selected address
   */
  selectedAddress: string;
  /**
   * A bool indicates whether tx is speed up/cancel
   */
  isCancel: boolean;
  /**
   * Current provider ticker
   */
  ticker: string;
  /**
   * The max fee and max priorty fee selected tx
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingGas: any;
  /**
   * Gas object used to get suggestedGasLimit
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gas: any;
  /**
   * Function that cancels the tx update
   */
  onCancel: () => void;
  /**
   * Function that performs the rest of the tx update
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (tx: any) => void;
}

export interface UpdateTx1559Options {
  /**
   * The legacy calculated max priorty fee used in subcomponent for threshold warning messages
   */
  maxPriortyFeeThreshold: BigNumber;
  /**
   * The legacy calculated max fee used in subcomponent for threshold warning messages
   */
  maxFeeThreshold: BigNumber;
  /**
   * Boolean to indicate to sumcomponent if the view should display only advanced settings
   */
  showAdvanced: boolean;
  /**
   * Boolean to indicate if this is a cancel tx update
   */
  isCancel: boolean;
}
