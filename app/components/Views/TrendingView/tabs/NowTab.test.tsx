import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Feed hooks — return empty/not-loading so NowTab renders without network calls.
jest.mock('../feeds/tokens/useTokensFeed', () => ({
  useTokensFeed: jest.fn(() => ({ data: [], isLoading: false })),
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

jest.mock('../../../UI/Perps/hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(() => ({})),
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

interface MockPredictionMarket {
  id: string;
}

const mockUsePredictionsFeed = jest.fn<
  { data: MockPredictionMarket[]; isLoading: boolean },
  []
>(() => ({
  data: [],
  isLoading: false,
}));
jest.mock('../feeds/predictions/usePredictionsFeed', () => ({
  usePredictionsFeed: () => mockUsePredictionsFeed(),
}));

const mockUseWorldCupPredictionsFeed = jest.fn<
  { data: MockPredictionMarket[]; isLoading: boolean; isEnabled: boolean },
  []
>(() => ({
  data: [],
  isLoading: false,
  isEnabled: false,
}));
jest.mock('../feeds/predictions/useWorldCupPredictionsFeed', () => ({
  useWorldCupPredictionsFeed: () => mockUseWorldCupPredictionsFeed(),
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
  useStocksFeed: jest.fn(() => ({ data: [], isLoading: false })),
}));

// Mock PerpsSectionProvider as a transparent passthrough.
jest.mock('../feeds/perps/PerpsSectionProvider', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return ({ children }: { children: unknown }) =>
    createElement(View, null, children);
});

// Mock WhatsHappeningSection to keep its transitive deps (Engine, analytics)
// out of this unit test. We control rendering via mockWhatsHappeningImpl.
const mockWhatsHappeningImpl = jest.fn<React.ReactElement | null, [unknown]>(
  () => null,
);

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

jest.mock('../../../UI/WhatsHappening', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { forwardRef } = require('react');
  return {
    __esModule: true,
    default: forwardRef((props: unknown, ref: unknown) =>
      mockWhatsHappeningImpl({ ...(props as object), ref }),
    ),
  };
});

import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import { selectWhatsHappeningEnabled } from '../../../../selectors/featureFlagController/whatsHappening';
import NowTab from './NowTab';
import type { RefreshConfig } from '../hooks/useExploreRefresh';
import { useTokensFeed } from '../feeds/tokens/useTokensFeed';
import Routes from '../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../../UI/Predict/constants/eventNames';

const defaultRefresh: RefreshConfig = { trigger: 0, silentRefresh: true };
const defaultTabProps = {
  refresh: defaultRefresh,
  refreshing: false,
  onRefresh: jest.fn(),
};

const predictSectionTestId = 'section-header-view-all-predictions';
const whatsHappeningSectionTestId = 'whats-happening-carousel';

const renderNowTab = (props = defaultTabProps) =>
  render(
    <NavigationContainer>
      <NowTab {...props} />
    </NavigationContainer>,
  );

interface RenderNode {
  props?: {
    testID?: string;
  };
  children?: unknown[] | null;
}

const isRenderNode = (node: unknown): node is RenderNode =>
  Boolean(node) && typeof node === 'object';

const collectTestIds = (node: unknown): string[] => {
  if (Array.isArray(node)) {
    return node.flatMap(collectTestIds);
  }

  if (!isRenderNode(node)) {
    return [];
  }

  const ownTestIds =
    typeof node.props?.testID === 'string' ? [node.props.testID] : [];
  const childTestIds = node.children?.flatMap(collectTestIds) ?? [];

  return [...ownTestIds, ...childTestIds];
};

const getIntroSectionOrder = (tree: unknown) =>
  collectTestIds(tree).filter((testId) =>
    [predictSectionTestId, whatsHappeningSectionTestId].includes(testId),
  );

const mockUseTokensFeed = useTokensFeed as jest.MockedFunction<
  typeof useTokensFeed
>;

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePerpsFeed.mockReturnValue({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
    defaultSortOptionId: 'priceChange' as const,
  });
  mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: false });
  mockUseWorldCupPredictionsFeed.mockReturnValue({
    data: [],
    isLoading: false,
    isEnabled: false,
  });
  mockUseWhatsHappening.mockReturnValue({
    items: [],
    isLoading: false,
    error: null,
    refresh: mockWhatsHappeningRefresh,
  });
  mockWhatsHappeningImpl.mockReturnValue(null);
});

