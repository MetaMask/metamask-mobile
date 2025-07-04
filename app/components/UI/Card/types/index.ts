import { ethers } from 'ethers';

/**
 * Enum for asset delegation status
 */
export enum AllowanceState {
  Delegatable = 'delegatable',
  Unlimited = 'unlimited',
  Limited = 'limited',
}

// Helper interface for token balances
export interface CardToken {
  address: string;
  contract?: ethers.Contract;
  decimals: number;
  symbol: string;
  name: string;
  enabled: boolean;
  balance: string; // Display balance formatted for UI
  allowanceState: AllowanceState;
  rawBalance: ethers.BigNumber;
  globalAllowance: string;
  usAllowance: string;
}
