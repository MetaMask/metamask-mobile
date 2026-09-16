import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import WatchlistSection from './WatchlistSection';
import Routes from '../../../../../constants/navigation/Routes';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';

let mockIsWatchlistEnabled = true;
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
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

const mockUseSuggestedWatchlistItemsQuery = jest.fn();
jest.mock(
  '../../../../UI/Assets/watchlist/hooks/useSuggestedWatchlistItemsQuery',
  () => ({
    useSuggestedWatchlistItemsQuery: () =>
      mockUseSuggestedWatchlistItemsQuery(),
  }),
);

const mockMutate = jest.fn();
jest.mock(
  '../../../../UI/Assets/watchlist/hooks/useTokenWatchlistMutations',
  () => ({
    useTokenWatchlistAddItemMutation: () => ({
      mutate: mockMutate,
      isPending: false,
    }),
  }),
);

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({ event: 'mock' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest
  .fn()
  .mockReturnValue({ addProperties: mockAddProperties });
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

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
    const { Text, TouchableOpacity, View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const Mock = ({
      token,
      onAddPress,
    }: {
      token: { name: string };
      onAddPress?: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: `row-${token.name}` },
        ReactActual.createElement(Text, null, token.name),
        onAddPress
          ? ReactActual.createElement(TouchableOpacity, {
              testID: `row-add-${token.name}`,
              onPress: onAddPress,
            })
          : null,
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

const makeSuggestedToken = (name: string) => ({
  assetId: `eip155:1/erc20:0x${name}`,
  symbol: name.toUpperCase(),
  name,
  decimals: 18,
  balance: '0',
  isInWallet: false,
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
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('keeps the shared performance hook on its legacy metadata contract', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    render(<WatchlistSection sectionIndex={0} totalSectionsLoaded={1} />);

    expect(jest.mocked(useSectionPerformance)).toHaveBeenCalledWith({
      sectionId: 'watchlist',
      contentReady: true,
      isEmpty: true,
      isLoading: false,
      enabled: true,
    });
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

  it('renders suggested tokens with add buttons when the watchlist is empty', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [makeSuggestedToken('bitcoin'), makeSuggestedToken('ethereum')],
      isLoading: false,
    });

    const { getByTestId } = render(
      <WatchlistSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(getByTestId('watchlist-empty-state')).toBeDefined();
    expect(getByTestId('row-bitcoin')).toBeDefined();
    expect(getByTestId('row-ethereum')).toBeDefined();
    expect(getByTestId('row-add-bitcoin')).toBeDefined();
    expect(getByTestId('row-add-ethereum')).toBeDefined();
  });

  it('adds a suggested token to the watchlist when its add button is pressed', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [makeSuggestedToken('bitcoin')],
      isLoading: false,
    });

    const { getByTestId } = render(
      <WatchlistSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    fireEvent.press(getByTestId('row-add-bitcoin'));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      'eip155:1/erc20:0xbitcoin',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('shows suggested-token skeletons while suggestions are loading', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { getAllByTestId } = render(
      <WatchlistSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(getAllByTestId('trending-skeleton')).toHaveLength(3);
  });

  it('renders nothing below the header when no suggested tokens are available', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { queryByTestId } = render(
      <WatchlistSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(queryByTestId('watchlist-empty-state')).toBeNull();
    expect(queryByTestId('row-add-bitcoin')).toBeNull();
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

  it('navigates to the watchlist full view when the section header is pressed', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <WatchlistSection sectionIndex={1} totalSectionsLoaded={5} />,
    );

    fireEvent.press(getByTestId('homepage-section-title-watchlist'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.WALLET.WATCHLIST_FULL_VIEW,
    );
  });
});
