import type { V6BalanceItem } from '@metamask/core-backend';

/**
 * Live v6 rows include `securityResultType` even though
 * `@metamask/core-backend` `V6BalanceItem` does not declare it yet.
 */
export type OwnedTokenBalanceItem = V6BalanceItem & {
  securityResultType?: string;
};

export type OwnedTokenCategory = 'hidden' | 'undetected';

export type OwnedTokenSpamTier =
  | 'verified'
  | 'unknown'
  | 'warning'
  | 'malicious';

export type OwnedTokenFilter = 'all' | OwnedTokenCategory;

export interface OwnedTokenAccount {
  id: string;
  address: string;
  scopes: readonly string[];
  name: string;
}

export interface OwnedTokenAccountTarget {
  caipAccountId: string;
  internalAccountId: string;
  chainId: string;
  accountName: string;
}

export interface WalletAssetSnapshot {
  assetsInfo?: Record<string, unknown>;
  customAssets?: Record<string, readonly string[]>;
  assetsBalance?: Record<string, Record<string, unknown>>;
  assetPreferences?: Record<string, { hidden?: boolean } | undefined>;
  ignoredAssetsByAccount?: Record<string, readonly string[]>;
}

export interface ClassifiedHolding {
  rowKey: string;
  caipAccountId: string;
  internalAccountId: string;
  accountName: string;
  assetId: string;
  comparableKey: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: string;
  assetReference: string;
  category: OwnedTokenCategory;
  spamTier: OwnedTokenSpamTier;
  readableAmount: string;
  /** Decimal fiat string in the selected currency, or null when price is missing. */
  fiatValue: string | null;
  unhideAssetId?: string;
  selectable: boolean;
  siblingCount: number;
}
