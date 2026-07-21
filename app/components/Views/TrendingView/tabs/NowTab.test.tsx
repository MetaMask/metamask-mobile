import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

const mockNavigate = jest.fn();
const mockUseIsFocused = jest.fn(() => true);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
  useIsFocused: () => mockUseIsFocused(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../feeds/tokens/useTokensFeed', () => ({
  useTokensFeed: jest.fn(),
}));

jest.mock('../feeds/tokens/CryptoMoversPillItem', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ token }: { token: { assetId: string; symbol: string } }) =>
      createElement(
        Text,
        { testID: `section-pill-${token.assetId}` },
        token.symbol,
      ),
  };
});

const mockUsePerpsFeed = jest.fn(() => ({
  data: [],
  isLoading: false,
  refetch: jest.fn(),
  defaultSortOptionId: 'priceChange' as const,
}));

jest.mock('../feeds/perps/usePerpsFeed', () => ({
  ...jest.requireActual('../feeds/perps/usePerpsFeed'),
  usePerpsFeed: () => mockUsePerpsFeed(),
}));

// usePerpsLiveMovers (used by PerpsBlock) subscribes via the stream
// singleton — stub it so the hook's real ranking/fingerprint logic still
// runs (preserving the filter/sort assertions below) without needing a
// PerpsStreamProvider or real WebSocket.
const mockSubscribeToSymbols = jest.fn(() => jest.fn());
jest.mock('../../../UI/Perps/providers/PerpsStreamManager', () => ({
  usePerpsStream: () => ({
    prices: {
      subscribeToSymbols: (
        ...args: Parameters<typeof mockSubscribeToSymbols>
      ) => mockSubscribeToSymbols(...args),
    },
  }),
}));

jest.mock('../feeds/perps/PerpsPillItem', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ item }: { item: { market: { symbol: string } } }) =>
      createElement(
        Text,
        { testID: `perps-pill-${item.market.symbol}` },
        item.market.symbol,
      ),
  };
});

const mockNavigateToPerpsMarketList = jest.fn();
jest.mock('../feeds/perps/perpsNavigation', () => ({
  navigateToPerpsMarketList: (
    nav: unknown,
    filter: unknown,
    sortOptionId: unknown,
    options: unknown,
  ) => mockNavigateToPerpsMarketList(nav, filter, sortOptionId, options),
}));

jest.mock('../feeds/predictions/usePredictionsFeed', () => ({
  usePredictionsFeed: jest.fn(),
}));

jest.mock('../feeds/predictions/useWorldCupPredictionsFeed', () => ({
  useWorldCupPredictionsFeed: jest.fn(),
}));

jest.mock('../feeds/predictions/PredictionRowItem', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    PredictionCarouselRowItem: ({ market }: { market: { id: string } }) =>
      createElement(View, { testID: `predict-market-row-item-${market.id}` }),
  };
});

jest.mock('../components/HorizontalCarousel', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ idPrefix }: { idPrefix: string }) =>
      createElement(View, { testID: `${idPrefix}-flash-list` }),
  };
});

jest.mock('../feeds/stocks/useStocksFeed', () => ({
  useStocksFeed: jest.fn(),
}));

jest.mock('../feeds/perps/PerpsSectionProvider', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return ({ children }: { children: unknown }) =>
    createElement(View, null, children);
});

const mockWhatsHappeningRefresh = jest.fn();
const mockUseWhatsHappening = jest.fn(() => ({
  items: [] as { id: string }[],
  isLoading: false,
  error: null as string | null,
  refresh: mockWhatsHappeningRefresh,
}));

jest.mock('../../../UI/WhatsHappening/hooks', () => ({
  ...jest.requireActual('../../../UI/WhatsHappening/hooks'),
  useWhatsHappening: () => mockUseWhatsHappening(),
}));

