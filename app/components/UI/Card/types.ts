import { ethers } from 'ethers';
import { FlashListAssetKey } from '../Tokens/TokenList';

/**
 * Enum for asset delegation status
 */
export enum AllowanceState {
  NotEnabled = 'not_enabled',
  Enabled = 'enabled',
  Limited = 'limited',
}

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
