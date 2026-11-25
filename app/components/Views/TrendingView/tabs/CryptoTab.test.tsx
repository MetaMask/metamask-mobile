import React from 'react';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { act, render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
import { useABTest } from '../../../../hooks/useABTest';
import { useCryptoPillFeed } from '../feeds/tokens/useCryptoPillFeed';
import type { CryptoPillKey } from '../feeds/tokens/cryptoPillConfig';
import { selectTokenWatchlistEnabled } from '../../../UI/Assets/selectors/featureFlags';
import { ExploreActiveTabProvider } from '../ExploreActiveTabContext';
import CryptoTab from './CryptoTab';

const mockNavigate = jest.fn();
const mockCryptoTokensPillBlock = jest.fn(
  (_props: Record<string, unknown>) => null,
);
const mockUseIsFocused = jest.fn(() => true);
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseABTest = useABTest as jest.MockedFunction<typeof useABTest>;
const mockUseCryptoPillFeed = useCryptoPillFeed as jest.MockedFunction<
  typeof useCryptoPillFeed
>;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useIsFocused: () => mockUseIsFocused(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: jest.fn(),
  }),
);

const mockTopTradersProps = jest.fn();
jest.mock('../../Homepage/Sections/TopTraders/TopTradersSection', () => {
  const MockReact = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  function MockTopTradersSection({
    source,
    prefetchProfiles,
    chains,
  }: {
    source?: string;
    prefetchProfiles?: boolean;
    chains?: string[];
  }) {
    MockReact.useEffect(() => {
      mockTopTradersProps({ source, prefetchProfiles, chains });
    });
    return MockReact.createElement(
      View,
      {
        testID: 'top-traders-section',
        accessibilityHint: source,
        accessibilityLabel: String(prefetchProfiles),
      },
      MockReact.createElement(Text, null, 'Top traders'),
    );
  }
  return {
    __esModule: true,
    default: MockTopTradersSection,
  };
});

const mockUseNetworkTier = jest.fn();
jest.mock('../../../../hooks/useNetworkTier', () => ({
  ...jest.requireActual('../../../../hooks/useNetworkTier'),
  useNetworkTier: () => mockUseNetworkTier(),
}));

const mockGetHardwareTier = jest.fn();
jest.mock('../../../../util/deviceCapability', () => ({
  ...jest.requireActual('../../../../util/deviceCapability'),
  getHardwareTier: () => mockGetHardwareTier(),
}));

jest.mock('../feeds/tokens/CryptoTokensPillBlock', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockCryptoTokensPillBlock(props),
}));

jest.mock('../feeds/tokens/useCryptoPillFeed', () => {
  const actual = jest.requireActual('../feeds/tokens/useCryptoPillFeed');
  return {
    ...actual,
    useCryptoPillFeed: jest.fn(),
  };
});

jest.mock('../components/SectionHeader', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../UI/Trending/contexts', () => ({
  useTrendingQuickBuySheet: () => ({
    openQuickBuy: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: jest.fn(() => ({
    variant: { showQuickTradeButton: false },
  })),
}));

const defaultTabProps = {
  refresh: { trigger: 0, silentRefresh: true },
  refreshing: false,
  onRefresh: jest.fn(),
};

const arrangeMocks = ({
  quickTradeEnabled = false,
  watchlistEnabled = false,
  topTradersEnabled = true,
}: {
  quickTradeEnabled?: boolean;
  watchlistEnabled?: boolean;
  topTradersEnabled?: boolean;
} = {}) => {
  jest.clearAllMocks();
  mockUseIsFocused.mockReturnValue(true);

  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
  });

  mockUseABTest.mockReturnValue({
    variant: { showQuickTradeButton: quickTradeEnabled },
  } as never);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectTokenWatchlistEnabled) return watchlistEnabled;
    if (selector === selectSocialLeaderboardEnabled) return topTradersEnabled;
    // Other selectors, such as Predict's Active Venue, read the default state.
    return selector({
      engine: { backgroundState },
    });
  });

  mockUseNetworkTier.mockReturnValue(null);
  mockGetHardwareTier.mockReturnValue(null);

  mockUseCryptoPillFeed.mockReturnValue({
    results: {
      trending: {
        data: [{} as TrendingAsset],
        isLoading: false,
        isError: false,
      },
    },
  });
};

