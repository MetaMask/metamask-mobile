import React from 'react';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { act, render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectIsExploreEarnSectionVisible } from '../../../UI/Earn/selectors/visibility';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
import { useABTest } from '../../../../hooks/useABTest';
import { usePredictTrendingFeed } from '../../../UI/PredictNext';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import { useCryptoPillFeed } from '../feeds/tokens/useCryptoPillFeed';
import type { CryptoPillKey } from '../feeds/tokens/cryptoPillConfig';
import { selectTokenWatchlistEnabled } from '../../../UI/Assets/selectors/featureFlags';
import { ExploreActiveTabProvider } from '../ExploreActiveTabContext';
import CryptoTab from './CryptoTab';
import {
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_SCREEN_NAMES,
} from '../../../UI/Earn/constants/earnModuleEvents';

const mockNavigate = jest.fn();
const mockEarnSection = jest.fn((_props: Record<string, unknown>) => null);
const mockCryptoTokensPillBlock = jest.fn(
  (_props: Record<string, unknown>) => null,
);
const mockUseIsFocused = jest.fn(() => true);
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseABTest = useABTest as jest.MockedFunction<typeof useABTest>;
const mockUsePredictionsFeed = jest.mocked(usePredictTrendingFeed);
const mockUsePerpsFeed = jest.mocked(usePerpsFeed);
const mockUseCryptoPillFeed = useCryptoPillFeed as jest.MockedFunction<
  typeof useCryptoPillFeed
>;

interface TileCarouselMockProps {
  testID?: string;
  data: unknown[];
  renderItem: (item: unknown, index: number) => React.ReactElement;
}
const mockTileCarousel = jest.fn((_props: TileCarouselMockProps) => null);
const mockPerpsMarketTileCard = jest.fn(
  (_props: Record<string, unknown>) => null,
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useIsFocused: () => mockUseIsFocused(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(),
}));

jest.mock('../../../UI/Earn/selectors/visibility', () => ({
  selectIsExploreEarnSectionVisible: jest.fn(),
}));

jest.mock('../../../UI/Earn/components/EarnSection', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockEarnSection(props),
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

jest.mock('../../../UI/PredictNext/trending/usePredictTrendingFeed', () => ({
  usePredictTrendingFeed: jest.fn(),
}));

jest.mock('../feeds/perps/usePerpsFeed', () => ({
  usePerpsFeed: jest.fn(),
}));

jest.mock('../feeds/perps/PerpsSectionProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../components/SectionHeader', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/TileCarousel', () => ({
  __esModule: true,
  default: (props: TileCarouselMockProps) => mockTileCarousel(props),
}));

jest.mock(
  '../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCard',
  () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => mockPerpsMarketTileCard(props),
  }),
);

jest.mock('../../../../util/deviceCapability', () => ({
  ...jest.requireActual('../../../../util/deviceCapability'),
  getHardwareTier: () => 'LOW',
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  ...jest.requireActual('../../../../hooks/useNetworkTier'),
  useNetworkTier: () => 'SLOW_CELLULAR',
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
  perpsEnabled = false,
  earnSectionVisible = false,
  quickTradeEnabled = false,
  watchlistEnabled = false,
}: {
  perpsEnabled?: boolean;
  earnSectionVisible?: boolean;
  quickTradeEnabled?: boolean;
  watchlistEnabled?: boolean;
} = {}) => {
  jest.clearAllMocks();
  mockUseIsFocused.mockReturnValue(true);

  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
  } as never);

  mockUseABTest.mockReturnValue({
    variant: { showQuickTradeButton: quickTradeEnabled },
  } as never);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPerpsEnabledFlag) return perpsEnabled;
    if (selector === selectTokenWatchlistEnabled) return watchlistEnabled;
    if (selector === selectIsExploreEarnSectionVisible) {
      return earnSectionVisible;
    }
    // Other selectors, such as Predict's Active Venue, read the default state.
    return (selector as (state: unknown) => unknown)({
      engine: { backgroundState },
    });
  });

  mockUsePredictionsFeed.mockReturnValue({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
  } as never);
  mockUsePerpsFeed.mockReturnValue({
    data: [{ market: { symbol: 'BTC' } }],
    isLoading: false,
    refetch: jest.fn(),
    defaultSortOptionId: 'priceChange',
  } as never);

  mockUseCryptoPillFeed.mockReturnValue({
    results: {
      trending: {
        data: [{} as TrendingAsset],
        isLoading: false,
        isError: false,
      },
    },
  } as never);
};

const getSectionOrder = (tree: ReturnType<typeof render>['root']): string[] => {
  const sectionIds = new Set([
    'explore-section-tokens',
    'explore-section-crypto_perps',
    'explore-section-earn',
  ]);

  const walk = (node: typeof tree): string[] => {
    const testID = node.props?.testID;
    const ownSection = sectionIds.has(testID) ? [testID] : [];
    const childSections = node.children.flatMap((child) =>
      typeof child === 'string' ? [] : walk(child),
    );

    return [...ownSection, ...childSections];
  };

  return [...new Set(walk(tree))];
};

