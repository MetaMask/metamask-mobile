import { Hex } from '@metamask/utils';

export const PREDICT_CURRENCY = 'usd';
export const PREDICT_MINIMUM_DEPOSIT = 0.01;

export const POLYGON_USDCE = {
  address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Hex,
  decimals: 6,
  name: 'USD Coin (PoS)',
  symbol: 'USDC.e',
};

export const POLYGON_PUSD = {
  address: '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB' as Hex,
  decimals: 6,
  name: 'Polymarket USD',
  symbol: 'pUSD',
};
