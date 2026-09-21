import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../../UI/Predict/constants/eventNames';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import SportsTab from './SportsTab';
import type { RefreshConfig } from '../hooks/useExploreRefresh';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      icon: { default: 'black' },
      primary: { default: 'blue' },
    },
  }),
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

const mockUseSportsMarketsFeed = jest.fn(() => ({
  pills: [],
  activeKey: 'soccer',
  select: jest.fn(),
  active: {
    marketData: [],
    isFetching: false,
    isFetchingMore: false,
    hasMore: false,
    fetchMore: jest.fn(),
  },
}));
jest.mock('../feeds/predictions/useSportsMarketsFeed', () => ({
  useSportsMarketsFeed: () => mockUseSportsMarketsFeed(),
}));

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

const defaultRefresh: RefreshConfig = { trigger: 0, silentRefresh: true };
const defaultTabProps = {
  refresh: defaultRefresh,
  refreshing: false,
  onRefresh: jest.fn(),
};

const renderSportsTab = () =>
  render(
    <NavigationContainer>
      <SportsTab {...defaultTabProps} />
    </NavigationContainer>,
  );

describe('SportsTab', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPredictEnabledFlag) return true;
      return undefined;
    });
    mockUsePredictionsFeed.mockReturnValue({
      data: [{ id: 'sports-market-1' }],
      isLoading: false,
    });
  });

  it('opens the sports predictions tab', () => {
    renderSportsTab();

    fireEvent.press(
      screen.getByTestId('section-header-view-all-sports_predictions'),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        tab: 'sports',
      },
    });
  });

  it('keeps the same market key when its list position changes', () => {
    const market = { id: 'sports-market-1' };
    const { UNSAFE_getByType } = renderSportsTab();
    const { keyExtractor } = UNSAFE_getByType(FlashList).props;

    const initialKey = keyExtractor(market, 0);
    const reorderedKey = keyExtractor(market, 1);

    expect(initialKey).toBe('all_sports-soccer-sports-market-1');
    expect(reorderedKey).toBe(initialKey);
  });
});
