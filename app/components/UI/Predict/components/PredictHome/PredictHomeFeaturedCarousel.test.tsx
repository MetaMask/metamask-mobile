import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import PredictHomeFeaturedCarousel from './PredictHomeFeaturedCarousel';
import { PREDICT_HOME_FEATURED_CAROUSEL_TEST_IDS } from './PredictHomeFeaturedCarousel.testIds';

const mockUsePredictionsFeed = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock(
  '../../../../Views/TrendingView/feeds/predictions/usePredictionsFeed',
  () => ({
    usePredictionsFeed: (...args: unknown[]) => mockUsePredictionsFeed(...args),
  }),
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

jest.mock('@shopify/flash-list', () => {
  const MockReact = jest.requireActual('react');
  const { View: MockView, ScrollView: MockScrollView } =
    jest.requireActual('react-native');

  const MockFlashList = MockReact.forwardRef(
    (
      {
        data,
        renderItem,
        keyExtractor,
        testID,
      }: {
        data: unknown[];
        renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
        keyExtractor: (item: unknown, index: number) => string;
        testID?: string;
      },
      ref: React.Ref<unknown>,
    ) => {
      MockReact.useImperativeHandle(ref, () => ({}));

      return (
        <MockScrollView testID={testID}>
          {data?.map((item, index) => (
            <MockView key={keyExtractor?.(item, index) ?? index}>
              {renderItem({ item, index })}
            </MockView>
          ))}
        </MockScrollView>
      );
    },
  );

  return { FlashList: MockFlashList, FlashListRef: {} };
});

jest.mock('../PredictMarket', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});

jest.mock('../PredictMarketSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => (
      <View testID={testID ?? 'predict-market-skeleton'} />
    ),
  };
});

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

const renderCarousel = () =>
  renderWithProvider(<PredictHomeFeaturedCarousel />, {
    state: { engine: { backgroundState } },
  });

describe('PredictHomeFeaturedCarousel', () => {
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

  it('renders the section container', () => {
    const { getByTestId } = renderCarousel();

    expect(
      getByTestId(PREDICT_HOME_FEATURED_CAROUSEL_TEST_IDS.CAROUSEL),
    ).toBeOnTheScreen();
  });

  it('renders a pressable trending header', () => {
    const { getByTestId, getByText } = renderCarousel();

    expect(
      getByTestId(PREDICT_HOME_FEATURED_CAROUSEL_TEST_IDS.HEADER),
    ).toBeOnTheScreen();
    expect(getByText(strings('predict.category.trending'))).toBeOnTheScreen();
  });

  it('renders prediction cards in the horizontal carousel', () => {
    const { getByTestId } = renderCarousel();

    expect(getByTestId('predict-home-featured-flash-list')).toBeOnTheScreen();
    expect(getByTestId('predict-market-row-item-m1')).toBeOnTheScreen();
    expect(getByTestId('predict-market-row-item-m2')).toBeOnTheScreen();
  });

  it('renders skeleton cards while the feed is loading', () => {
    mockUsePredictionsFeed.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
    });

    const { getAllByTestId } = renderCarousel();

    expect(getAllByTestId('predict-market-skeleton').length).toBeGreaterThan(0);
  });

  it('navigates to the market list when the header is pressed', () => {
    const { getByTestId } = renderCarousel();

    fireEvent.press(
      getByTestId(PREDICT_HOME_FEATURED_CAROUSEL_TEST_IDS.HEADER),
    );

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED_CAROUSEL,
      },
    });
  });

  it('subscribes to the trending predictions feed', () => {
    renderCarousel();

    expect(mockUsePredictionsFeed).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'trending' }),
    );
  });
});
