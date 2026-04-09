/**
 * Stake input view navigation parameters
 */

/** Stake parameters */
export interface StakeParams {
  token?: {
    chainId?: string;
    address?: string;
    symbol?: string;
    decimals?: number;
    name?: string;
    image?: string;
    balance?: string;
    balanceFiat?: string;
    isETH?: boolean;
  };
}

/** Unstake parameters */
export interface UnstakeParams {
  token?: Record<string, unknown>;
}

/** Claim parameters */
export interface ClaimParams {
  token?: Record<string, unknown>;
}
