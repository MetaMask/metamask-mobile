import { LendingMarketWithPosition } from '@metamask/earn-controller';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { VaultData } from '@metamask/stake-sdk';
import { TokenI } from '../../Tokens/types';

export enum EARN_LENDING_ACTIONS {
  DEPOSIT = 'DEPOSIT',
  ALLOWANCE_INCREASE = 'ALLOWANCE_INCREASE',
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