describe('NowTab — WhatsHappeningSection integration', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  const mockSelectorBase = (selector: unknown) => {
    if (selector === selectPerpsEnabledFlag) return false;
    if (selector === selectPredictEnabledFlag) return false;
    return undefined;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation(mockSelectorBase);
    // Default: section mock renders nothing; individual tests override as needed.
    mockWhatsHappeningImpl.mockReturnValue(null);
  });

  it('mounts WhatsHappeningSection and renders it when the feature flag is enabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectWhatsHappeningEnabled) return true;
      return mockSelectorBase(selector);
    });
    mockUseWhatsHappening.mockReturnValue({
      items: [{ id: 'trend-0' }],
      isLoading: false,
      error: null,
      refresh: mockWhatsHappeningRefresh,
    });
    (mockWhatsHappeningImpl as jest.Mock).mockReturnValue(
      React.createElement('View', {
        testID: 'whats-happening-carousel',
      }),
    );

    renderNowTab();

    expect(screen.getByTestId('whats-happening-carousel')).toBeOnTheScreen();
  });

  it('does not mount WhatsHappeningSection when the feature flag is disabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectWhatsHappeningEnabled) return false;
      return mockSelectorBase(selector);
    });

    renderNowTab();

    // Section is not even mounted, so the mock should never have been called.
    expect(mockWhatsHappeningImpl).not.toHaveBeenCalled();
    expect(screen.queryByTestId('whats-happening-carousel')).toBeNull();
  });

  it('calls whatsHappening.refresh when pull-to-refresh is triggered', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectWhatsHappeningEnabled) return true;
      return mockSelectorBase(selector);
    });

    const { rerender } = renderNowTab();

    expect(mockWhatsHappeningRefresh).not.toHaveBeenCalled();

    rerender(
      <NavigationContainer>
        <NowTab
          {...defaultTabProps}
          refresh={{ trigger: 1, silentRefresh: true }}
        />
      </NavigationContainer>,
    );

    expect(mockWhatsHappeningRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders Predict before Whats Happening', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectWhatsHappeningEnabled) return true;
      if (selector === selectPredictEnabledFlag) return true;
      return mockSelectorBase(selector);
    });
    mockUsePredictionsFeed.mockReturnValue({
      data: [{ id: 'market-1' }],
      isLoading: false,
    });
    mockUseWhatsHappening.mockReturnValue({
      items: [{ id: 'trend-0' }],
      isLoading: false,
      error: null,
      refresh: mockWhatsHappeningRefresh,
    });
    mockWhatsHappeningImpl.mockReturnValue(
      React.createElement('View', {
        testID: whatsHappeningSectionTestId,
      }),
    );

    const { toJSON } = renderNowTab();

    expect(getIntroSectionOrder(toJSON())).toEqual([
      predictSectionTestId,
      whatsHappeningSectionTestId,
    ]);
  });

  it('does not add a divider when Whats Happening feed is empty', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectWhatsHappeningEnabled) return true;
      if (selector === selectPredictEnabledFlag) return true;
      return mockSelectorBase(selector);
    });
    mockUsePredictionsFeed.mockReturnValue({
      data: [{ id: 'market-1' }],
      isLoading: false,
    });
    mockUseWhatsHappening.mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      refresh: mockWhatsHappeningRefresh,
    });

    renderNowTab();

    expect(screen.queryByTestId('explore-section-divider')).toBeNull();
  });

  it('adds a divider between Predict and Whats Happening when Whats Happening has content', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectWhatsHappeningEnabled) return true;
      if (selector === selectPredictEnabledFlag) return true;
      return mockSelectorBase(selector);
    });
    mockUsePredictionsFeed.mockReturnValue({
      data: [{ id: 'market-1' }],
      isLoading: false,
    });
    mockUseWhatsHappening.mockReturnValue({
      items: [{ id: 'trend-0' }],
      isLoading: false,
      error: null,
      refresh: mockWhatsHappeningRefresh,
    });
    mockWhatsHappeningImpl.mockReturnValue(
      React.createElement('View', {
        testID: whatsHappeningSectionTestId,
      }),
    );

    renderNowTab();

    expect(screen.getByTestId('explore-section-divider')).toBeOnTheScreen();
  });
});

