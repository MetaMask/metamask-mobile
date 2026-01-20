import { LendingMarketWithPosition } from '@metamask/earn-controller';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { VaultData } from '@metamask/stake-sdk';
import { TokenI } from '../../Tokens/types';

export enum EARN_LENDING_ACTIONS {
  DEPOSIT = 'DEPOSIT',
  ALLOWANCE_INCREASE = 'ALLOWANCE_INCREASE',
  ALLOWANCE_RESET = 'ALLOWANCE_RESET',
}

export type EarnTokenDetails = TokenI & {
  balanceFormatted: string;
  balanceMinimalUnit: string;
  balanceFiat?: string;
  balanceFiatNumber: number;
  tokenUsdExchangeRate: number;
  readonly experience: EarnTokenDetails['experiences'][0];
  experiences: {
    type: EARN_EXPERIENCES;
    apr: string;
    estimatedAnnualRewardsFormatted: string;
    estimatedAnnualRewardsFiatNumber: number;
    estimatedAnnualRewardsTokenMinimalUnit: string;
    estimatedAnnualRewardsTokenFormatted: string;
    market?: LendingMarketWithPosition;
    vault?: VaultData;
  }[];
  // Token name (e.g. Aave Linea)
  token?: string;
};

// TEMP: Type isn't being exported from @metamask/stake-sdk anymore.
// This is a stopgap until we export these types from either @metamask/earn-controller or @metamask/stake-sdk
export enum LendingProtocol {
  AAVE = 'aave',
}

export interface QuickAmount {
  value: number;
  label: string;
  isNative?: boolean;
  isHighlighted?: boolean;
  disabled?: boolean;
}
