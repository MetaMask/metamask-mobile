import { ethers } from 'ethers';
import { FlashListAssetKey } from '../Tokens/TokenList';

/**
 * Enum for asset delegation status
 */
export enum AllowanceState {
  Enabled = 'enabled',
  Limited = 'limited',
  NotEnabled = 'not_enabled',
}

/**
 * Helper for prioritizing card token allowances based on their state.
 */
export const allowancePriority: Record<AllowanceState, number> = {
  [AllowanceState.Enabled]: 0,
  [AllowanceState.Limited]: 1,
  [AllowanceState.NotEnabled]: 2,
};

// Helper interface for token balances
export interface CardToken {
  address: string | null;
  decimals: number | null;
  symbol: string | null;
  name: string | null;
}

export type CardTokenAllowance = {
  allowanceState: AllowanceState;
  allowance: ethers.BigNumber;
} & FlashListAssetKey &
  CardToken;