const mockPredictionsCarouselSection = jest.fn(
  (props: {
    idPrefix?: string;
    title?: string;
    onViewAll?: () => void;
    isEnabled?: boolean;
    feed?: { isLoading: boolean; data: unknown[] };
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createElement, Fragment } = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');

    if (
      !props.isEnabled ||
      (!props.feed?.isLoading && props.feed?.data.length === 0)
    ) {
      return null;
    }

    return createElement(
      Fragment,
      null,
      createElement(
        Pressable,
        {
          testID: `section-header-view-all-${props.idPrefix}`,
          onPress: props.onViewAll,
        },
        createElement(Text, null, props.title),
      ),
    );
  },
);

jest.mock('../feeds/predictions/PredictionsCarouselSection', () => ({
  __esModule: true,
  default: (props: {
    idPrefix?: string;
    title?: string;
    onViewAll?: () => void;
    isEnabled?: boolean;
    feed?: { isLoading: boolean; data: unknown[] };
  }) => mockPredictionsCarouselSection(props),
}));

jest.mock('../../../UI/WhatsHappening', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import { selectWhatsHappeningEnabled } from '../../../../selectors/featureFlagController/whatsHappening';
import WhatsHappeningSection from '../../../UI/WhatsHappening';
import NowTab from './NowTab';
import { ExploreActiveTabProvider } from '../ExploreActiveTabContext';
import type { ExploreTabName } from '../search/analytics';
import type { RefreshConfig } from '../hooks/useExploreRefresh';
import { useTokensFeed } from '../feeds/tokens/useTokensFeed';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import { useWorldCupPredictionsFeed } from '../feeds/predictions/useWorldCupPredictionsFeed';
import { useStocksFeed } from '../feeds/stocks/useStocksFeed';
import Routes from '../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../../UI/Predict/constants/eventNames';

const mockUsePredictionsFeed = jest.mocked(usePredictionsFeed);
const mockUseWorldCupPredictionsFeed = jest.mocked(useWorldCupPredictionsFeed);
const mockUseStocksFeed = jest.mocked(useStocksFeed);
const mockWhatsHappeningImpl = jest.mocked(WhatsHappeningSection);

const defaultRefresh: RefreshConfig = { trigger: 0, silentRefresh: true };
const defaultTabProps = {
  refresh: defaultRefresh,
  refreshing: false,
  onRefresh: jest.fn(),
};

const predictSectionTestId = 'section-header-view-all-predictions';
const cryptoMoversSectionTestId = 'section-header-view-all-crypto_movers';
const perpsSectionTestId = 'section-header-view-all-perps';
const whatsHappeningSectionTestId = 'whats-happening-carousel';
const stocksSectionTestId = 'section-header-view-all-stocks';

const createWhatsHappeningCarousel = () =>
  React.createElement('View', { testID: whatsHappeningSectionTestId });

const createMockSelectorImpl =
  ({
    perpsEnabled = false,
    predictEnabled = false,
    whatsHappeningEnabled = false,
  }: {
    perpsEnabled?: boolean;
    predictEnabled?: boolean;
    whatsHappeningEnabled?: boolean;
  }) =>
  (selector: unknown) => {
    if (selector === selectPerpsEnabledFlag) return perpsEnabled;
    if (selector === selectPredictEnabledFlag) return predictEnabled;
    if (selector === selectWhatsHappeningEnabled) return whatsHappeningEnabled;
    return undefined;
  };

const arrangeMocks = () => {
  jest.clearAllMocks();
  mockUseIsFocused.mockReturnValue(true);

  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseTokensFeed = useTokensFeed as jest.MockedFunction<
    typeof useTokensFeed
  >;

  mockUseSelector.mockImplementation(
    createMockSelectorImpl({
      perpsEnabled: false,
      predictEnabled: false,
      whatsHappeningEnabled: false,
    }),
  );

  mockUsePredictionsFeed.mockReturnValue({
    data: [{ id: 'market-1' }] as never,
    isLoading: false,
    refetch: jest.fn(),
  });
  mockUseWorldCupPredictionsFeed.mockReturnValue({
    data: [],
    isLoading: false,
    isEnabled: false,
    refetch: jest.fn(),
  });
  mockUsePerpsFeed.mockReturnValue({
    data: [{ market: { symbol: 'BTC', change24hPercent: '5' } }] as never,
    isLoading: false,
    refetch: jest.fn(),
    defaultSortOptionId: 'priceChange',
  });
  mockUseTokensFeed.mockReturnValue({
    data: [
      {
        assetId: 'eip155:1/erc20:0x1',
        symbol: 'ONE',
        priceChangePct: { h1: '1.23' },
      },
      {
        assetId: 'eip155:1/erc20:0x2',
        symbol: 'TWO',
        priceChangePct: { h1: '2.34' },
      },
      {
        assetId: 'eip155:1/erc20:0x3',
        symbol: 'THREE',
        priceChangePct: { h1: '3.45' },
      },
    ] as never,
    isLoading: false,
    refetch: jest.fn(),
  });
  mockUseStocksFeed.mockReturnValue({
    data: [],
    isLoading: true,
    refetch: jest.fn(),
  });
  mockUseWhatsHappening.mockReturnValue({
    items: [{ id: 'trend-0' }],
    isLoading: false,
    error: null,
    refresh: mockWhatsHappeningRefresh,
  });
  mockWhatsHappeningImpl.mockReturnValue(createWhatsHappeningCarousel());

  return {
    useSelector: mockUseSelector,
    useTokensFeed: mockUseTokensFeed,
    usePerpsFeed: mockUsePerpsFeed,
    usePredictionsFeed: mockUsePredictionsFeed,
    useWorldCupPredictionsFeed: mockUseWorldCupPredictionsFeed,
    useStocksFeed: mockUseStocksFeed,
    useWhatsHappening: mockUseWhatsHappening,
    whatsHappeningImpl: mockWhatsHappeningImpl,
    whatsHappeningRefresh: mockWhatsHappeningRefresh,
    navigateToPerpsMarketList: mockNavigateToPerpsMarketList,
    navigate: mockNavigate,
  };
};

const renderNowTab = (
  props = defaultTabProps,
  { activeTab = 'Now' as ExploreTabName } = {},
) =>
  render(
    <NavigationContainer>
      <ExploreActiveTabProvider activeTab={activeTab}>
        <NowTab {...props} />
      </ExploreActiveTabProvider>
    </NavigationContainer>,
  );

describe('NowTab — WhatsHappeningSection integration', () => {
  const arrangeWhatsHappeningMocks = () => {
    const mocks = arrangeMocks();
    mocks.useSelector.mockImplementation(
      createMockSelectorImpl({
        whatsHappeningEnabled: true,
      }),
    );

    return mocks;
  };

  it('mounts WhatsHappeningSection and renders it when the feature flag is enabled', () => {
    arrangeWhatsHappeningMocks();

    renderNowTab();

    expect(screen.getByTestId('whats-happening-carousel')).toBeOnTheScreen();
  });

  it('does not mount WhatsHappeningSection when the feature flag is disabled', () => {
    const mocks = arrangeWhatsHappeningMocks();
    mocks.useSelector.mockImplementation(
      createMockSelectorImpl({
        whatsHappeningEnabled: false,
      }),
    );
    renderNowTab();

    expect(mocks.whatsHappeningImpl).not.toHaveBeenCalled();
    expect(screen.queryByTestId('whats-happening-carousel')).toBeNull();
  });

  it('calls whatsHappening.refresh when pull-to-refresh is triggered', () => {
    const mocks = arrangeWhatsHappeningMocks();

    const { rerender } = renderNowTab();

    expect(mocks.whatsHappeningRefresh).not.toHaveBeenCalled();

    rerender(
      <NavigationContainer>
        <NowTab
          {...defaultTabProps}
          refresh={{ trigger: 1, silentRefresh: true }}
        />
      </NavigationContainer>,
    );

    expect(mocks.whatsHappeningRefresh).toHaveBeenCalledTimes(1);
  });
});

describe('NowTab — Perps Movers "View All" navigation', () => {
  const arrangePerpsMoversMocks = (
    marketDataOverride?: {
      market: { symbol: string; change24hPercent: string };
    }[],
  ) => {
    const mocks = arrangeMocks();
    mocks.useSelector.mockImplementation(
      createMockSelectorImpl({
        perpsEnabled: true,
      }),
    );

    if (marketDataOverride) {
      mocks.usePerpsFeed.mockReturnValue({
        data: marketDataOverride as never,
        isLoading: false,
        refetch: jest.fn(),
        defaultSortOptionId: 'priceChange',
      });
    }

    return mocks;
  };

  it('calls navigateToPerpsMarketList with "all" filter, price change sort, and gainers direction by default', () => {
    const mocks = arrangePerpsMoversMocks();

    renderNowTab();

    fireEvent.press(screen.getByTestId('section-header-view-all-perps'));

    expect(mocks.navigateToPerpsMarketList).toHaveBeenCalledTimes(1);
    expect(mocks.navigateToPerpsMarketList).toHaveBeenCalledWith(
      expect.anything(),
      'all',
      'priceChange',
      { sortDirection: 'desc' },
    );
  });

  it('renders Gainers by default and filters out negative price changes', () => {
    arrangePerpsMoversMocks([
      { market: { symbol: 'BTC', change24hPercent: '5' } },
      { market: { symbol: 'ETH', change24hPercent: '-3' } },
    ]);

    renderNowTab();

    expect(screen.getByTestId('perps-movers-pill-gainers')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-pill-BTC')).toBeOnTheScreen();
    expect(screen.queryByTestId('perps-pill-ETH')).toBeNull();
  });

  it('renders pill skeletons while Perps Movers are loading', () => {
    const mocks = arrangePerpsMoversMocks();
    mocks.usePerpsFeed.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
      defaultSortOptionId: 'priceChange',
    });

    renderNowTab();

    expect(
      screen.getAllByTestId('section-pills-skeleton').length,
    ).toBeGreaterThan(0);
  });

  it('renders placeholder perps when price change data is unavailable after loading', () => {
    arrangePerpsMoversMocks([
      { market: { symbol: 'BTC', change24hPercent: '' } },
      {
        market: {
          symbol: 'ETH',
          change24hPercent: undefined as unknown as string,
        },
      },
    ]);

    renderNowTab();

    expect(screen.queryByTestId('section-pills-skeleton')).toBeNull();
    expect(screen.getByTestId('perps-pill-BTC')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-pill-ETH')).toBeOnTheScreen();
  });

  it('does not render pill skeletons when price change data is valid but filtered out', () => {
    arrangePerpsMoversMocks([
      { market: { symbol: 'BTC', change24hPercent: '0%' } },
      { market: { symbol: 'ETH', change24hPercent: '0.00%' } },
    ]);

    renderNowTab();

    expect(screen.queryByTestId('section-pills-skeleton')).toBeNull();
  });

  it('renders Losers sorted by biggest negative move and passes ascending sort direction to the market list', () => {
    const mocks = arrangePerpsMoversMocks([
      { market: { symbol: 'BTC', change24hPercent: '5' } },
      { market: { symbol: 'ETH', change24hPercent: '-3' } },
      { market: { symbol: 'SOL', change24hPercent: '-8' } },
    ]);

    renderNowTab();

    fireEvent.press(screen.getByTestId('perps-movers-pill-losers'));

    expect(screen.getByTestId('perps-pill-SOL')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-pill-ETH')).toBeOnTheScreen();
    expect(screen.queryByTestId('perps-pill-BTC')).toBeNull();

    fireEvent.press(screen.getByTestId('section-header-view-all-perps'));

    expect(mocks.navigateToPerpsMarketList).toHaveBeenCalledWith(
      expect.anything(),
      'all',
      'priceChange',
      { sortDirection: 'asc' },
    );
  });

  it('does not render the Perps Movers section when the perps flag is disabled', () => {
    const mocks = arrangePerpsMoversMocks();
    mocks.useSelector.mockImplementation(
      createMockSelectorImpl({
        perpsEnabled: false,
      }),
    );
    renderNowTab();

    expect(screen.queryByTestId('section-header-view-all-perps')).toBeNull();
  });

  describe('live movers subscription gating', () => {
    it('subscribes to live prices when the Now tab is active and the screen is focused', () => {
      arrangePerpsMoversMocks();

      renderNowTab(defaultTabProps, { activeTab: 'Now' });

      expect(mockSubscribeToSymbols).toHaveBeenCalled();
    });

    it('does not subscribe to live prices when a different Explore tab is active', () => {
      arrangePerpsMoversMocks();

      renderNowTab(defaultTabProps, { activeTab: 'Macro' });

      expect(mockSubscribeToSymbols).not.toHaveBeenCalled();
    });

    it('does not subscribe to live prices when the Explore screen is unfocused', () => {
      arrangePerpsMoversMocks();
      mockUseIsFocused.mockReturnValue(false);

      renderNowTab(defaultTabProps, { activeTab: 'Now' });

      expect(mockSubscribeToSymbols).not.toHaveBeenCalled();
    });

    it('stops establishing new live subscriptions once the tab becomes inactive', () => {
      arrangePerpsMoversMocks([
        { market: { symbol: 'BTC', change24hPercent: '5' } },
      ]);

      const { rerender } = renderNowTab(defaultTabProps, {
        activeTab: 'Now',
      });

      expect(mockSubscribeToSymbols).toHaveBeenCalled();
      const callsWhileActive = mockSubscribeToSymbols.mock.calls.length;

      rerender(
        <NavigationContainer>
          <ExploreActiveTabProvider activeTab="Macro">
            <NowTab {...defaultTabProps} />
          </ExploreActiveTabProvider>
        </NavigationContainer>,
      );

      // No further subscriptions should be established once disabled — the
      // count should stay exactly where it was when the tab went inactive.
      expect(mockSubscribeToSymbols.mock.calls.length).toBe(callsWhileActive);
    });
  });
});

describe('NowTab — Predictions navigation', () => {
  const arrangePredictSelectionMocks = () => {
    const mocks = arrangeMocks();
    mocks.useSelector.mockImplementation(
      createMockSelectorImpl({
        predictEnabled: true,
      }),
    );

    return mocks;
  };

  it('opens the Predict trending tab from the Predictions section title', () => {
    const mocks = arrangePredictSelectionMocks();
    renderNowTab();

    fireEvent.press(screen.getByTestId(predictSectionTestId));

    expect(mocks.navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        tab: 'trending',
      },
    });
  });

  it('opens the World Cup screen from the Predictions section title when World Cup predictions are enabled', () => {
    const mocks = arrangePredictSelectionMocks();

    mocks.useWorldCupPredictionsFeed.mockReturnValue({
      data: [{ id: 'world-cup-market-1' }] as never,
      isLoading: false,
      isEnabled: true,
      refetch: jest.fn(),
    });

    renderNowTab();

    expect(screen.getByText('World Cup predictions')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(predictSectionTestId));

    expect(mocks.navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.WORLD_CUP,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        initialTab: 'all',
      },
    });
  });
});

