import React from 'react';
import { render } from '@testing-library/react-native';
import WatchlistSection from './WatchlistSection';

let mockIsWatchlistEnabled = true;

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) => {
    const { selectTokenWatchlistEnabled } = jest.requireMock(
      '../../../../UI/Assets/selectors/featureFlags',
    );
    if (selector === selectTokenWatchlistEnabled) return mockIsWatchlistEnabled;
    return undefined;
  },
}));

jest.mock('../../../../UI/Assets/selectors/featureFlags', () => ({
  selectTokenWatchlistEnabled: jest.fn(),
}));

const mockUseTokenWatchlistQuery = jest.fn();
jest.mock(
  '../../../../UI/Assets/watchlist/hooks/useTokenWatchlistQuery',
  () => ({
    useTokenWatchlistQuery: () => mockUseTokenWatchlistQuery(),
  }),
);

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(() => ({ onLayout: jest.fn() })),
  HomeSectionNames: {
    WATCHLIST: 'watchlist',
  },
}));

jest.mock('../../hooks/useSectionPerformance', () => ({
  useSectionPerformance: jest.fn(),
}));

jest.mock(
  '../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem',
  () => {
    const { Text } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const Mock = ({ token }: { token: { name: string } }) =>
      ReactActual.createElement(
        Text,
        { testID: `row-${token.name}` },
        token.name,
      );
    Mock.displayName = 'TrendingTokenRowItem';
    return {
      __esModule: true,
      default: ReactActual.memo(Mock),
    };
  },
);

jest.mock(
  '../../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const Mock = () =>
      ReactActual.createElement(View, { testID: 'trending-skeleton' });
    Mock.displayName = 'TrendingTokensSkeleton';
    return Mock;
  },
);

jest.mock(
  '../../../../UI/Trending/hooks/useTrendingTokenPress/useTrendingTokenPress',
  () => ({
    useTrendingTokenPress: () => ({ onPress: jest.fn() }),
  }),
);

jest.mock(
  '../../../../../images/watchlist-empty-dark.svg',
  () => 'WatchlistEmptyDark',
);
jest.mock(
  '../../../../../images/watchlist-empty-light.svg',
  () => 'WatchlistEmptyLight',
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  ...jest.requireActual('@metamask/design-system-twrnc-preset'),
  Theme: { Dark: 'dark', Light: 'light' },
  useTheme: () => 'light',
}));

jest.mock('../../../Wallet/WalletView.testIds', () => ({
  WalletViewSelectorsIDs: {
    HOMEPAGE_SECTION_TITLE: (name: string) => `homepage-section-title-${name}`,
    HOMEPAGE_CONTAINER: 'homepage-container',
  },
}));

const makeWatchlistToken = (name: string) => ({
  assetId: `eip155:1/erc20:0x${name}`,
  symbol: name.toUpperCase(),
  name,
  decimals: 18,
  balance: '100',
  isInWallet: true,
  marketData: {
    price: 100,
    pricePercentChange24h: 1.5,
    marketCap: 1_000_000,
    totalVolume: 500_000,
  },
});

describe('WatchlistSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsWatchlistEnabled = true;
  });

  it('returns null when feature flag is off', () => {
    mockIsWatchlistEnabled = false;
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    const { toJSON } = render(
      <WatchlistSection sectionIndex={1} totalSectionsLoaded={5} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('shows skeletons while loading', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    });

    const { getAllByTestId } = render(
      <WatchlistSection sectionIndex={1} totalSectionsLoaded={5} />,
    );
    expect(getAllByTestId('trending-skeleton')).toHaveLength(3);
  });

  it('shows empty state when watchlist has no items', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId, getAllByText, getByText } = render(
      <WatchlistSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(getByTestId('watchlist-empty-icon')).toBeDefined();
    expect(getAllByText('Watchlist').length).toBeGreaterThanOrEqual(1);
    expect(getByText('You have no watchlist items yet')).toBeDefined();
  });

  it('renders up to 3 tokens when watchlist has items (newest first)', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [
        makeWatchlistToken('eth'),
        makeWatchlistToken('btc'),
        makeWatchlistToken('sol'),
        makeWatchlistToken('doge'),
      ],
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId, queryByTestId } = render(
      <WatchlistSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    // Storage appends newest last; section reverses so newest appears first.
    expect(getByTestId('row-doge')).toBeDefined();
    expect(getByTestId('row-sol')).toBeDefined();
    expect(getByTestId('row-btc')).toBeDefined();
    expect(queryByTestId('row-eth')).toBeNull();
  });

  it('renders section header with watchlist testID', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <WatchlistSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(getByTestId('homepage-section-title-watchlist')).toBeDefined();
  });
});