describe('NowTab — Perps Movers "View All" navigation', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  // Selector base: perps enabled, everything else off.
  const mockSelectorBase = (selector: unknown) => {
    if (selector === selectPerpsEnabledFlag) return true;
    if (selector === selectPredictEnabledFlag) return false;
    return undefined;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation(mockSelectorBase);
    mockWhatsHappeningImpl.mockReturnValue(null);
  });

  it('calls navigateToPerpsMarketList with "all" filter, price change sort, and gainers direction by default', () => {
    // Return one market so PerpsBlock does not bail out with an early null return.
    mockUsePerpsFeed.mockReturnValue({
      data: [{ market: { symbol: 'BTC', change24hPercent: '5' } }] as never,
      isLoading: false,
      refetch: jest.fn(),
      defaultSortOptionId: 'priceChange' as const,
    });

    renderNowTab();

    fireEvent.press(screen.getByTestId('section-header-view-all-perps'));

    expect(mockNavigateToPerpsMarketList).toHaveBeenCalledTimes(1);
    expect(mockNavigateToPerpsMarketList).toHaveBeenCalledWith(
      expect.anything(), // navigation object
      'all',
      'priceChange',
      { sortDirection: 'desc' },
    );
  });

  it('renders Gainers by default and filters out negative price changes', () => {
    mockUsePerpsFeed.mockReturnValue({
      data: [
        { market: { symbol: 'BTC', change24hPercent: '5' } },
        { market: { symbol: 'ETH', change24hPercent: '-3' } },
      ] as never,
      isLoading: false,
      refetch: jest.fn(),
      defaultSortOptionId: 'priceChange' as const,
    });

    renderNowTab();

    expect(screen.getByTestId('perps-movers-pill-gainers')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-pill-BTC')).toBeOnTheScreen();
    expect(screen.queryByTestId('perps-pill-ETH')).toBeNull();
  });

  it('renders pill skeletons while Perps Movers are loading', () => {
    mockUsePerpsFeed.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
      defaultSortOptionId: 'priceChange' as const,
    });

    renderNowTab();

    expect(
      screen.getAllByTestId('section-pills-skeleton').length,
    ).toBeGreaterThan(0);
  });

  it('renders placeholder perps when price change data is unavailable after loading', () => {
    mockUsePerpsFeed.mockReturnValue({
      data: [
        { market: { symbol: 'BTC', change24hPercent: '' } },
        { market: { symbol: 'ETH', change24hPercent: undefined } },
      ] as never,
      isLoading: false,
      refetch: jest.fn(),
      defaultSortOptionId: 'priceChange' as const,
    });

    renderNowTab();

    expect(screen.queryByTestId('section-pills-skeleton')).toBeNull();
    expect(screen.getByTestId('perps-pill-BTC')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-pill-ETH')).toBeOnTheScreen();
  });

  it('does not render pill skeletons when price change data is valid but filtered out', () => {
    mockUsePerpsFeed.mockReturnValue({
      data: [
        { market: { symbol: 'BTC', change24hPercent: '0%' } },
        { market: { symbol: 'ETH', change24hPercent: '0.00%' } },
      ] as never,
      isLoading: false,
      refetch: jest.fn(),
      defaultSortOptionId: 'priceChange' as const,
    });

    renderNowTab();

    expect(screen.queryByTestId('section-pills-skeleton')).toBeNull();
  });

  it('renders Losers sorted by biggest negative move and passes ascending sort direction to the market list', () => {
    mockUsePerpsFeed.mockReturnValue({
      data: [
        { market: { symbol: 'BTC', change24hPercent: '5' } },
        { market: { symbol: 'ETH', change24hPercent: '-3' } },
        { market: { symbol: 'SOL', change24hPercent: '-8' } },
      ] as never,
      isLoading: false,
      refetch: jest.fn(),
      defaultSortOptionId: 'priceChange' as const,
    });

    renderNowTab();

    fireEvent.press(screen.getByTestId('perps-movers-pill-losers'));

    expect(screen.getByTestId('perps-pill-SOL')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-pill-ETH')).toBeOnTheScreen();
    expect(screen.queryByTestId('perps-pill-BTC')).toBeNull();

    fireEvent.press(screen.getByTestId('section-header-view-all-perps'));

    expect(mockNavigateToPerpsMarketList).toHaveBeenCalledWith(
      expect.anything(),
      'all',
      'priceChange',
      { sortDirection: 'asc' },
    );
  });

  it('does not render the Perps Movers section when the perps flag is disabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return false;
      if (selector === selectPredictEnabledFlag) return false;
      return undefined;
    });

    renderNowTab();

    expect(screen.queryByTestId('section-header-view-all-perps')).toBeNull();
  });
});

describe('NowTab — Predictions navigation', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return false;
      if (selector === selectPredictEnabledFlag) return true;
      if (selector === selectWhatsHappeningEnabled) return false;
      return undefined;
    });
    mockUsePredictionsFeed.mockReturnValue({
      data: [{ id: 'market-1' }],
      isLoading: false,
    });
  });

  it('opens the Predict trending tab from the Predictions section title', () => {
    renderNowTab();

    fireEvent.press(screen.getByTestId(predictSectionTestId));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        tab: 'trending',
      },
    });
  });

  it('opens the World Cup screen from the Predictions section title when World Cup predictions are enabled', () => {
    mockUseWorldCupPredictionsFeed.mockReturnValue({
      data: [{ id: 'world-cup-market-1' }],
      isLoading: false,
      isEnabled: true,
    });

    renderNowTab();

    expect(screen.getByText('World Cup predictions')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(predictSectionTestId));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.WORLD_CUP,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        initialTab: 'all',
      },
    });
  });
});

describe('NowTab — Crypto Movers', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return false;
      if (selector === selectPredictEnabledFlag) return false;
      if (selector === selectWhatsHappeningEnabled) return false;
      return undefined;
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
  });

  it('requests and opens Crypto Movers with the 1h filter', () => {
    renderNowTab();

    expect(mockUseTokensFeed).toHaveBeenCalledWith({
      refresh: defaultRefresh,
      hideRiskyTokens: true,
      timeOption: '1h',
    });

    fireEvent.press(
      screen.getByTestId('section-header-view-all-crypto_movers'),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      { initialTimeOption: '1h' },
    );
  });

  it('renders Crypto Movers across three rows', () => {
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
    mockUseTokensFeed.mockReturnValue({
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
