import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  CreateMockTokenOptions,
  TOKENS_WITH_DEFAULT_OPTIONS,
} from './testUtils.types';

export const HOLESKY_CHAIN_ID = '0x4268';

export const createMockToken = (options: CreateMockTokenOptions) => {
  const {
    chainId,
    name,
    symbol,
    address = '0xabc',
    decimals = 0,
    isStaked = false,
    ticker = '',
  } = options;

  const isETH = symbol === 'ETH' || symbol === 'Ethereum';

  const nativeChainIds = [
    CHAIN_IDS.MAINNET,
    CHAIN_IDS.SEPOLIA,
    HOLESKY_CHAIN_ID,
  ];
  const isNative = nativeChainIds.includes(chainId) && isETH;

  return {
    address,
    aggregators: [],
    balance: '',
    balanceFiat: '',
    chainId,
    decimals: decimals ?? 0,
    image: '',
    isETH,
    isNative,
    isStaked,
    logo: '',
    name,
    symbol,
    ticker: ticker ?? symbol,
  };
};

export const getCreateMockTokenOptions = (
  chainId: (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS],
  token: TOKENS_WITH_DEFAULT_OPTIONS,
) => {
  const tokenOptions: Record<
    TOKENS_WITH_DEFAULT_OPTIONS,
    Omit<CreateMockTokenOptions, 'chainId'>
  > = {
    ETH: {
      name: 'Ethereum',
      symbol: 'Ethereum',
      ticker: 'ETH',
      isStaked: false,
      decimals: 18,
    },
    STAKED_ETH: {
      name: 'Staked Ethereum',
      symbol: 'Ethereum',
      ticker: 'ETH',
      isStaked: true,
      decimals: 18,
    },
    USDC: {
      name: 'USDC',
      symbol: 'USDC',
      ticker: 'USDC',
      isStaked: false,
      decimals: 6,
    },
    USDT: {
      name: 'Tether USD',
      symbol: 'USDT',
      ticker: 'USDT',
      isStaked: false,
      decimals: 6,
    },
    DAI: {
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      ticker: 'DAI',
      isStaked: false,
      decimals: 18,
    },
    LINK: {
      name: 'Chainlink Token',
      symbol: 'LINK',
      ticker: 'LINK',
      isStaked: false,
      decimals: 18,
    },
    MATIC: {
      name: 'Matic Network Token',
      symbol: 'MATIC',
      ticker: 'MATIC',
      isStaked: false,
      decimals: 18,
    },
  };

  return {
    chainId,
    ...tokenOptions[token],
  };
};
