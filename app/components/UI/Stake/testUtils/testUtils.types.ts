import { CHAIN_IDS } from '@metamask/transaction-controller';

export interface CreateMockTokenOptions {
  chainId: (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];
  name: string;
  symbol: string;
  address?: string;
  ticker?: string;
  decimals?: number;
  isStaked?: boolean;
}

export enum TOKENS_WITH_DEFAULT_OPTIONS {
  ETH = 'ETH',
  STAKED_ETH = 'STAKED_ETH',
  USDT = 'USDT',
  USDC = 'USDC',
  DAI = 'DAI',
  LINK = 'LINK',
  MATIC = 'MATIC',
}
