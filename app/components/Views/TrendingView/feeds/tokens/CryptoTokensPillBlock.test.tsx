/**
 * CryptoTokensPillBlock — unit tests
 *
 * Core concerns:
 * 1. Renders the title, pill row, and the active pill's items.
 * 2. Watchlist pill is flag-gated and renders its empty state.
 * 3. Pills whose loaded data is below `minItems` are hidden.
 * 4. The active pill falls back to the first visible pill.
 * 5. Skeletons while the active pill is loading.
 * 6. Analytics and navigation wiring for row taps and see-all.
 */

jest.mock('@shopify/flash-list', () => {
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return { FlashList: RN.FlatList };
});

jest.mock('../../search/analytics', () => ({
  trackExploreInteracted: jest.fn(),
  trackExploreSectionSeeAll: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const twFn = () => ({});
  twFn.style = () => ({});
  return { useTailwind: () => twFn };
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

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
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
import CryptoTokensPillBlock from './CryptoTokensPillBlock';

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

jest.mock('./useCryptoPillFeed', () => ({
  useCryptoPillFeed: jest.fn(),
}));

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
  top_gainers: { data: [makeToken('SOL')], isLoading: false, isError: false },
  top_losers: { data: [makeToken('DOGE')], isLoading: false, isError: false },
  most_traded: { data: [makeToken('XRP')], isLoading: false, isError: false },
  robinhood: { data: [makeToken('MOW')], isLoading: false, isError: false },
  ...overrides,
});

const DEFAULT_PROPS = {
  title: 'Tokens',
  refresh: { trigger: 0, silentRefresh: true },
  tabName: 'Crypto' as const,
  headerTestID: 'section-header-view-all-tokens',
  idPrefix: 'tokens',
  testIdPrefix: 'crypto-tokens',
  listTestId: 'crypto-tokens-list',
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

const renderBlock = (results = makeResults(), props = DEFAULT_PROPS) => {
  arrange(results);
  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
  } as never);
  return render(<CryptoTokensPillBlock {...props} />);
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
      expect(getByText('Tokens')).toBeTruthy();
    });

    it('renders the watchlist pill first and its items by default', () => {
      const { getByTestId, queryByTestId } = renderBlock();

      expect(queryByTestId('crypto-tokens-pill-watchlist')).toBeTruthy();
      expect(queryByTestId('token-row-WNEW')).toBeTruthy();
      expect(queryByTestId('token-row-WOLD')).toBeTruthy();
      expect(queryByTestId('token-row-BTC')).toBeNull();
    });

    it('renders every non-empty pill except those below minItems', () => {
      const { getByTestId, queryByTestId } = renderBlock();

      expect(getByTestId('crypto-tokens-pill-trending')).toBeTruthy();
      expect(getByTestId('crypto-tokens-pill-top_gainers')).toBeTruthy();
      expect(getByTestId('crypto-tokens-pill-most_traded')).toBeTruthy();
      expect(getByTestId('crypto-tokens-pill-robinhood')).toBeTruthy();
      expect(queryByTestId('crypto-tokens-pill-top_losers')).toBeNull();
    });

    it('keeps the top losers pill when it has at least 3 items', () => {
      const results = makeResults({
        top_losers: {
          data: [makeToken('A'), makeToken('B'), makeToken('C')],
          isLoading: false,
          isError: false,
        },
      });
      const { getByTestId } = renderBlock(results);

      expect(getByTestId('crypto-tokens-pill-top_losers')).toBeTruthy();
    });

    it('keeps pills that have not loaded yet visible', () => {
      const results = makeResults({
        top_losers: { data: undefined, isLoading: true, isError: false },
      });
      const { getByTestId } = renderBlock(results);

      expect(getByTestId('crypto-tokens-pill-top_losers')).toBeTruthy();
    });

    it('hides an errored pill', () => {
      const results = makeResults({
        trending: { data: undefined, isLoading: false, isError: true },
      });
      const { queryByTestId } = renderBlock(results);

      expect(queryByTestId('crypto-tokens-pill-trending')).toBeNull();
    });
  });

  describe('watchlist flag gating', () => {
    it('drops the watchlist pill and defaults to trending when the flag is off', () => {
      mockIsWatchlistEnabled = false;
      const { queryByTestId, getByTestId } = renderBlock();

      expect(queryByTestId('crypto-tokens-pill-watchlist')).toBeNull();
      expect(getByTestId('token-row-BTC')).toBeTruthy();
    });
  });

  describe('active pill fallback', () => {
    it('falls back to the first visible pill when the default pill is empty', () => {
      mockIsWatchlistEnabled = false;
      const results = makeResults({
        trending: { data: [], isLoading: false, isError: false },
      });
      const { getByTestId } = renderBlock(results);

      expect(getByTestId('token-row-SOL')).toBeTruthy();
    });
  });

  describe('pill switching', () => {
    it('renders the selected pill items', () => {
      const { getByTestId, queryByTestId } = renderBlock();

      act(() => {
        fireEvent.press(getByTestId('crypto-tokens-pill-top_gainers'));
      });

      expect(getByTestId('token-row-SOL')).toBeTruthy();
      expect(queryByTestId('token-row-WNEW')).toBeNull();
    });
  });

  describe('loading state', () => {
    it('shows skeletons while the active pill is loading', () => {
      const results = makeResults({
        watchlist: { data: undefined, isLoading: true, isError: false },
      });
      const { getAllByTestId } = renderBlock(results);

      expect(getAllByTestId('trending-tokens-skeleton').length).toBeGreaterThan(
        0,
      );
    });
  });

  describe('watchlist empty state', () => {
    it('renders the watchlist empty fallback when the watchlist has no tokens', () => {
      const results = makeResults({
        watchlist: { data: [], isLoading: false, isError: false },
      });
      const { getByTestId, queryByTestId } = renderBlock(results);

      expect(getByTestId('watchlist-empty-fallback')).toBeTruthy();
      expect(queryByTestId('crypto-tokens-list')).toBeNull();
    });

    it('hides the watchlist pill and falls back instead of showing the empty state on error', () => {
      const results = makeResults({
        watchlist: { data: undefined, isLoading: false, isError: true },
      });
      const { getByTestId, queryByTestId } = renderBlock(results);

      expect(queryByTestId('crypto-tokens-pill-watchlist')).toBeNull();
      expect(queryByTestId('watchlist-empty-fallback')).toBeNull();
      expect(getByTestId('token-row-BTC')).toBeTruthy();
    });
  });

  describe('section visibility', () => {
    it('renders nothing when every pill is empty and the flag is off', () => {
      mockIsWatchlistEnabled = false;
      const results = makeResults({
        trending: { data: [], isLoading: false, isError: false },
        top_gainers: { data: [], isLoading: false, isError: false },
        top_losers: { data: [], isLoading: false, isError: false },
        most_traded: { data: [], isLoading: false, isError: false },
        robinhood: { data: [], isLoading: false, isError: false },
      });
      const { queryByTestId } = renderBlock(results);

      expect(queryByTestId('crypto-tokens')).toBeNull();
    });
  });

  describe('analytics and navigation', () => {
    it('fires section_item_tapped with the active pill section name', () => {
      const { getByTestId } = renderBlock();
      const mockTrack = trackExploreInteracted as jest.Mock;

      fireEvent.press(getByTestId('token-row-WNEW'));

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: 'section_item_tapped',
          tab_name: 'Crypto',
          section_name: 'tokens_watchlist',
          asset_type: 'token',
          token_symbol: 'WNEW',
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
        sectionName: 'tokens_watchlist',
      });
    });
  });
});
