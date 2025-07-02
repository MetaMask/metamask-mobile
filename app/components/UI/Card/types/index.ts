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
export interface TokenConfig {
  address: string;
  contract?: ethers.Contract;
  decimals: number;
  symbol: string;
  name: string;
  balance: string; // Display balance formatted for UI
  allowanceState: AllowanceState;
  rawBalance: ethers.BigNumber;
  globalAllowance: string;
  usAllowance: string;
}
