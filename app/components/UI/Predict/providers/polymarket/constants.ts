import { ContractConfig, RoundConfig, TickSize } from './types';

export const POLYGON_MAINNET_CHAIN_ID = 137;

export const COLLATERAL_TOKEN_DECIMALS = 6;
export const CONDITIONAL_TOKEN_DECIMALS = 6;

export const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
];

export const ClobAuthDomain = {
  ClobAuth: [
    { name: 'address', type: 'address' },
    { name: 'timestamp', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'message', type: 'string' },
  ],
};

export const MSG_TO_SIGN =
  'This message attests that I control the given wallet';

export const ROUNDING_CONFIG: Record<TickSize, RoundConfig> = {
  '0.1': {
    price: 1,
    size: 2,
    amount: 3,
  },
  '0.01': {
    price: 2,
    size: 2,
    amount: 4,
  },
  '0.001': {
    price: 3,
    size: 2,
    amount: 5,
  },
  '0.0001': {
    price: 4,
    size: 2,
    amount: 6,
  },
};

export const MATIC_CONTRACTS: ContractConfig = {
  exchange: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
  negRiskAdapter: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
  negRiskExchange: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
  collateral: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  conditionalTokens: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
};
