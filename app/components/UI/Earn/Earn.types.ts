/**
 * Earn navigation parameters
 */

import type { Hex } from '@metamask/utils';

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
  chainId?: Hex;
}

/** Max input modal parameters */
export interface MaxInputModalParams {
  handleMaxPress: () => void;
}

/** Gas impact modal parameters */
export interface GasImpactModalParams {
  amountWei: string;
  amountFiat: string;
  annualRewardsETH: string;
  annualRewardsFiat: string;
  annualRewardRate: string;
  estimatedGasFee: string;
  estimatedGasFeePercentage: string;
  chainId: string;
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
