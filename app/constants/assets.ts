import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';

// Common mixin for primary and secondary display values
export interface TokenDisplayValues {
  primary: string;
  secondary: number;
  string?: string;
}

export interface TokenBalanceValues {
  tokenFiatAmount?: number | null;
  balance?: string;
}

// Base token type with common fields
export interface BaseToken {
  address: Hex;
  symbol: string;
  image: string;
  decimals: number;
  chainId: Hex;
  isNative?: boolean;
}

// type created for non-evm tokens
export interface NonEvmBaseToken {
  address: CaipAssetType;
  symbol: string;
  image: string;
  decimals: number;
  chainId: CaipChainId;
  isNative?: boolean;
}

// Token type with optional aggregators
export type Token = (BaseToken | NonEvmBaseToken) & {
  aggregators?: string[];
  name?: string;
};

// Token with balance and optional display values
export type TokenWithBalance = Omit<BaseToken, 'chainId' | 'decimals'> &
  TokenDisplayValues &
  Omit<TokenBalanceValues, 'balance'>;

// Token display information (UI-related properties)
export type TokenDisplayInfo = TokenDisplayValues & {
  title: string;
  tokenImage: string;
  isStakeable?: boolean;
  tokenChainImage: string;
};

// Token type that includes fiat amount, balance, and display values
export type TokenWithFiatAmount = Token &
  TokenDisplayValues &
  TokenBalanceValues & {
    isStakeable?: boolean;
    title: string;
  };
