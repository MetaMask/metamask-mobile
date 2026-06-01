import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PredictHomeFeaturedCarousel from './PredictHomeFeaturedCarousel';
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
    BoxBorderColor: { BorderDefault: 'border-default' },
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

const mockUsePredictionsFeed = jest.fn();
jest.mock(
  '../../../../Views/TrendingView/feeds/predictions/usePredictionsFeed',
  () => ({
    usePredictionsFeed: (...args: unknown[]) => mockUsePredictionsFeed(...args),
  }),
);
jest.mock(
  '../../../../Views/TrendingView/feeds/predictions/PredictionRowItem',
  () => ({
    PredictionCarouselRowItem: ({
      market,
    }: {
      market: { id: string; title: string };
    }) => {
      const ReactNative = jest.requireActual('react-native');
      return (
        <ReactNative.View testID={`prediction-row-${market.id}`}>
          <ReactNative.Text>{market.title}</ReactNative.Text>
        </ReactNative.View>
      );
    },
  }),
);
jest.mock(
  '../../../../Views/TrendingView/feeds/predictions/PredictionsSkeleton',
  () => ({
    __esModule: true,
    default: () => {
      const ReactNative = jest.requireActual('react-native');
      return <ReactNative.View testID="predictions-skeleton" />;
    },
  }),
);

jest.mock(
  '../../../../Views/TrendingView/components/HorizontalCarousel',
  () => {
    const ReactNative = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        data,
        isLoading,
        renderItem,
        Skeleton,
      }: {
        data: { id: string }[];
        isLoading: boolean;
        renderItem: (info: {
          item: { id: string };
          index: number;
          target: 'Cell';
        }) => React.ReactNode;
        Skeleton: React.ComponentType;
      }) => (
        <ReactNative.View testID="mock-horizontal-carousel">
          {isLoading ? (
            <Skeleton />
          ) : (
            data.map((item, index) => (
              <ReactNative.View key={item.id}>
                {renderItem({ item, index, target: 'Cell' })}
              </ReactNative.View>
            ))
          )}
        </ReactNative.View>
      ),
    };
  },
);

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'predict.category.trending': 'Trending',
    };
    return translations[key] || key;
  },
}));

jest.mock('../../contexts', () => ({
  PredictEntryPointProvider: ({ children }: { children?: React.ReactNode }) => {
    const ReactNative = jest.requireActual('react-native');
    return <ReactNative.View>{children}</ReactNative.View>;
  },
}));

describe('PredictHomeFeaturedCarousel', () => {
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
    mockUsePredictionsFeed.mockReturnValue({
      data: [
        { id: 'm1', title: 'Market 1' },
        { id: 'm2', title: 'Market 2' },
      ],
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders container with correct testID', () => {
      render(<PredictHomeFeaturedCarousel />);

      expect(
        screen.getByTestId('predict-home-featured-carousel'),
      ).toBeOnTheScreen();
    });

    it('renders section header with trending text', () => {
      render(<PredictHomeFeaturedCarousel />);

      expect(screen.getByText('Trending')).toBeOnTheScreen();
    });

    it('renders the horizontal carousel with predictions data', () => {
      render(<PredictHomeFeaturedCarousel />);

      expect(screen.getByTestId('mock-horizontal-carousel')).toBeOnTheScreen();
      expect(screen.getByTestId('prediction-row-m1')).toBeOnTheScreen();
      expect(screen.getByTestId('prediction-row-m2')).toBeOnTheScreen();
    });

    it('shows skeleton while loading', () => {
      mockUsePredictionsFeed.mockReturnValue({
        data: [],
        isLoading: true,
        refetch: jest.fn(),
      });

      render(<PredictHomeFeaturedCarousel />);

      expect(screen.getByTestId('predictions-skeleton')).toBeOnTheScreen();
    });

    it('renders header with correct testID', () => {
      render(<PredictHomeFeaturedCarousel />);

      expect(
        screen.getByTestId('predict-home-featured-carousel-header'),
      ).toBeOnTheScreen();
    });

    it('renders arrow icon', () => {
      render(<PredictHomeFeaturedCarousel />);

      expect(screen.getByTestId('icon-ArrowRight')).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('navigates to market list with homepage_featured entryPoint when header is pressed', () => {
      render(<PredictHomeFeaturedCarousel />);

      fireEvent.press(
        screen.getByTestId('predict-home-featured-carousel-header'),
      );

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PREDICT.ROOT,
        {
          screen: Routes.PREDICT.MARKET_LIST,
          params: {
            entryPoint:
              PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED_CAROUSEL,
          },
        },
      );
    });
  });

  describe('feed integration', () => {
    it('subscribes to the trending predictions feed', () => {
      render(<PredictHomeFeaturedCarousel />);

      expect(mockUsePredictionsFeed).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'trending' }),
      );
    });
  });
});
