export interface TransactionEIP1559UpdateProps {
  /**
   * Selected primary currency
   */
  primaryCurrency: string;
  /**
   * The network chainId
   */
  chainId: string;
  /**
   * Function called when user clicks to edit the gas fee
   */
  onEdit: () => void;
  /**
   * Boolean to determine if the total section should be hidden
   */
  hideTotal: boolean;
  /**
   * Boolean to determine the container should have no margin
   */
  noMargin: boolean;
  /**
   * Origin (hostname) of the dapp that suggested the gas fee
   */
  origin: string;
  /**
   * If it's a eip1559 network and dapp suggest legact gas then it should show a warning
   */
  originWarning: string;
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
  animateOnChange: boolean;
  /**
   * Boolean to determine if the animation is happening
   */
  isAnimating: boolean;
  /**
   * If loading should stop
   */
  gasEstimationReady: boolean;
  /**
   * If should show legacy gas
   */
  legacy: boolean;
  /**
   * The selected gas option
   */
  gasSelected: string;
  /**
   * gas object for calculating the gas transaction cost
   */
  gasObject: {
    suggestedMaxFeePerGas: string;
    suggestedMaxPriorityFeePerGas: string;
  };
  /**
   * update gas transaction state to parent
   */
  updateTransactionState: any;
  onlyGas: boolean;
  multiLayerL1FeeTotal?: string;
}

export interface SkeletonProps {
  /**
   * Skeleton width
   */
  width: number;
  /**
   * if noStyle is passed to skeleton
   */
  noStyle?: boolean;
}

export interface SkeletonProps {
  /**
   * Skeleton width
   */
  width: number;
  /**
   * if noStyle is passed to skeleton
   */
  noStyle?: boolean;
}