describe('NowTab — Crypto Movers', () => {
  const arrangeCryptoMoversMocks = () => {
    const mocks = arrangeMocks();
    mocks.useSelector.mockImplementation(createMockSelectorImpl({}));
    return mocks;
  };

  it('requests and opens Crypto Movers with the 1h filter', () => {
    const mocks = arrangeCryptoMoversMocks();
    renderNowTab();

    expect(mocks.useTokensFeed).toHaveBeenCalledWith({
      refresh: defaultRefresh,
      hideRiskyTokens: true,
      timeOption: '1h',
    });

    fireEvent.press(
      screen.getByTestId('section-header-view-all-crypto_movers'),
    );

    expect(mocks.navigate).toHaveBeenCalledWith(
      Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      {
        initialTimeOption: '1h',
        entryPoint: 'crypto_movers',
        quickBuySource: 'explore_now',
      },
    );
  });

  it('renders Crypto Movers across three rows', () => {
    arrangeCryptoMoversMocks();
    renderNowTab();

    expect(
      screen.getByTestId('explore-crypto_movers-pills-list-row-0'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('explore-crypto_movers-pills-list-row-1'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('explore-crypto_movers-pills-list-row-2'),
    ).toBeOnTheScreen();
  });

  it('renders up to 18 Crypto Movers pills', () => {
    const mocks = arrangeCryptoMoversMocks();
    mocks.useTokensFeed.mockReturnValue({
      data: Array.from({ length: 19 }, (_, index) => ({
        assetId: `eip155:1/erc20:0x${index}`,
        symbol: `T${index}`,
        priceChangePct: { h1: String(index) },
      })) as never,
      isLoading: false,
      refetch: jest.fn(),
    });

    renderNowTab();

    expect(screen.getByTestId('section-pill-eip155:1/erc20:0x17')).toBeTruthy();
    expect(screen.queryByTestId('section-pill-eip155:1/erc20:0x18')).toBeNull();
  });
});

describe('NowTab — section ordering', () => {
  const arrangeAllSectionsVisibleMocks = () => {
    const mocks = arrangeMocks();
    mocks.useSelector.mockImplementation(
      createMockSelectorImpl({
        perpsEnabled: true,
        predictEnabled: true,
        whatsHappeningEnabled: true,
      }),
    );

    return mocks;
  };

  const NOW_TAB_SECTION_ORDER_TEST_IDS = [
    'explore-section-predict',
    'explore-section-crypto_movers',
    'explore-section-perps',
    'explore-section-wh',
    'explore-section-stocks',
  ] as const;

  type RootType = ReturnType<typeof render>['root'];

  const NOW_TAB_SECTION_ORDER_TEST_IDS_SET = new Set<string>(
    NOW_TAB_SECTION_ORDER_TEST_IDS,
  );

  const getNowTabSectionOrder = (tree: RootType): string[] => {
    if (!tree) {
      return [];
    }

    const processSections = (sectionTree: RootType): string[] => {
      if (Array.isArray(sectionTree)) {
        return sectionTree.flatMap(processSections);
      }

      const testID = sectionTree.props?.testID;
      const ownTestIds =
        typeof testID === 'string' &&
        NOW_TAB_SECTION_ORDER_TEST_IDS_SET.has(testID)
          ? [testID]
          : [];

      const childTestIds = (sectionTree.children ?? []).flatMap((child) =>
        typeof child === 'string' ? [] : processSections(child),
      );

      return [...ownTestIds, ...childTestIds];
    };

    const results = processSections(tree);
    return [...new Set(results)];
  };

  it('renders all sections in fixed order when every section is visible', () => {
    arrangeAllSectionsVisibleMocks();
    const { root } = renderNowTab();

    expect(getNowTabSectionOrder(root)).toEqual(NOW_TAB_SECTION_ORDER_TEST_IDS);
  });

  it('keeps relative order when middle sections are hidden', () => {
    const mocks = arrangeAllSectionsVisibleMocks();
    mocks.useSelector.mockImplementation(
      createMockSelectorImpl({
        perpsEnabled: false,
        predictEnabled: true,
        whatsHappeningEnabled: false,
      }),
    );

    const { root } = renderNowTab();

    expect(getNowTabSectionOrder(root)).toEqual([
      'explore-section-predict',
      'explore-section-crypto_movers',
      'explore-section-stocks',
    ]);
  });
});
