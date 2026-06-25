import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
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

describe('SportsTab — Predictions carousel', () => {
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
    mockUseWorldCupPredictionsFeed.mockReturnValue({
      data: [],
      isLoading: false,
      isEnabled: false,
    });
  });

  it('opens the sports predictions tab when World Cup predictions are disabled', () => {
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

  it('shows World Cup predictions and opens the World Cup screen when enabled', () => {
    mockUseWorldCupPredictionsFeed.mockReturnValue({
      data: [{ id: 'world-cup-market-1' }],
      isLoading: false,
      isEnabled: true,
    });

    renderSportsTab();

    expect(screen.getByText('World Cup predictions')).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId('section-header-view-all-sports_predictions'),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.WORLD_CUP,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
        initialTab: 'all',
      },
    });
  });
});
