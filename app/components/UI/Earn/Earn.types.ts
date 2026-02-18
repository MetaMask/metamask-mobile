/**
 * Earn navigation parameters
 */

import type { Hex } from '@metamask/utils';
import type { TokenI } from '../Tokens/types';
import type {
  EARN_LENDING_ACTIONS,
  EarnTokenDetails,
} from './types/lending.types';
import type { SimulatedAaveV3HealthFactorAfterWithdrawal } from './utils/tempLending';

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

/**
 * Lending deposit confirmation parameters
 * Matches LendingDepositViewRouteParams in EarnLendingDepositConfirmationView
 */
export interface LendingDepositConfirmationParams {
  token?: TokenI;
  amountTokenMinimalUnit?: string;
  amountFiat?: string;
  annualRewardsToken?: string;
  annualRewardsFiat?: string;
  action?: Extract<EARN_LENDING_ACTIONS, 'ALLOWANCE_INCREASE' | 'DEPOSIT'>;
  lendingContractAddress?: string;
  lendingProtocol?: string;
  networkName?: string;
  allowanceMinimalTokenUnit?: string;
}

/**
 * Lending withdrawal confirmation parameters
 * Matches EarnWithdrawalConfirmationViewRouteParams in EarnLendingWithdrawalConfirmationView
 */
export interface LendingWithdrawalConfirmationParams {
  token: TokenI | EarnTokenDetails;
  amountTokenMinimalUnit: string;
  amountFiat: string;
  lendingProtocol: string;
  lendingContractAddress: string;
  healthFactorSimulation: SimulatedAaveV3HealthFactorAfterWithdrawal;
}

/** Lending max withdrawal modal parameters */
export interface LendingMaxWithdrawalModalParams {
  maxAmount?: string;
  onMaxPress?: () => void;
}