const getSectionOrder = (
  tree: ReturnType<typeof render>['root'],
  trackedIds: ReadonlySet<string> = new Set([
    'explore-section-tokens',
    'explore-section-crypto_perps',
    'explore-section-earn',
  ]),
): string[] => {
  const walk = (node: typeof tree): string[] => {
    const testID = node.props?.testID;
    const ownSection = trackedIds.has(testID) ? [testID] : [];
    const childSections = node.children.flatMap((child) =>
      typeof child === 'string' ? [] : walk(child),
    );

    return [...ownSection, ...childSections];
  };

  return [...new Set(walk(tree))];
};

describe('CryptoTab — section ordering', () => {
  it('renders the top traders section above the tokens section only', () => {
    arrangeMocks();

    const { root } = render(<CryptoTab {...defaultTabProps} />);

    expect(
      getSectionOrder(
        root,
        new Set([
          'top-traders-section',
          'explore-section-tokens',
          'explore-section-crypto_perps',
          'explore-section-earn',
          'explore-section-predictions',
        ]),
      ),
    ).toEqual(['top-traders-section', 'explore-section-tokens']);
  });
});

describe('CryptoTab — Top Traders section', () => {
  it('renders the top traders section when the feature flag is enabled', () => {
    arrangeMocks();

    render(<CryptoTab {...defaultTabProps} />);

    expect(screen.getByTestId('top-traders-section')).toBeOnTheScreen();
  });

  it('omits chains so the section defaults to the spot chains', () => {
    arrangeMocks();

    render(<CryptoTab {...defaultTabProps} />);

    expect(mockTopTradersProps).toHaveBeenLastCalledWith({
      source: 'explore_crypto',
      prefetchProfiles: true,
      chains: undefined,
    });
  });

  it('hides top traders when the social leaderboard flag is off', () => {
    arrangeMocks({ topTradersEnabled: false });

    render(<CryptoTab {...defaultTabProps} />);

    expect(screen.queryByTestId('top-traders-section')).not.toBeOnTheScreen();
  });

  it('hides top traders when there is no network', () => {
    arrangeMocks();
    mockUseNetworkTier.mockReturnValue('NONE');

    render(<CryptoTab {...defaultTabProps} />);

    expect(screen.queryByTestId('top-traders-section')).not.toBeOnTheScreen();
  });

  it.each([
    ['LOW', 'SLOW_CELLULAR', 'false'],
    ['LOW', 'WIFI', 'true'],
    ['MID', 'SLOW_CELLULAR', 'true'],
    [null, 'SLOW_CELLULAR', 'true'],
    ['LOW', null, 'true'],
    [null, null, 'true'],
  ])(
    'with %s hardware and %s network, top traders profile prefetch is %s',
    (hardwareTier, networkTier, expected) => {
      arrangeMocks();
      mockGetHardwareTier.mockReturnValue(hardwareTier);
      mockUseNetworkTier.mockReturnValue(networkTier);

      render(<CryptoTab {...defaultTabProps} />);

      expect(
        screen.getByTestId('top-traders-section').props.accessibilityLabel,
      ).toBe(expected);
    },
  );

  it('keeps top traders on slow cellular', () => {
    arrangeMocks();
    mockUseNetworkTier.mockReturnValue('SLOW_CELLULAR');

    render(<CryptoTab {...defaultTabProps} />);

    expect(screen.getByTestId('top-traders-section')).toBeOnTheScreen();
  });
});

