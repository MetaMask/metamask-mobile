import type { QuoteTokensResponse } from '@metamask/social-controllers';
import type { CaipChainId } from '@metamask/utils';
import ReactQueryService from '../../../../core/ReactQueryService';
import {
  isUnsupportedPostTradeAsset,
  QUOTE_TOKENS_QUERY_KEY,
} from './quoteTokens';

jest.mock('../../../../core/ReactQueryService', () => {
  const { QueryClient } = jest.requireActual('@tanstack/react-query');
  return { __esModule: true, default: { queryClient: new QueryClient() } };
});

const BASE = 'eip155:8453';
const HYPEREVM = 'eip155:999';
const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_WETH = '0x4200000000000000000000000000000000000006';
const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const WRAPPED_SOL = 'So11111111111111111111111111111111111111112';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const BASE_TOKEN = '0x1234567890123456789012345678901234567890';
const SOLANA_TOKEN = '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr';

const quoteTokens: QuoteTokensResponse = {
  natives: [
    `${BASE}/erc20:${BASE_WETH}`,
    `${BASE}/slip44:60`,
    `${HYPEREVM}/slip44:60`,
    `${SOLANA}/slip44:501`,
  ],
  stablecoins: [
    `${BASE}/erc20:${BASE_USDC.toLowerCase()}`,
    `${SOLANA}/token:${SOLANA_USDC}`,
  ],
};

const setQuoteTokens = (data: QuoteTokensResponse) => {
  ReactQueryService.queryClient.setQueryData(QUOTE_TOKENS_QUERY_KEY, data);
};

describe('isUnsupportedPostTradeAsset', () => {
  afterEach(() => {
    ReactQueryService.queryClient.clear();
  });

  it('returns false while the quote-token list is not loaded', () => {
    expect(isUnsupportedPostTradeAsset(BASE_USDC, BASE)).toBe(false);
  });

  it.each<[string, string, CaipChainId]>([
    ['EVM stablecoin address', BASE_USDC, BASE],
    ['EVM stablecoin CAIP-19 id', `${BASE}/erc20:${BASE_USDC}`, BASE],
    ['EVM wrapped native address', BASE_WETH, BASE],
    ['EVM zero address', ZERO_ADDRESS, BASE],
    ['EVM zero address CAIP-19 id', `${BASE}/erc20:${ZERO_ADDRESS}`, BASE],
    ['EVM native CAIP-19 id', `${BASE}/slip44:60`, BASE],
    ['native with a different slip44 than social-api', ZERO_ADDRESS, HYPEREVM],
    ['Solana stablecoin mint', SOLANA_USDC, SOLANA],
    ['Solana stablecoin CAIP-19 id', `${SOLANA}/token:${SOLANA_USDC}`, SOLANA],
    ['Solana stablecoin with storage prefix', `solana:${SOLANA_USDC}`, SOLANA],
    ['wrapped SOL mint', WRAPPED_SOL, SOLANA],
    ['wrapped SOL CAIP-19 id', `${SOLANA}/token:${WRAPPED_SOL}`, SOLANA],
    ['wrapped SOL with storage prefix', `solana:${WRAPPED_SOL}`, SOLANA],
    ['Solana native CAIP-19 id', `${SOLANA}/slip44:501`, SOLANA],
    ['Solana native zero address', ZERO_ADDRESS, SOLANA],
  ])('returns true for %s', (_, tokenAddress, chain) => {
    setQuoteTokens(quoteTokens);

    expect(isUnsupportedPostTradeAsset(tokenAddress, chain)).toBe(true);
  });

  it.each<[string, string, CaipChainId]>([
    ['EVM token address', BASE_TOKEN, BASE],
    ['EVM token CAIP-19 id', `${BASE}/erc20:${BASE_TOKEN}`, BASE],
    ['quote token address on another chain', BASE_USDC, 'eip155:1'],
    [
      'quote token CAIP-19 id on another chain',
      `eip155:1/erc20:${BASE_USDC}`,
      BASE,
    ],
    ['native on a chain without a listed native', ZERO_ADDRESS, 'eip155:1'],
    ['Solana token mint', SOLANA_TOKEN, SOLANA],
    ['Solana token CAIP-19 id', `${SOLANA}/token:${SOLANA_TOKEN}`, SOLANA],
    [
      'Solana stablecoin mint in another case',
      SOLANA_USDC.toLowerCase(),
      SOLANA,
    ],
    [
      'token whose asset id cannot be built',
      'not-an-address',
      'bip122:000000000019d6689c085ae165831e93',
    ],
  ])('returns false for %s', (_, tokenAddress, chain) => {
    setQuoteTokens(quoteTokens);

    expect(isUnsupportedPostTradeAsset(tokenAddress, chain)).toBe(false);
  });
});
