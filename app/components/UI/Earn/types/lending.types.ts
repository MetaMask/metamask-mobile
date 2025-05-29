import { LendingMarketWithPosition } from '@metamask-previews/earn-controller';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { VaultData } from '@metamask/stake-sdk';
import { TokenI } from '../../Tokens/types';

export enum EARN_LENDING_ACTIONS {
  DEPOSIT = 'DEPOSIT',
  ALLOWANCE_INCREASE = 'ALLOWANCE_INCREASE',
}

export interface EarnTokenDetails extends TokenI {
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
    market?: LendingMarketWithPosition;
    vault?: VaultData;
  }[];
}
