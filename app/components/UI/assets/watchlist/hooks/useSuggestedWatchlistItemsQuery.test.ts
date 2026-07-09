import { useTokenWatchlistQuery } from './useTokenWatchlistQuery';
import {
  SUGGESTED_WATCHLIST_ASSET_IDS,
  useSuggestedWatchlistItemsQuery,
} from './useSuggestedWatchlistItemsQuery';

jest.mock('./useTokenWatchlistQuery', () => ({
  useTokenWatchlistQuery: jest.fn(),
}));

const mockedUseTokenWatchlistQuery =
  useTokenWatchlistQuery as jest.MockedFunction<typeof useTokenWatchlistQuery>;

describe('useSuggestedWatchlistItemsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the three curated mainnet native asset IDs (ETH/BTC/SOL)', () => {
    expect(SUGGESTED_WATCHLIST_ASSET_IDS).toStrictEqual([
      'eip155:1/slip44:60',
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    ]);
  });

  it('delegates to useTokenWatchlistQuery with the curated suggested IDs', () => {
    const stubResult = { data: undefined, isSuccess: false };
    mockedUseTokenWatchlistQuery.mockReturnValue(
      stubResult as unknown as ReturnType<typeof useTokenWatchlistQuery>,
    );

    const returned = useSuggestedWatchlistItemsQuery();

    expect(mockedUseTokenWatchlistQuery).toHaveBeenCalledTimes(1);
    expect(mockedUseTokenWatchlistQuery).toHaveBeenCalledWith({
      suggestedTokens: SUGGESTED_WATCHLIST_ASSET_IDS,
    });
    expect(returned).toBe(stubResult);
  });
});
