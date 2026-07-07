/**
 * MacroTab — unit tests
 *
 * Covers:
 * 1. Renders perps section when data is available.
 * 2. Returns null for the perps block when data is empty and not loading.
 * 3. Hides the perps section when the perps feature flag is off.
 * 4. Calls navigateToPerpsMarketList with the active filter and sort option when "View All" is pressed.
 */

jest.mock('@shopify/flash-list', () => {
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return { FlashList: RN.FlatList };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const twFn = () => ({});
  twFn.style = () => ({});
  return { useTailwind: () => twFn };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(() => true),
  PerpsSectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('../../../UI/Predict', () => ({
  selectPredictEnabledFlag: jest.fn(() => false),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../search/analytics', () => ({
  trackExploreInteracted: jest.fn(),
  trackExploreSectionSeeAll: jest.fn(),
}));

jest.mock('../feeds/perps/usePerpsFeed');
jest.mock('../feeds/predictions/usePredictionsFeed');

jest.mock('../feeds/predictions/PredictionsCarouselSection', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPredictionsCarouselSection() {
    return <View testID="predictions-carousel" />;
  };
});

jest.mock('../feeds/perps/PerpsSectionProvider', () => {
  const { Fragment } = jest.requireActual('react');
  return function MockPerpsSectionProvider({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <Fragment>{children}</Fragment>;
  };
});

const mockNavigateToPerpsMarketList = jest.fn();
jest.mock('../feeds/perps/perpsNavigation', () => ({
  navigateToPerpsMarketList: (...args: unknown[]) =>
    mockNavigateToPerpsMarketList(...args),
}));

jest.mock('../feeds/perps/PerpsToggleBlock', () => {
  const { TouchableOpacity, Text: RNText } = jest.requireActual('react-native');
  const MockPerpsToggleBlock = ({
    onViewAll,
    sortOptionId,
    defaultPillKey,
    headerTestID,
  }: {
    title: string;
    onViewAll: (filter: string, sort: string) => void;
    sortOptionId: string;
    defaultPillKey: string;
    headerTestID: string;
    isLoading: boolean;
  }) => (
    <TouchableOpacity
      testID={headerTestID}
      onPress={() => onViewAll(defaultPillKey, sortOptionId)}
    >
      <RNText testID="mock-perps-toggle-block">perps-block</RNText>
    </TouchableOpacity>
  );
  MockPerpsToggleBlock.displayName = 'MockPerpsToggleBlock';
  return MockPerpsToggleBlock;
});

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import MacroTab from './MacroTab';

const mockUsePerpsFeed = jest.mocked(usePerpsFeed);
const mockUsePredictionsFeed = jest.mocked(usePredictionsFeed);

const mockNavigation = { navigate: jest.fn() };

const makeMarket = (symbol: string, type: string): PerpsMarketData =>
  ({
    symbol,
    name: symbol,
    marketType: type,
    price: '$1.00',
    change24h: '+1%',
    change24hPercent: '1',
    volume: '$100M',
    maxLeverage: '10x',
    isHip3: false,
  }) as PerpsMarketData;

const makeFeedItem = (market: PerpsMarketData) => ({
  market,
  isWatchlisted: false,
});

const DEFAULT_PERPS_FEED = {
  data: [
    makeFeedItem(makeMarket('AAPL', 'stock')),
    makeFeedItem(makeMarket('MSFT', 'pre-ipo')),
    makeFeedItem(makeMarket('GOLD', 'commodity')),
  ],
  isLoading: false,
  defaultSortOptionId: 'volume' as const,
  refetch: jest.fn(),
};

const DEFAULT_REFRESH = { trigger: 0, silentRefresh: false };

const renderTab = () =>
  render(
    <MacroTab
      refresh={DEFAULT_REFRESH}
      refreshing={false}
      onRefresh={jest.fn()}
    />,
  );

describe('MacroTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      return false;
    });
    mockUsePerpsFeed.mockReturnValue(DEFAULT_PERPS_FEED);
    mockUsePredictionsFeed.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  it('renders the perps toggle block when data is available', () => {
    const { getByTestId } = renderTab();
    expect(getByTestId('mock-perps-toggle-block')).toBeTruthy();
  });

  it('does not render the perps block when data is empty and not loading', () => {
    mockUsePerpsFeed.mockReturnValue({
      ...DEFAULT_PERPS_FEED,
      data: [],
      isLoading: false,
    });

    const { queryByTestId } = renderTab();
    expect(queryByTestId('mock-perps-toggle-block')).toBeNull();
  });

  it('renders the perps block while loading even with no data', () => {
    mockUsePerpsFeed.mockReturnValue({
      ...DEFAULT_PERPS_FEED,
      data: [],
      isLoading: true,
    });

    const { getByTestId } = renderTab();
    expect(getByTestId('mock-perps-toggle-block')).toBeTruthy();
  });

  it('does not render the perps section when perps feature flag is off', () => {
    (useSelector as jest.Mock).mockReturnValue(false);

    const { queryByTestId } = renderTab();
    expect(queryByTestId('mock-perps-toggle-block')).toBeNull();
  });

  it('calls navigateToPerpsMarketList with correct filter when View All is pressed', () => {
    const { getByTestId } = renderTab();

    act(() => {
      fireEvent.press(
        getByTestId('section-header-view-all-macro_stocks_commodity_perps'),
      );
    });

    expect(mockNavigateToPerpsMarketList).toHaveBeenCalledWith(
      mockNavigation,
      'stock',
      'volume',
    );
  });
});