describe('CryptoTab — Earn section', () => {
  it('renders Earn when the section is visible', () => {
    arrangeMocks({ earnSectionVisible: true });

    render(<CryptoTab {...defaultTabProps} />);

    expect(screen.getByTestId('explore-section-earn')).toBeOnTheScreen();
    expect(mockEarnSection).toHaveBeenCalledWith({
      enabled: false,
      refresh: { trigger: 0, silentRefresh: true },
      tokenDetailsSource: TokenDetailsSource.ExploreEarn,
      analyticsContext: {
        screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE_CRYPTO_TAB,
        entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE_CRYPTO_TAB,
        component_name: EARN_MODULE_COMPONENT_NAMES.EXPLORE_EARN_SECTION,
      },
    });
  });

  it('does not render Earn when the section is not visible', () => {
    arrangeMocks();

    render(<CryptoTab {...defaultTabProps} />);

    expect(screen.queryByTestId('explore-section-earn')).not.toBeOnTheScreen();
    expect(mockEarnSection).not.toHaveBeenCalled();
  });

  it('forwards the Explore refresh trigger to Earn', () => {
    arrangeMocks({ earnSectionVisible: true });

    render(
      <CryptoTab
        {...defaultTabProps}
        refresh={{ trigger: 1, silentRefresh: true }}
      />,
    );

    expect(mockEarnSection).toHaveBeenCalledWith({
      enabled: false,
      refresh: { trigger: 1, silentRefresh: true },
      tokenDetailsSource: TokenDetailsSource.ExploreEarn,
      analyticsContext: {
        screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE_CRYPTO_TAB,
        entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE_CRYPTO_TAB,
        component_name: EARN_MODULE_COMPONENT_NAMES.EXPLORE_EARN_SECTION,
      },
    });
  });

  it('enables Earn when Crypto is the active Explore tab', () => {
    arrangeMocks({ earnSectionVisible: true });

    render(
      <ExploreActiveTabProvider activeTab="Crypto">
        <CryptoTab {...defaultTabProps} />
      </ExploreActiveTabProvider>,
    );

    expect(mockEarnSection).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('disables Earn when Explore screen is unfocused', () => {
    arrangeMocks({ earnSectionVisible: true });
    mockUseIsFocused.mockReturnValue(false);

    render(
      <ExploreActiveTabProvider activeTab="Crypto">
        <CryptoTab {...defaultTabProps} />
      </ExploreActiveTabProvider>,
    );

    expect(mockEarnSection).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});

describe('CryptoTab — section ordering', () => {
  it('renders Tokens, Perps and Earn in order when all sections are visible', () => {
    arrangeMocks({ perpsEnabled: true, earnSectionVisible: true });

    const { root } = render(<CryptoTab {...defaultTabProps} />);

    expect(getSectionOrder(root)).toEqual([
      'explore-section-tokens',
      'explore-section-crypto_perps',
      'explore-section-earn',
    ]);
  });
});

describe('CryptoTab — Perps tiles', () => {
  it('passes the device tiers to each Perps tile', () => {
    arrangeMocks({ perpsEnabled: true });
    render(<CryptoTab {...defaultTabProps} />);
    const perpsCarousel = mockTileCarousel.mock.calls.find(
      ([props]) => props.testID === 'explore-crypto_perps-carousel',
    )?.[0];
    if (!perpsCarousel) {
      throw new Error('Perps carousel did not render');
    }

    render(perpsCarousel.renderItem(perpsCarousel.data[0], 0));

    expect(mockPerpsMarketTileCard).toHaveBeenCalledWith(
      expect.objectContaining({
        market: { symbol: 'BTC' },
        deviceCapability: { hardwareTier: 'LOW', networkTier: 'SLOW_CELLULAR' },
      }),
    );
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
        top_gainers: { data: undefined, isLoading: false, isError: true },
      },
    } as never);

    render(<CryptoTab {...defaultTabProps} />);

    expect(mockCryptoTokensPillBlock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('explore-section-tokens')).toBeNull();
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
    } as never);

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
        top_gainers: {
          data: [{} as TrendingAsset],
          isLoading: false,
          isError: false,
        },
      },
    } as never);

    render(<CryptoTab {...defaultTabProps} />);

    const blockProps = mockCryptoTokensPillBlock.mock.calls[0]?.[0] as {
      onActivePillChange: (key: CryptoPillKey) => void;
    };
    act(() => {
      blockProps.onActivePillChange('top_gainers');
    });

    expect(mockUseCryptoPillFeed).toHaveBeenLastCalledWith(
      expect.objectContaining({ activePillKey: 'top_gainers' }),
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
