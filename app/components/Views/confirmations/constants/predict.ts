import { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export const PREDICT_CURRENCY = 'usd';
export const PREDICT_MINIMUM_DEPOSIT = 0.01;

export const POLYGON_USDCE = {
  address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Hex,
  decimals: 6,
  name: 'USD Coin (PoS)',
  symbol: 'USDC.e',
};

/**
 * Supported tokens for Predict withdrawals.
 * Users can withdraw to any of these token/chain combinations.
 */
export const PREDICT_WITHDRAWAL_SUPPORTED_TOKENS: {
  address: Hex;
  chainId: Hex;
  symbol: string;
  decimals: number;
}[] = [
  // Polygon USDC.e (native Predict token)
  {
    address: POLYGON_USDCE.address,
    chainId: CHAIN_IDS.POLYGON,
    symbol: POLYGON_USDCE.symbol,
    decimals: POLYGON_USDCE.decimals,
  },
  // Polygon native USDC
  {
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as Hex,
    chainId: CHAIN_IDS.POLYGON,
    symbol: 'USDC',
    decimals: 6,
  },
  // Ethereum USDC
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
    chainId: CHAIN_IDS.MAINNET,
    symbol: 'USDC',
    decimals: 6,
  },
  // Arbitrum USDC
  {
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Hex,
    chainId: CHAIN_IDS.ARBITRUM,
    symbol: 'USDC',
    decimals: 6,
  },
  // Base USDC
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Hex,
    chainId: CHAIN_IDS.BASE,
    symbol: 'USDC',
    decimals: 6,
  },
  // Optimism USDC
  {
    address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' as Hex,
    chainId: CHAIN_IDS.OPTIMISM,
    symbol: 'USDC',
    decimals: 6,
  },
];
