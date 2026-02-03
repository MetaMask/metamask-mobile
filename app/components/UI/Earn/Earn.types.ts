/**
 * Earn navigation parameters
 */

/** Stake confirmation parameters */
export interface StakeConfirmationParams {
  amountWei?: string;
  amountFiat?: string;
  annualRewardsETH?: string;
  annualRewardsFiat?: string;
  annualRewardRate?: string;
  chainId?: string;
}

/** Unstake confirmation parameters */
export interface UnstakeConfirmationParams {
  amountWei?: string;
  amountFiat?: string;
}

/** Learn more modal parameters */
export interface LearnMoreModalParams {
  title?: string;
  content?: string;
}

/** Max input modal parameters */
export interface MaxInputModalParams {
  amountWei?: string;
  amountFiat?: string;
  annualRewardsETH?: string;
  annualRewardsFiat?: string;
  annualRewardRate?: string;
  estimatedGasFee?: string;
  estimatedGasFeePercentage?: string;
  handleMaxPress?: () => void;
}

/** Gas impact modal parameters */
export interface GasImpactModalParams {
  estimatedGasFee?: string;
  estimatedGasFeePercentage?: string;
}

/** Earn screens parameters */
export interface EarnScreensParams {
  screen?: string;
  params?: {
    token?: Record<string, unknown>;
  };
}

/** Lending confirmation parameters */
export interface LendingConfirmationParams {
  amountWei?: string;
  amountFiat?: string;
}

/** Lending max withdrawal modal parameters */
export interface LendingMaxWithdrawalModalParams {
  maxAmount?: string;
  onMaxPress?: () => void;
}
