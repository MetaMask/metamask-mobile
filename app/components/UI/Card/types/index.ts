import { ethers } from 'ethers';
import { FlashListAssetKey } from '../../Tokens/TokenList';

/**
 * Enum for asset delegation status
 */
export enum AllowanceState {
  NotActivated = 'not_activated',
  Unlimited = 'unlimited',
  Limited = 'limited',
}

// Helper interface for token balances
export interface CardToken {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
}

export type CardTokenAllowance = {
  allowanceState: AllowanceState;
  allowance: ethers.BigNumber;
} & FlashListAssetKey &
  CardToken;
