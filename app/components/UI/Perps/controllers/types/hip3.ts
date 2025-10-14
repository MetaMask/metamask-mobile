import type { Hex } from '@metamask/utils';

/**
 * HIP-3 specific types for collateral management
 */

export interface Hip3CollateralTransferParams {
  /** Name of the HIP-3 DEX */
  dex: string;
  /** Collateral token symbol (e.g., 'USDC') */
  token: string;
  /** Amount to transfer (in token units, e.g., '100' for 100 USDC) */
  amount: string;
  /** true = transfer TO perp dex, false = transfer FROM perp dex to spot */
  toPerp: boolean;
}

export interface Hip3CollateralTransferResult {
  success: boolean;
  error?: string;
  txHash?: Hex;
}

export interface Hip3DexBalance {
  /** DEX name (empty string for main DEX) */
  dexName: string;
  /** Available balance in this DEX */
  availableBalance: string;
  /** Total balance in this DEX */
  totalBalance: string;
}
