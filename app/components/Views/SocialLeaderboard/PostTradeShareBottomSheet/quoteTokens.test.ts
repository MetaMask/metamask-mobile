import ReactQueryService from '../../../../core/ReactQueryService';
import {
  isUnsupportedPostTradeAsset,
  QUOTE_TOKENS_QUERY_KEY,
  toPositionAssetId,
  type QuoteTokensResponse,
} from './quoteTokens';

jest.mock('../../../../core/ReactQueryService', () => {
  const { QueryClient } = jest.requireActual('@tanstack/react-query');
  return { __esModule: true, default: { queryClient: new QueryClient() } };
});

const BASE = 'eip155:8453';
const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const WRAPPED_SOL = 'So11111111111111111111111111111111111111112';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const quoteTokens: QuoteTokensResponse = {
  natives: [`${BASE}/slip44:60`, `${SOLANA}/slip44:501`],
  stablecoins: [
    `${BASE}/erc20:${BASE_USDC.toLowerCase()}`,
    `${SOLANA}/token:${SOLANA_USDC}`,
  ],
};

const setQuoteTokens = (data: QuoteTokensResponse) => {
  ReactQueryService.queryClient.setQueryData(QUOTE_TOKENS_QUERY_KEY, data);
};

describe('toPositionAssetId', () => {
  it('returns the native asset id for the EVM zero address', () => {
    expect(toPositionAssetId(ZERO_ADDRESS, BASE)).toBe(`${BASE}/slip44:60`);
  });

  it('returns the Solana native asset id for wrapped SOL', () => {
    expect(toPositionAssetId(WRAPPED_SOL, SOLANA)).toBe(`${SOLANA}/slip44:501`);
  });

  it('returns an erc20 asset id for an EVM token', () => {
    expect(toPositionAssetId(BASE_USDC, BASE)).toBe(
      `${BASE}/erc20:${BASE_USDC}`,
    );
  });

  it('returns undefined for a native on a chain without a known native asset', () => {
    expect(toPositionAssetId(ZERO_ADDRESS, 'eip155:999999')).toBeUndefined();
  });
});

describe('isUnsupportedPostTradeAsset', () => {
  afterEach(() => {
    ReactQueryService.queryClient.clear();
  });

  it('returns false while the quote-token list is not loaded', () => {
    expect(isUnsupportedPostTradeAsset(BASE_USDC, BASE)).toBe(false);
  });

  it('returns true for an EVM stablecoin regardless of address case', () => {
    setQuoteTokens(quoteTokens);

    expect(isUnsupportedPostTradeAsset(BASE_USDC, BASE)).toBe(true);
  });

  it('returns true for a Solana stablecoin', () => {
    setQuoteTokens(quoteTokens);

    expect(isUnsupportedPostTradeAsset(SOLANA_USDC, SOLANA)).toBe(true);
  });

  it.each([
    ['the EVM zero address', ZERO_ADDRESS, BASE],
    ['wrapped SOL', WRAPPED_SOL, SOLANA],
  ] as const)('returns true for natives given as %s', (_, address, chain) => {
    setQuoteTokens(quoteTokens);

    expect(isUnsupportedPostTradeAsset(address, chain)).toBe(true);
  });

  it('returns false for a token that is not a quote token', () => {
    setQuoteTokens(quoteTokens);

    expect(
      isUnsupportedPostTradeAsset(
        '0x1234567890123456789012345678901234567890',
        BASE,
      ),
    ).toBe(false);
  });

  it('returns false for a quote token address on another chain', () => {
    setQuoteTokens(quoteTokens);

    expect(isUnsupportedPostTradeAsset(BASE_USDC, 'eip155:1')).toBe(false);
  });

  it('returns false when the position asset id cannot be built', () => {
    setQuoteTokens(quoteTokens);

    expect(isUnsupportedPostTradeAsset(ZERO_ADDRESS, 'eip155:999999')).toBe(
      false,
    );
  });
});
