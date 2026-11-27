const mockScrollToOffset = jest.fn();
const mockGetFirstItemOffset = jest.fn(() => 100);
const mockGetAbsoluteLastScrollOffset = jest.fn(() => 0);
jest.mock('@shopify/flash-list', () => {
  const ReactActual = jest.requireActual('react');
  const { FlatList } = jest.requireActual('react-native');
  return {
    FlashList: ReactActual.forwardRef(
      (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        ReactActual.useImperativeHandle(ref, () => ({
          scrollToOffset: mockScrollToOffset,
          getFirstItemOffset: mockGetFirstItemOffset,
          getAbsoluteLastScrollOffset: mockGetAbsoluteLastScrollOffset,
        }));
        return ReactActual.createElement(FlatList, props);
      },
    ),
  };
});

jest.mock('../../search/analytics', () => ({
  trackExploreInteracted: jest.fn(),
  trackExploreSectionSeeAll: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const twFn = () => ({});
  twFn.style = () => ({});
  const actual = jest.requireActual('@metamask/design-system-twrnc-preset');
  return { ...actual, useTailwind: () => twFn };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual, Icon: () => null };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

import React, { useState } from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { TrendingAsset } from '@metamask/assets-controllers';
import Routes from '../../../../../constants/navigation/Routes';
import { selectTokenWatchlistEnabled } from '../../../../UI/Assets/selectors/featureFlags';
import {
  trackExploreInteracted,
  trackExploreSectionSeeAll,
} from '../../search/analytics';
import {
  useCryptoPillFeed,
  type CryptoPillFeedResult,
} from './useCryptoPillFeed';
import type { CryptoPillKey } from './cryptoPillConfig';
import CryptoTokensPillBlock, {
  type CryptoTokensPillBlockProps,
} from './CryptoTokensPillBlock';

jest.mock('./TokenRowItem', () => ({
  TokenRowItem: ({
    token,
    onCardPress,
  }: {
    token: { symbol: string };
    onCardPress?: () => void;
  }) => {
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return (
      <TouchableOpacity
        testID={`token-row-${token.symbol}`}
        onPress={onCardPress}
      >
        <Text>{token.symbol}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock(
  '../../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return function MockTrendingTokensSkeleton() {
      return (
        <View>
          <Text testID="trending-tokens-skeleton">skeleton</Text>
        </View>
      );
    };
  },
);

jest.mock(
  '../../../Homepage/Sections/Watchlist/components/WatchlistEmptyFallback',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return function MockWatchlistEmptyFallback() {
      return (
        <View>
          <Text testID="watchlist-empty-fallback">empty</Text>
        </View>
      );
    };
  },
);

jest.mock('./useCryptoPillFeed', () => {
  const actual = jest.requireActual('./useCryptoPillFeed');
  return {
    ...actual,
    useCryptoPillFeed: jest.fn(),
  };
});

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCryptoPillFeed = useCryptoPillFeed as jest.MockedFunction<
  typeof useCryptoPillFeed
>;

const mockNavigate = jest.fn();

const makeToken = (symbol: string): TrendingAsset =>
  ({
    assetId: `eip155:1/erc20:0x${symbol.toLowerCase()}`,
    name: `${symbol} Token`,
    symbol,
    decimals: 18,
  }) as TrendingAsset;

const makeResults = (
  overrides: Record<string, Partial<CryptoPillFeedResult>> = {},
): Record<string, CryptoPillFeedResult> => ({
  watchlist: {
    data: [makeToken('WOLD'), makeToken('WNEW')],
    isLoading: false,
    isError: false,
  },
  trending: {
    data: [makeToken('BTC'), makeToken('ETH')],
    isLoading: false,
    isError: false,
  },
  gainers: { data: [makeToken('SOL')], isLoading: false, isError: false },
  losers: { data: [makeToken('DOGE')], isLoading: false, isError: false },
  most_traded: { data: [makeToken('XRP')], isLoading: false, isError: false },
  robinhood: { data: [makeToken('MOW')], isLoading: false, isError: false },
  ...overrides,
});

const DEFAULT_PROPS: Omit<
  CryptoTokensPillBlockProps,
  'activePillKey' | 'onActivePillChange'
> = {
  title: 'Tokens',
  tabName: 'Crypto' as const,
  headerTestID: 'section-header-view-all-tokens',
  idPrefix: 'tokens',
  testIdPrefix: 'crypto-tokens',
  listTestId: 'crypto-tokens-list',
  refreshing: false,
  onRefresh: jest.fn(),
};

let mockIsWatchlistEnabled = true;

const arrange = (results: Record<string, CryptoPillFeedResult>) => {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectTokenWatchlistEnabled) {
      return mockIsWatchlistEnabled;
    }
    return undefined;
  });
  mockUseCryptoPillFeed.mockReturnValue({ results });
};

const CryptoPillBlockHarness: React.FC<{
  blockProps: Omit<
    CryptoTokensPillBlockProps,
    'activePillKey' | 'onActivePillChange'
  >;
  initialActivePillKey?: CryptoPillKey;
}> = ({ blockProps, initialActivePillKey }) => {
  const [activePillKey, setActivePillKey] = useState<CryptoPillKey | undefined>(
    initialActivePillKey,
  );
  return (
    <CryptoTokensPillBlock
      {...blockProps}
      activePillKey={activePillKey}
      onActivePillChange={setActivePillKey}
    />
  );
};

const renderBlock = (
  results = makeResults(),
  props: Omit<
    CryptoTokensPillBlockProps,
    'activePillKey' | 'onActivePillChange'
  > = DEFAULT_PROPS,
  initialActivePillKey?: CryptoPillKey,
) => {
  arrange(results);
  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
  });
  return render(
    <CryptoPillBlockHarness
      blockProps={props}
      initialActivePillKey={initialActivePillKey}
    />,
  );
};

