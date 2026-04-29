import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SportsTab from './SportsTab';
import Routes from '../../../../constants/navigation/Routes';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import type { TabProps } from '../hooks/useExploreRefresh';
import { useSelector } from 'react-redux';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUsePredictionsFeed = jest.fn();
const mockUseSportsMarketsFeed = jest.fn();

jest.mock('../feeds/predictions/usePredictionsFeed', () => ({
  usePredictionsFeed: (...args: unknown[]) => mockUsePredictionsFeed(...args),
}));

jest.mock('../feeds/predictions/useSportsMarketsFeed', () => ({
  useSportsMarketsFeed: (...args: unknown[]) =>
    mockUseSportsMarketsFeed(...args),
}));

jest.mock('../feeds/predictions/PredictionRowItem', () => ({
  PredictionCarouselRowItem: () => null,
}));

jest.mock('../components/HorizontalCarousel', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/PillRow', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    FlashList: (props: { testID?: string }) =>
      React.createElement(View, { testID: props.testID }),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual<typeof import('../../../../util/theme')>(
    '../../../../util/theme',
  );
  return {
    ...actual,
    useTheme: () => actual.mockTheme,
    useAppThemeFromContext: () => actual.mockTheme,
  };
});

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const defaultActive = () => ({
  isFetching: false,
  marketData: [{ id: 'market-1' }] as unknown[],
  hasMore: false,
  isFetchingMore: false,
  fetchMore: jest.fn(),
});

const defaultSportsMarkets = () => ({
  pills: [{ key: 'soccer', name: 'Soccer' }],
  activeKey: 'soccer',
  select: jest.fn(),
  active: defaultActive(),
  isLoading: false,
  refetch: jest.fn(),
});

const defaultTabProps: TabProps = {
  refresh: { trigger: 0, silentRefresh: true },
  refreshing: false,
  onRefresh: jest.fn(),
};

describe('SportsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPredictEnabledFlag) {
        return false;
      }
      return undefined;
    });

    mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: false });
    mockUseSportsMarketsFeed.mockReturnValue(defaultSportsMarkets());
  });

  describe('all sports section', () => {
    it('always renders the all sports header', () => {
      const { getByTestId } = render(<SportsTab {...defaultTabProps} />);

      expect(
        getByTestId('section-header-view-all-all_sports'),
      ).toBeOnTheScreen();
    });

    it('renders empty state when active feed has no markets and is not fetching', () => {
      mockUseSportsMarketsFeed.mockReturnValue({
        ...defaultSportsMarkets(),
        active: {
          isFetching: false,
          marketData: [],
          hasMore: false,
          isFetchingMore: false,
          fetchMore: jest.fn(),
        },
      });

      const { getByTestId } = render(<SportsTab {...defaultTabProps} />);

      expect(getByTestId('all-sports-empty-state')).toBeOnTheScreen();
    });

    it('renders the markets list when active feed has data', () => {
      const { getByTestId } = render(<SportsTab {...defaultTabProps} />);

      expect(getByTestId('all-sports-list-soccer')).toBeOnTheScreen();
    });

    it('calls fetchMore when load more is pressed', () => {
      const fetchMore = jest.fn();
      mockUseSportsMarketsFeed.mockReturnValue({
        ...defaultSportsMarkets(),
        active: {
          isFetching: false,
          marketData: [{ id: 'm1' }] as unknown[],
          hasMore: true,
          isFetchingMore: false,
          fetchMore,
        },
      });

      const { getByTestId } = render(<SportsTab {...defaultTabProps} />);

      fireEvent.press(getByTestId('all-sports-load-more'));

      expect(fetchMore).toHaveBeenCalledTimes(1);
    });
  });

  describe('sports predictions section', () => {
    it('omits predictions when predict is disabled', () => {
      const { queryByTestId } = render(<SportsTab {...defaultTabProps} />);

      expect(
        queryByTestId('section-header-view-all-sports_predictions'),
      ).not.toBeOnTheScreen();
    });

    it('renders predictions header when predict is enabled and feed is loading', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPredictEnabledFlag) {
          return true;
        }
        return undefined;
      });
      mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<SportsTab {...defaultTabProps} />);

      expect(
        getByTestId('section-header-view-all-sports_predictions'),
      ).toBeOnTheScreen();
    });

    it('navigates to predict market list with sports tab when header is pressed', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPredictEnabledFlag) {
          return true;
        }
        return undefined;
      });
      mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: true });

      const { getByTestId } = render(<SportsTab {...defaultTabProps} />);

      fireEvent.press(
        getByTestId('section-header-view-all-sports_predictions'),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: { tab: 'sports' },
      });
    });
  });

  describe('feed hooks', () => {
    it('passes refresh into predictions and sports markets feeds', () => {
      const refresh = { trigger: 3, silentRefresh: false };

      render(<SportsTab {...defaultTabProps} refresh={refresh} />);

      expect(mockUsePredictionsFeed).toHaveBeenCalledWith({
        variant: 'sports',
        refresh,
      });
      expect(mockUseSportsMarketsFeed).toHaveBeenCalledWith({ refresh });
    });
  });
});