describe('CryptoTab — tokens pill block', () => {
  it('renders the tokens section while at least one pill is visible', () => {
    arrangeMocks();

    render(<CryptoTab {...defaultTabProps} />);

    expect(mockCryptoTokensPillBlock).toHaveBeenCalled();
    expect(screen.getByTestId('explore-section-tokens')).toBeOnTheScreen();
  });

  it('hides the tokens section entirely when no pill is visible', () => {
    arrangeMocks();
    mockUseCryptoPillFeed.mockReturnValue({
      results: {
        trending: { data: [], isLoading: false, isError: false },
        gainers: { data: undefined, isLoading: false, isError: true },
      },
    });

    render(<CryptoTab {...defaultTabProps} />);

    expect(mockCryptoTokensPillBlock).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('explore-section-tokens'),
    ).not.toBeOnTheScreen();
  });

  it('passes the pill block the expected props', () => {
    arrangeMocks();

    render(<CryptoTab {...defaultTabProps} />);

    expect(mockCryptoTokensPillBlock).toHaveBeenCalledWith({
      title: 'Tokens',
      activePillKey: undefined,
      onActivePillChange: expect.any(Function),
      tabName: 'Crypto',
      headerTestID: 'section-header-view-all-tokens',
      idPrefix: 'tokens',
      testIdPrefix: 'crypto-tokens',
      listTestId: 'crypto-tokens-list',
    });
  });

  it('gates the crypto pill feed on the default pill until the user picks one', () => {
    arrangeMocks();

    render(<CryptoTab {...defaultTabProps} />);

    expect(mockUseCryptoPillFeed).toHaveBeenCalledWith(
      expect.objectContaining({ activePillKey: 'trending' }),
    );
  });

  it('defaults the feed to trending when the watchlist is enabled but empty', () => {
    arrangeMocks({ watchlistEnabled: true });
    mockUseCryptoPillFeed.mockReturnValue({
      results: {
        watchlist: {
          data: [],
          isLoading: false,
          isError: false,
        },
        trending: {
          data: [{} as TrendingAsset],
          isLoading: false,
          isError: false,
        },
      },
    });

    render(<CryptoTab {...defaultTabProps} />);

    expect(mockUseCryptoPillFeed).toHaveBeenLastCalledWith(
      expect.objectContaining({ activePillKey: 'trending' }),
    );
  });

  it('targets the user-selected pill for the crypto feed', () => {
    arrangeMocks();
    mockUseCryptoPillFeed.mockReturnValue({
      results: {
        trending: {
          data: [{} as TrendingAsset],
          isLoading: false,
          isError: false,
        },
        gainers: {
          data: [{} as TrendingAsset],
          isLoading: false,
          isError: false,
        },
      },
    });

    render(<CryptoTab {...defaultTabProps} />);

    const blockProps = mockCryptoTokensPillBlock.mock.calls[0]?.[0] as {
      onActivePillChange: (key: CryptoPillKey) => void;
    };
    act(() => {
      blockProps.onActivePillChange('gainers');
    });

    expect(mockUseCryptoPillFeed).toHaveBeenLastCalledWith(
      expect.objectContaining({ activePillKey: 'gainers' }),
    );
  });

  it('forwards the Explore refresh trigger to the crypto pill feed', () => {
    arrangeMocks();

    render(
      <CryptoTab
        {...defaultTabProps}
        refresh={{ trigger: 1, silentRefresh: true }}
      />,
    );

    expect(mockUseCryptoPillFeed).toHaveBeenCalledWith(
      expect.objectContaining({
        refresh: { trigger: 1, silentRefresh: true },
      }),
    );
  });

  it('passes a quick-trade callback only when the variant enables it', () => {
    arrangeMocks({ quickTradeEnabled: true });

    render(<CryptoTab {...defaultTabProps} />);

    expect(mockCryptoTokensPillBlock).toHaveBeenCalledWith(
      expect.objectContaining({ onQuickTrade: expect.any(Function) }),
    );
  });

  it('omits the quick-trade callback when the variant is disabled', () => {
    arrangeMocks();

    render(<CryptoTab {...defaultTabProps} />);

    expect(mockCryptoTokensPillBlock).toHaveBeenCalledWith(
      expect.objectContaining({ onQuickTrade: undefined }),
    );
  });
});