describe('CryptoTokensPillBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsWatchlistEnabled = true;
    mockNavigate.mockClear();
  });

  describe('rendering', () => {
    it('renders the section title', () => {
      const { getByText } = renderBlock();
      expect(getByText('Tokens')).toBeOnTheScreen();
    });

    it('renders the watchlist pill first but opens on the trending pill', () => {
      const { getByTestId, queryByTestId } = renderBlock();

      expect(queryByTestId('crypto-tokens-pill-watchlist')).toBeOnTheScreen();
      expect(getByTestId('crypto-tokens-pill-watchlist')).toHaveProp(
        'accessibilityLabel',
        'perps.watchlist.filter_badge_label',
      );
      expect(getByTestId('crypto-tokens-pill-watchlist')).not.toHaveTextContent(
        'perps.watchlist.filter_badge_label',
      );
      expect(getByTestId('crypto-tokens-pill-trending')).toHaveTextContent(
        'trending.crypto_pills.trending',
      );
      expect(queryByTestId('token-row-BTC')).toBeOnTheScreen();
      expect(queryByTestId('token-row-WNEW')).not.toBeOnTheScreen();
    });

    it('renders every non-empty pill except those below minItems', () => {
      const { getByTestId, queryByTestId } = renderBlock();

      expect(getByTestId('crypto-tokens-pill-trending')).toBeOnTheScreen();
      expect(getByTestId('crypto-tokens-pill-gainers')).toBeOnTheScreen();
      expect(getByTestId('crypto-tokens-pill-most_traded')).toBeOnTheScreen();
      expect(getByTestId('crypto-tokens-pill-robinhood')).toBeOnTheScreen();
      expect(queryByTestId('crypto-tokens-pill-losers')).not.toBeOnTheScreen();
    });

    it('keeps the losers pill when it has at least 3 items', () => {
      const results = makeResults({
        losers: {
          data: [makeToken('A'), makeToken('B'), makeToken('C')],
          isLoading: false,
          isError: false,
        },
      });
      const { getByTestId } = renderBlock(results);

      expect(getByTestId('crypto-tokens-pill-losers')).toBeOnTheScreen();
    });

    it('keeps pills that have not loaded yet visible', () => {
      const results = makeResults({
        losers: { data: undefined, isLoading: true, isError: false },
      });
      const { getByTestId } = renderBlock(results);

      expect(getByTestId('crypto-tokens-pill-losers')).toBeOnTheScreen();
    });

    it('hides an errored pill', () => {
      const results = makeResults({
        trending: { data: undefined, isLoading: false, isError: true },
      });
      const { queryByTestId } = renderBlock(results);

      expect(
        queryByTestId('crypto-tokens-pill-trending'),
      ).not.toBeOnTheScreen();
    });

    it('keeps a pill visible with its cached data when a background refetch fails', () => {
      const results = makeResults({
        trending: { data: [makeToken('BTC')], isLoading: false, isError: true },
      });
      const { getByTestId } = renderBlock(results);

      expect(getByTestId('crypto-tokens-pill-trending')).toBeOnTheScreen();
    });

    it('resets the parent selection when the selected pill becomes hidden', () => {
      const { getByTestId, queryByTestId, rerender } = renderBlock();

      act(() => {
        fireEvent.press(getByTestId('crypto-tokens-pill-gainers'));
      });
      expect(getByTestId('token-row-SOL')).toBeOnTheScreen();

      const errored = makeResults({
        gainers: { data: undefined, isLoading: false, isError: true },
      });
      arrange(errored);
      rerender(<CryptoPillBlockHarness blockProps={DEFAULT_PROPS} />);

      expect(queryByTestId('token-row-SOL')).not.toBeOnTheScreen();
      expect(getByTestId('token-row-BTC')).toBeOnTheScreen();
    });

    it('resets the selection to a pill with content, skipping an empty watchlist', () => {
      const emptyWatchlist = makeResults({
        watchlist: { data: [], isLoading: false, isError: false },
      });
      const { getByTestId, queryByTestId, rerender } =
        renderBlock(emptyWatchlist);

      act(() => {
        fireEvent.press(getByTestId('crypto-tokens-pill-gainers'));
      });
      expect(getByTestId('token-row-SOL')).toBeOnTheScreen();

      const errored = makeResults({
        watchlist: { data: [], isLoading: false, isError: false },
        gainers: { data: undefined, isLoading: false, isError: true },
      });
      arrange(errored);
      rerender(<CryptoPillBlockHarness blockProps={DEFAULT_PROPS} />);

      expect(getByTestId('token-row-BTC')).toBeOnTheScreen();
      expect(queryByTestId('crypto-tokens-pill-gainers')).not.toBeOnTheScreen();
    });
  });

  describe('watchlist flag gating', () => {
    it('drops the watchlist pill and defaults to trending when the flag is off', () => {
      mockIsWatchlistEnabled = false;
      const { queryByTestId, getByTestId } = renderBlock();

      expect(
        queryByTestId('crypto-tokens-pill-watchlist'),
      ).not.toBeOnTheScreen();
      expect(getByTestId('token-row-BTC')).toBeOnTheScreen();
    });
  });

  describe('active pill fallback', () => {
    it('falls back to the first visible pill when the default pill is empty', () => {
      mockIsWatchlistEnabled = false;
      const results = makeResults({
        trending: { data: [], isLoading: false, isError: false },
      });
      const { getByTestId } = renderBlock(results);

      expect(getByTestId('token-row-SOL')).toBeOnTheScreen();
    });
  });

  describe('pill switching', () => {
    it('renders the selected pill items', () => {
      const { getByTestId, queryByTestId } = renderBlock();

      act(() => {
        fireEvent.press(getByTestId('crypto-tokens-pill-gainers'));
      });

      expect(getByTestId('token-row-SOL')).toBeOnTheScreen();
      expect(queryByTestId('token-row-WNEW')).not.toBeOnTheScreen();
    });
  });

  describe('full list with sticky pills', () => {
    it('renders every token of the active pill without a row cap', () => {
      const results = makeResults({
        trending: {
          data: ['A', 'B', 'C', 'D', 'E'].map((symbol) => makeToken(symbol)),
          isLoading: false,
          isError: false,
        },
      });
      const { getByTestId } = renderBlock(results);

      ['A', 'B', 'C', 'D', 'E'].forEach((symbol) => {
        expect(getByTestId(`token-row-${symbol}`)).toBeOnTheScreen();
      });
    });

    it('pins the pill row as the first sticky row below the list header', () => {
      const { getByTestId } = renderBlock();

      expect(getByTestId('crypto-tokens-list')).toHaveProp(
        'stickyHeaderIndices',
        [0],
      );
      expect(getByTestId('crypto-tokens-sticky-header')).toBeOnTheScreen();
    });

    it('scrolls back to the pinned pills on a pill change once scrolled past the header', () => {
      mockGetAbsoluteLastScrollOffset.mockReturnValue(500);
      const { getByTestId } = renderBlock();

      act(() => {
        fireEvent.press(getByTestId('crypto-tokens-pill-gainers'));
      });

      expect(mockScrollToOffset).toHaveBeenCalledWith({
        offset: 100,
        animated: true,
      });
      mockGetAbsoluteLastScrollOffset.mockReturnValue(0);
    });
  });

  describe('sort row', () => {
    const volumeResults = () =>
      makeResults({
        trending: {
          data: [
            { ...makeToken('LOW'), aggregatedUsdVolume: 10 },
            { ...makeToken('HIGH'), aggregatedUsdVolume: 300 },
            { ...makeToken('MID'), aggregatedUsdVolume: 20 },
          ] as TrendingAsset[],
          isLoading: false,
          isError: false,
        },
      });

    const rowSymbols = (
      getAllByTestId: (id: RegExp) => { props: Record<string, unknown> }[],
    ) =>
      getAllByTestId(/^token-row-/).map((el) =>
        String(el.props.testID).replace('token-row-', ''),
      );

    it('shows the token count and sort button on the trending pill', () => {
      const { getByTestId } = renderBlock(volumeResults());

      expect(getByTestId('crypto-tokens-count')).toHaveTextContent(
        'trending.crypto_token_count_plural',
      );
      expect(getByTestId('crypto-tokens-sort-button')).toBeOnTheScreen();
    });

    it.each(['gainers', 'losers'] as const)(
      'hides the sort row on the %s pill',
      (pill) => {
        const threeTokens = {
          data: ['A', 'B', 'C'].map((symbol) => makeToken(symbol)),
          isLoading: false,
          isError: false,
        };
        const { getByTestId, queryByTestId } = renderBlock(
          makeResults({ gainers: threeTokens, losers: threeTokens }),
          DEFAULT_PROPS,
          pill,
        );

        expect(getByTestId('token-row-A')).toBeOnTheScreen();
        expect(queryByTestId('crypto-tokens-sort-row')).not.toBeOnTheScreen();
      },
    );

    it('sorts the active pill rows client-side from the sort sheet', async () => {
      const { getByTestId, getAllByTestId, queryByTestId } =
        renderBlock(volumeResults());
      expect(rowSymbols(getAllByTestId)).toEqual(['LOW', 'HIGH', 'MID']);

      fireEvent.press(getByTestId('crypto-tokens-sort-button'));
      fireEvent.press(getByTestId('crypto-tokens-sort-sheet-option-volume'));
      fireEvent.press(getByTestId('crypto-tokens-sort-sheet-apply'));

      await waitFor(() =>
        expect(queryByTestId('crypto-tokens-sort-sheet')).not.toBeOnTheScreen(),
      );
      expect(rowSymbols(getAllByTestId)).toEqual(['HIGH', 'MID', 'LOW']);
      expect(getByTestId('crypto-tokens-sort-button')).toHaveTextContent(
        'perps.sort.volume',
      );
    });
  });

  describe('loading state', () => {
    it('shows skeletons while the active pill is loading', () => {
      const results = makeResults({
        trending: { data: undefined, isLoading: true, isError: false },
      });
      const { getAllByTestId } = renderBlock(results);

      expect(getAllByTestId('trending-tokens-skeleton').length).toBeGreaterThan(
        0,
      );
    });
  });

  describe('watchlist empty state', () => {
    it('defaults to the trending pill instead of the empty watchlist fallback', () => {
      const results = makeResults({
        watchlist: { data: [], isLoading: false, isError: false },
      });
      const { getByTestId, queryByTestId } = renderBlock(results);

      expect(queryByTestId('watchlist-empty-fallback')).not.toBeOnTheScreen();
      expect(getByTestId('crypto-tokens-list')).toBeOnTheScreen();
      expect(getByTestId('token-row-BTC')).toBeOnTheScreen();
      expect(getByTestId('crypto-tokens-pill-watchlist')).toBeOnTheScreen();
    });

    it('renders the watchlist empty fallback when the empty watchlist is user-selected', () => {
      const results = makeResults({
        watchlist: { data: [], isLoading: false, isError: false },
      });
      const { getByTestId, queryByTestId } = renderBlock(
        results,
        DEFAULT_PROPS,
        'watchlist',
      );

      expect(getByTestId('watchlist-empty-fallback')).toBeOnTheScreen();
      expect(queryByTestId('token-row-BTC')).not.toBeOnTheScreen();
    });

    it('hides the watchlist pill and falls back instead of showing the empty state on error', () => {
      const results = makeResults({
        watchlist: { data: undefined, isLoading: false, isError: true },
      });
      const { getByTestId, queryByTestId } = renderBlock(results);

      expect(
        queryByTestId('crypto-tokens-pill-watchlist'),
      ).not.toBeOnTheScreen();
      expect(queryByTestId('watchlist-empty-fallback')).not.toBeOnTheScreen();
      expect(getByTestId('token-row-BTC')).toBeOnTheScreen();
    });
  });

  describe('section visibility', () => {
    it('renders nothing when every pill is empty and the flag is off', () => {
      mockIsWatchlistEnabled = false;
      const results = makeResults({
        trending: { data: [], isLoading: false, isError: false },
        gainers: { data: [], isLoading: false, isError: false },
        losers: { data: [], isLoading: false, isError: false },
        most_traded: { data: [], isLoading: false, isError: false },
        robinhood: { data: [], isLoading: false, isError: false },
      });
      const { queryByTestId } = renderBlock(results);

      expect(queryByTestId('crypto-tokens')).not.toBeOnTheScreen();
    });
  });

  describe('analytics and navigation', () => {
    it('fires section_item_tapped with the active pill section name', () => {
      const { getByTestId } = renderBlock();
      const mockTrack = trackExploreInteracted as jest.Mock;

      fireEvent.press(getByTestId('token-row-BTC'));

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: 'section_item_tapped',
          tab_name: 'Crypto',
          section_name: 'tokens_trending',
          asset_type: 'token',
          token_symbol: 'BTC',
        }),
      );
    });

    it('uses the selected pill section name after switching pills', () => {
      const { getByTestId } = renderBlock();
      const mockTrack = trackExploreInteracted as jest.Mock;

      act(() => {
        fireEvent.press(getByTestId('crypto-tokens-pill-robinhood'));
      });
      fireEvent.press(getByTestId('token-row-MOW'));

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          section_name: 'tokens_robinhood',
        }),
      );
    });

    it('navigates to the trending full view when see-all is pressed', () => {
      const { getByTestId } = renderBlock();

      fireEvent.press(getByTestId('section-header-view-all-tokens'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      );
      expect(trackExploreSectionSeeAll).toHaveBeenCalledWith({
        tabName: 'Crypto',
        sectionName: 'tokens_trending',
      });
    });
  });
});
