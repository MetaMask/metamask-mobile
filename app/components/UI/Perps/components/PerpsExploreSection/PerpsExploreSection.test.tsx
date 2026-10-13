import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PerpsExploreSection from './PerpsExploreSection';
import { clearExploreSessionTab } from './exploreSessionTab';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import {
  selectPerpsProductsEnabledFlag,
  selectPerpsWatchlistEnabledFlag,
} from '../../selectors/featureFlags';
import { selectPerpsWatchlistMarkets } from '../../selectors/perpsController';
import Routes from '../../../../../constants/navigation/Routes';
import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';
import type { PerpsCategory } from '../../hooks/usePerpsCategories';
import type { PerpsMarketData } from '@metamask/perps-controller';

const TEST_ID = PerpsHomeViewSelectorsIDs.EXPLORE_SECTION;

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnValue({
  build: jest.fn().mockReturnValue({ built: true }),
});
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
});
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    PERPS_UI_INTERACTION: 'PERPS_UI_INTERACTION',
  },
}));

jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return { ...actual, useTheme: () => actual.mockTheme };
});

let mockCategories: PerpsCategory[] = [];
let mockHasNewMarkets = false;
let mockMarkets: PerpsMarketData[] = [];
let mockMarketsLoading = false;

jest.mock('../../hooks/usePerpsCategories', () => ({
  usePerpsCategories: () => mockCategories,
  NEW_CATEGORY: { id: 'new', label: 'New' },
}));

jest.mock('../../hooks/useHasNewMarkets', () => ({
  useHasNewMarkets: () => mockHasNewMarkets,
}));

jest.mock('../../hooks/usePerpsMarkets', () => ({
  usePerpsMarkets: () => ({
    markets: mockMarkets,
    isLoading: mockMarketsLoading,
  }),
}));

jest.mock('../PerpsRowSkeleton', () => {
  const { View: MockView } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return function MockPerpsRowSkeleton() {
    return ReactActual.createElement(MockView, {
      testID: 'explore-rows-skeleton',
    });
  };
});

jest.mock('../../../Trending/components/SectionPillsSkeleton', () => {
  const { View: MockView } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    SectionPillsSkeleton: () =>
      ReactActual.createElement(MockView, { testID: 'explore-pills-skeleton' }),
  };
});

jest.mock('../PerpsMarketList', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable: MockPressable, Text: MockText } =
    jest.requireActual('react-native');
  return function MockPerpsMarketList({
    markets,
    onMarketPress,
    testID,
  }: {
    markets: { symbol: string }[];
    onMarketPress: (market: { symbol: string }) => void;
    testID?: string;
  }) {
    return ReactActual.createElement(
      ReactActual.Fragment,
      null,
      markets.map((market) =>
        ReactActual.createElement(
          MockPressable,
          {
            key: market.symbol,
            testID: `${testID}-${market.symbol}`,
            onPress: () => onMarketPress(market),
          },
          ReactActual.createElement(MockText, null, market.symbol),
        ),
      ),
    );
  };
});

const cryptoMarket = {
  symbol: 'BTC',
  name: 'Bitcoin',
  isHip3: false,
  marketType: 'crypto',
  volume: '$2B',
} as PerpsMarketData;

const stockMarket = {
  symbol: 'AAPL',
  name: 'Apple',
  isHip3: true,
  marketType: 'stock',
  volume: '$1B',
} as PerpsMarketData;

const CATEGORIES: PerpsCategory[] = [
  { id: 'crypto', label: 'Crypto' },
  { id: 'stock', label: 'Stocks' },
  { id: 'pre-ipo', label: 'Pre-IPO' },
];

