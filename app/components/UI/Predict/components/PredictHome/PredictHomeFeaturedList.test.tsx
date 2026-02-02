import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PredictHomeFeaturedList from './PredictHomeFeaturedList';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...classes: (string | boolean | undefined)[]) => ({
      testStyle: classes.filter(Boolean).join(' '),
    }),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <ReactNative.View testID={testID} {...props}>
        {children}
      </ReactNative.View>
    ),
    BoxFlexDirection: { Row: 'row' },
    BoxAlignItems: { Center: 'center' },
    Text: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <ReactNative.Text testID={testID} {...props}>
        {children}
      </ReactNative.Text>
    ),
    TextVariant: { HeadingMd: 'heading-md' },
    TextColor: { TextDefault: 'text-default' },
    Icon: ({
      name,
      testID,
      ...props
    }: {
      name: string;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <ReactNative.View testID={testID || `icon-${name}`} {...props}>
        <ReactNative.Text>{name}</ReactNative.Text>
      </ReactNative.View>
    ),
    IconName: { ArrowRight: 'ArrowRight' },
    IconSize: { Sm: 'sm' },
    IconColor: { IconAlternative: 'icon-alternative' },
  };
});

jest.mock('../../hooks/usePredictMarketData', () => ({
  usePredictMarketData: jest.fn(),
}));

const mockPredictMarketRowItem = jest.fn();
jest.mock('../PredictMarketRowItem', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => {
      mockPredictMarketRowItem(props);
      return <ReactNative.View testID="mock-market-row-item" />;
    },
  };
});

jest.mock('./PredictHomeSkeleton', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <ReactNative.View testID="predict-home-skeleton" />,
  };
});

jest.mock('../../contexts', () => ({
  PredictEntryPointProvider: ({ children }: { children: React.ReactNode }) => {
    const ReactNative = jest.requireActual('react-native');
    return (
      <ReactNative.View testID="predict-entry-point-provider">
        {children}
      </ReactNative.View>
    );
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'predict.category.trending': 'Trending',
    };
    return translations[key] || key;
  },
}));

import { usePredictMarketData } from '../../hooks/usePredictMarketData';

const mockUsePredictMarketData = usePredictMarketData as jest.Mock;

const mockMarket = {
  id: 'market-1',
  title: 'Test Market',
  outcomes: [],
};

const mockMarket2 = {
  id: 'market-2',
  title: 'Test Market 2',
  outcomes: [],
};

describe('PredictHomeFeaturedList', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => false),
    getId: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
  };

  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as ReturnType<typeof useNavigation>,
    );
    mockUsePredictMarketData.mockReturnValue({
      marketData: [mockMarket, mockMarket2],
      isFetching: false,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders container with correct testID', () => {
      render(<PredictHomeFeaturedList />);

      expect(
        screen.getByTestId('predict-home-featured-list'),
      ).toBeOnTheScreen();
    });

    it('renders header with Trending text', () => {
      render(<PredictHomeFeaturedList />);

      expect(screen.getByText('Trending')).toBeOnTheScreen();
    });

    it('renders header with correct testID', () => {
      render(<PredictHomeFeaturedList />);

      expect(
        screen.getByTestId('predict-home-featured-list-header'),
      ).toBeOnTheScreen();
    });

    it('renders arrow icon', () => {
      render(<PredictHomeFeaturedList />);

      expect(screen.getByTestId('icon-ArrowRight')).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('navigates to market list with homepage_featured entryPoint when header is pressed', () => {
      render(<PredictHomeFeaturedList />);

      fireEvent.press(screen.getByTestId('predict-home-featured-list-header'));

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PREDICT.ROOT,
        {
          screen: Routes.PREDICT.MARKET_LIST,
          params: {
            entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED,
          },
        },
      );
    });
  });

  describe('data loading', () => {
    it('renders loading skeleton when fetching and no data', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: true,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      render(<PredictHomeFeaturedList />);

      expect(screen.getByTestId('predict-home-skeleton')).toBeOnTheScreen();
    });

    it('renders market items when data is available', () => {
      render(<PredictHomeFeaturedList />);

      const marketItems = screen.getAllByTestId('mock-market-row-item');
      expect(marketItems).toHaveLength(2);
    });

    it('returns null when no data and not loading', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: false,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { queryByTestId } = render(<PredictHomeFeaturedList />);

      expect(queryByTestId('predict-home-featured-list')).toBeNull();
    });
  });

  describe('entry point', () => {
    it('passes correct entryPoint to PredictMarketRowItem', () => {
      render(<PredictHomeFeaturedList />);

      expect(mockPredictMarketRowItem).toHaveBeenCalledWith(
        expect.objectContaining({
          entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED,
        }),
      );
    });

    it('passes market data to PredictMarketRowItem', () => {
      render(<PredictHomeFeaturedList />);

      expect(mockPredictMarketRowItem).toHaveBeenCalledWith(
        expect.objectContaining({
          market: mockMarket,
        }),
      );
    });
  });

  describe('usePredictMarketData hook', () => {
    it('calls usePredictMarketData with trending category and pageSize 6', () => {
      render(<PredictHomeFeaturedList />);

      expect(mockUsePredictMarketData).toHaveBeenCalledWith({
        category: 'trending',
        pageSize: 6,
      });
    });
  });

  describe('custom testID', () => {
    it('renders container with custom testID when provided', () => {
      render(<PredictHomeFeaturedList testID="custom-test-id" />);

      expect(screen.getByTestId('custom-test-id')).toBeOnTheScreen();
    });
  });
});
