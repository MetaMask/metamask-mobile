import { ContractConfig, RoundConfig, TickSize } from './types';

export const POLYMARKET_PROVIDER_ID = 'polymarket';

export const POLYMARKET_TERMS_URL = 'https://polymarket.com/tos';

/**
 * Default slippage for market orders.
 */
export const SLIPPAGE_BUY = 0.03; // 3%
export const SLIPPAGE_SELL = 0.05; // 5%
// BUY is floored at maxAmountSpent + tickSize. SELL has no floor — user accepts up to 99% less USDC.
export const SLIPPAGE_BEST_AVAILABLE = 0.99; // 99%

export const ORDER_RATE_LIMIT_MS = 5000;

export const MIN_COLLATERAL_BALANCE_FOR_CLAIM = 0.5;

export const POLYGON_MAINNET_CHAIN_ID = 137;
export const POLYGON_MAINNET_CAIP_CHAIN_ID =
  `eip155:${POLYGON_MAINNET_CHAIN_ID}` as const;

export const COLLATERAL_TOKEN_DECIMALS = 6;
export const CONDITIONAL_TOKEN_DECIMALS = 6;

export const HASH_ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

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

/**
 * Gas limit for the Safe execTransaction call used during withdrawals.
 * The actual execution uses ~93k gas; includes a 30% buffer.
 */
export const SAFE_EXEC_GAS_LIMIT = 121000;

export const MATIC_CONTRACTS: ContractConfig = {
  exchange: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
  negRiskAdapter: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
  negRiskExchange: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
  collateral: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  conditionalTokens: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
};

export const MATIC_CONTRACTS_V2: ContractConfig = {
  exchange: '0xE111180000d2663C0091e4f400237545B87B996B',
  negRiskAdapter: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
  negRiskExchange: '0xe2222d279d744050d28e00520010520000310F59',
  collateral: '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB',
  conditionalTokens: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
};

export const USDC_E_ADDRESS = MATIC_CONTRACTS.collateral;

export const COLLATERAL_ONRAMP_ADDRESS =
  '0x93070a847efEf7F70739046A929D47a521F5B8ee';

export const COLLATERAL_OFFRAMP_ADDRESS =
  '0x2957922Eb93258b93368531d39fAcCA3B4dC5854';

export const CTF_COLLATERAL_ADAPTER_ADDRESS =
  '0xADa100874d00e3331D00F2007a9c336a65009718';

export const NEG_RISK_CTF_COLLATERAL_ADAPTER_ADDRESS =
  '0xAdA200001000ef00D07553cEE7006808F895c6F1';

export const POLYGON_USDC_CAIP_ASSET_ID =
  `${POLYGON_MAINNET_CAIP_CHAIN_ID}/erc20:${MATIC_CONTRACTS.collateral}` as const;

export const SPORTS_MARKET_TYPE_TO_GROUP: Record<string, string> = {
  first_half_moneyline: 'first_half',
  first_half_spreads: 'first_half',
  first_half_totals: 'first_half',
  team_totals: 'team_totals',
  anytime_touchdowns: 'touchdowns',
  first_touchdowns: 'touchdowns',
  rushing_yards: 'rushing',
  receiving_yards: 'receiving',
  points: 'points',
  assists: 'assists',
  rebounds: 'rebounds',
  soccer_anytime_goalscorer: 'goalscorers',
  soccer_exact_score: 'exact_score',
  soccer_halftime_result: 'halftime',
  total_corners: 'corners',
};

export const GROUP_ORDER: string[] = [
  'game_lines',
  'first_half',
  'team_totals',
  'touchdowns',
  'rushing',
  'receiving',
  'points',
  'assists',
  'rebounds',
  'goalscorers',
  'exact_score',
  'halftime',
  'corners',
];

export const DEFAULT_GROUP_KEY = 'game_lines';

export const SPORTS_MARKET_TYPE_PRIORITIES: Record<string, number> = {
  moneyline: 0,
  spreads: 1,
  totals: 2,
};
