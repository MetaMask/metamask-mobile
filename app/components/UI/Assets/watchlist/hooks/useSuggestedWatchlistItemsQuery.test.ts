import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTokenWatchlistQuery } from './useTokenWatchlistQuery';
import { useSuggestedWatchlistItemsQuery } from './useSuggestedWatchlistItemsQuery';
import {
  DEFAULT_WATCHLIST_BASE_ASSET_IDS,
  SPACEX_DEFAULT_ASSET_ID,
} from '../constants/defaultWatchlistTokens';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useTokenWatchlistQuery', () => ({
  useTokenWatchlistQuery: jest.fn(),
}));

jest.mock('../utils/defaultWatchlistGeo', () => ({
  isSpaceXDefaultEligible: jest.fn(),
  getDefaultWatchlistAssetIds: jest.fn(),
}));

import {
  getDefaultWatchlistAssetIds,
  isSpaceXDefaultEligible,
} from '../utils/defaultWatchlistGeo';

const mockedUseSelector = useSelector as unknown as jest.Mock;
const mockedUseTokenWatchlistQuery =
  useTokenWatchlistQuery as jest.MockedFunction<typeof useTokenWatchlistQuery>;
const mockedIsSpaceXDefaultEligible =
  isSpaceXDefaultEligible as jest.MockedFunction<
    typeof isSpaceXDefaultEligible
  >;
const mockedGetDefaultWatchlistAssetIds =
  getDefaultWatchlistAssetIds as jest.MockedFunction<
    typeof getDefaultWatchlistAssetIds
  >;

describe('useSuggestedWatchlistItemsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSelector.mockReturnValue('DE');
    mockedIsSpaceXDefaultEligible.mockReturnValue(true);
    mockedGetDefaultWatchlistAssetIds.mockReturnValue([
      ...DEFAULT_WATCHLIST_BASE_ASSET_IDS,
      SPACEX_DEFAULT_ASSET_ID,
    ]);
  });

  it('delegates to useTokenWatchlistQuery with geo-aware suggested IDs', () => {
    const stubResult = { data: undefined, isSuccess: false };
    mockedUseTokenWatchlistQuery.mockReturnValue(
      stubResult as unknown as ReturnType<typeof useTokenWatchlistQuery>,
    );

    const { result } = renderHook(() => useSuggestedWatchlistItemsQuery());

    expect(mockedGetDefaultWatchlistAssetIds).toHaveBeenCalledWith('DE');
    expect(mockedUseTokenWatchlistQuery).toHaveBeenCalledWith({
      suggestedTokens: [
        ...DEFAULT_WATCHLIST_BASE_ASSET_IDS,
        SPACEX_DEFAULT_ASSET_ID,
      ],
      suggestedIncludeSpaceX: true,
    });
    expect(result.current).toBe(stubResult);
  });

  it('passes suggestedIncludeSpaceX false when SpaceX is not eligible', () => {
    mockedUseSelector.mockReturnValue('US');
    mockedIsSpaceXDefaultEligible.mockReturnValue(false);
    mockedGetDefaultWatchlistAssetIds.mockReturnValue(
      DEFAULT_WATCHLIST_BASE_ASSET_IDS,
    );
    mockedUseTokenWatchlistQuery.mockReturnValue(
      {} as ReturnType<typeof useTokenWatchlistQuery>,
    );

    renderHook(() => useSuggestedWatchlistItemsQuery());

    expect(mockedUseTokenWatchlistQuery).toHaveBeenCalledWith({
      suggestedTokens: DEFAULT_WATCHLIST_BASE_ASSET_IDS,
      suggestedIncludeSpaceX: false,
    });
  });
});
