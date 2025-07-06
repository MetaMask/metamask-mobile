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
  decimals: number;
  symbol: string;
  name: string;
}