describe('PerpsExploreSection', () => {
  let watchlistEnabled = true;
  let productsEnabled = true;
  let watchlistSymbols: string[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    clearExploreSessionTab();
    mockCategories = CATEGORIES;
    mockHasNewMarkets = false;
    mockMarkets = [cryptoMarket, stockMarket];
    mockMarketsLoading = false;
    watchlistEnabled = true;
    productsEnabled = true;
    watchlistSymbols = [];
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsWatchlistEnabledFlag) return watchlistEnabled;
      if (selector === selectPerpsProductsEnabledFlag) return productsEnabled;
      if (selector === selectPerpsWatchlistMarkets) return watchlistSymbols;
      return undefined;
    });
  });

  it('shows a skeleton and does not select Crypto while markets are loading', () => {
    mockMarketsLoading = true;
    watchlistSymbols = ['BTC'];

    const { queryByTestId, getByTestId } = render(<PerpsExploreSection />);

    expect(getByTestId('explore-pills-skeleton')).toBeOnTheScreen();
    expect(getByTestId('explore-rows-skeleton')).toBeOnTheScreen();
    expect(queryByTestId(`${TEST_ID}-tab-crypto`)).toBeNull();
    expect(queryByTestId(`${TEST_ID}-tab-watchlist`)).toBeNull();
    expect(queryByTestId(`${TEST_ID}-see-more`)).toBeNull();
  });

  it('selects Watchlist after load when the watchlist has a market', () => {
    mockMarketsLoading = true;
    watchlistSymbols = ['BTC'];
    const view = render(<PerpsExploreSection />);

    expect(view.queryByTestId(`${TEST_ID}-tab-crypto`)).toBeNull();

    mockMarketsLoading = false;
    view.rerender(<PerpsExploreSection />);

    expect(
      view.getByTestId(`${TEST_ID}-tab-watchlist`).props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      view.getByTestId(`${TEST_ID}-tab-crypto`).props.accessibilityState,
    ).toMatchObject({ selected: false });
    expect(view.getByTestId(`${TEST_ID}-list-BTC`)).toBeOnTheScreen();
    expect(view.queryByTestId(`${TEST_ID}-list-AAPL`)).toBeNull();
  });

  it('selects Crypto when the watchlist is empty', () => {
    const { getByTestId, queryByTestId } = render(<PerpsExploreSection />);

    expect(
      getByTestId(`${TEST_ID}-tab-crypto`).props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(getByTestId(`${TEST_ID}-list-BTC`)).toBeOnTheScreen();
    expect(queryByTestId(`${TEST_ID}-list-AAPL`)).toBeNull();
  });

  it('hides the Watchlist tab and defaults to Crypto when watchlist is disabled', () => {
    watchlistEnabled = false;
    watchlistSymbols = ['BTC'];

    const { queryByTestId, getByTestId } = render(<PerpsExploreSection />);

    expect(queryByTestId(`${TEST_ID}-tab-watchlist`)).toBeNull();
    expect(
      getByTestId(`${TEST_ID}-tab-crypto`).props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('hides product-only categories when the products flag is off', () => {
    productsEnabled = false;

    const { queryByTestId, getByTestId } = render(<PerpsExploreSection />);

    expect(queryByTestId(`${TEST_ID}-tab-pre-ipo`)).toBeNull();
    expect(getByTestId(`${TEST_ID}-tab-crypto`)).toBeOnTheScreen();
    expect(getByTestId(`${TEST_ID}-tab-stock`)).toBeOnTheScreen();
  });

  it('keeps an explicit tab for the rest of the session', () => {
    const first = render(<PerpsExploreSection />);
    fireEvent.press(first.getByTestId(`${TEST_ID}-tab-stock`));
    expect(first.getByTestId(`${TEST_ID}-list-AAPL`)).toBeOnTheScreen();
    first.unmount();

    const second = render(<PerpsExploreSection />);
    expect(
      second.getByTestId(`${TEST_ID}-tab-stock`).props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      second.getByTestId(`${TEST_ID}-tab-crypto`).props.accessibilityState,
    ).toMatchObject({ selected: false });

    clearExploreSessionTab();
    second.unmount();
    const third = render(<PerpsExploreSection />);
    expect(
      third.getByTestId(`${TEST_ID}-tab-crypto`).props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('opens the market list for the selected category from the header and See more', () => {
    const { getByText, getByTestId } = render(<PerpsExploreSection />);

    fireEvent.press(getByText('Explore'));
    fireEvent.press(getByTestId(`${TEST_ID}-see-more`));

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'crypto',
        source: 'perps_home',
      },
    });
  });

  it('opens the watchlist market list from See more', () => {
    watchlistSymbols = ['BTC'];
    const { getByTestId } = render(<PerpsExploreSection />);

    fireEvent.press(getByTestId(`${TEST_ID}-see-more`));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        showWatchlistOnly: true,
        source: 'perps_home',
      },
    });
  });

  it('forwards transactionActiveAbTests and opens market details', () => {
    const transactionActiveAbTests = [
      createActiveABTestAssignment(
        'tatTAT3793AbtestPerpsHomeExplore',
        'treatment',
      ),
    ];
    const { getByText, getByTestId } = render(
      <PerpsExploreSection
        transactionActiveAbTests={transactionActiveAbTests}
      />,
    );

    fireEvent.press(getByText('Explore'));
    fireEvent.press(getByTestId(`${TEST_ID}-list-BTC`));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'crypto',
        source: 'perps_home',
        transactionActiveAbTests,
      },
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: cryptoMarket,
        source: 'perps_home',
        source_section: 'crypto',
        transactionActiveAbTests,
      },
    });
  });

  it('renders nothing when there are no tabs after markets load', () => {
    mockCategories = [];
    mockMarkets = [];
    watchlistEnabled = false;

    const { toJSON } = render(<PerpsExploreSection />);

    expect(toJSON()).toBeNull();
  });
});
