import React from 'react';
import { View } from 'react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictMarket, PredictOutcome, Recurrence } from '../../types';
import FeaturedCarousel from './FeaturedCarousel';
import { FEATURED_CAROUSEL_TEST_IDS } from './FeaturedCarousel.testIds';

const mockUseFeaturedCarouselData = jest.fn();

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('../../hooks/useFeaturedCarouselData', () => ({
  useFeaturedCarouselData: () => mockUseFeaturedCarouselData(),
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
        data: { id: string }[];
        renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
        keyExtractor: (item: { id: string }) => string;
        testID?: string;
      },
      ref: React.Ref<unknown>,
    ) => {
      MockReact.useImperativeHandle(ref, () => ({}));

      return (
        <MockScrollView testID={testID}>
          {data?.map((item, index) => (
            <MockView key={keyExtractor?.(item) ?? item.id}>
              {renderItem({ item, index })}
            </MockView>
          ))}
        </MockScrollView>
      );
    },
  );

  return {
    FlashList: MockFlashList,
    FlashListRef: {},
  };
});

jest.mock('./FeaturedCarouselCard', () => {
  const { View: MockView } = jest.requireActual('react-native');
  const mockTestIds = jest.requireActual<
    typeof import('./FeaturedCarousel.testIds')
  >('./FeaturedCarousel.testIds');

  return ({ index }: { index: number }) => (
    <MockView testID={mockTestIds.FEATURED_CAROUSEL_TEST_IDS.CARD(index)} />
  );
});

const mockOutcome: PredictOutcome = {
  id: 'outcome-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  title: 'Will BTC hit $200k?',
  description: 'BTC prediction',
  image: 'https://example.com/btc.png',
  status: 'open',
  tokens: [
    { id: 'token-yes', title: 'Yes', price: 0.65 },
    { id: 'token-no', title: 'No', price: 0.35 },
  ],
  volume: 1500000,
  groupItemTitle: 'Bitcoin',
  negRisk: false,
  tickSize: '0.01',
};

const mockMarket: PredictMarket = {
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'btc-200k',
  title: 'Will BTC hit $200k?',
  description: 'BTC prediction',
  image: 'https://example.com/btc.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: [],
  outcomes: [mockOutcome],
  liquidity: 1500000,
  volume: 1500000,
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('FeaturedCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton when loading', () => {
    mockUseFeaturedCarouselData.mockReturnValue({
      markets: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(<FeaturedCarousel />, {
      state: initialState,
    });

    expect(getByTestId(FEATURED_CAROUSEL_TEST_IDS.SKELETON)).toBeOnTheScreen();
  });

  it('renders nothing when error is returned', () => {
    mockUseFeaturedCarouselData.mockReturnValue({
      markets: [],
      isLoading: false,
      error: 'Request failed',
      refetch: jest.fn(),
    });

    const { queryByTestId } = renderWithProvider(<FeaturedCarousel />, {
      state: initialState,
    });

    expect(
      queryByTestId(FEATURED_CAROUSEL_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders nothing when markets are empty', () => {
    mockUseFeaturedCarouselData.mockReturnValue({
      markets: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { queryByTestId } = renderWithProvider(<FeaturedCarousel />, {
      state: initialState,
    });

    expect(
      queryByTestId(FEATURED_CAROUSEL_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders carousel container with market data', () => {
    mockUseFeaturedCarouselData.mockReturnValue({
      markets: [
        mockMarket,
        { ...mockMarket, id: 'market-2', slug: 'btc-210k' },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(<FeaturedCarousel />, {
      state: initialState,
    });

    expect(getByTestId(FEATURED_CAROUSEL_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.FLASH_LIST),
    ).toBeOnTheScreen();
  });

  it('renders pagination dots matching market count', () => {
    mockUseFeaturedCarouselData.mockReturnValue({
      markets: [
        mockMarket,
        { ...mockMarket, id: 'market-2', slug: 'btc-210k' },
        { ...mockMarket, id: 'market-3', slug: 'btc-220k' },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(<FeaturedCarousel />, {
      state: initialState,
    });

    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.PAGINATION_DOTS),
    ).toBeOnTheScreen();
  });

  it('renders the expected number of carousel cards', () => {
    mockUseFeaturedCarouselData.mockReturnValue({
      markets: [
        mockMarket,
        { ...mockMarket, id: 'market-2', slug: 'btc-210k' },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <FeaturedCarousel />,
      {
        state: initialState,
      },
    );

    expect(getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD(0))).toBeOnTheScreen();
    expect(getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD(1))).toBeOnTheScreen();
    expect(
      queryByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD(2)),
    ).not.toBeOnTheScreen();
  });

  it('resets activeIndex when refetch returns fewer markets', () => {
    mockUseFeaturedCarouselData.mockReturnValue({
      markets: [
        mockMarket,
        { ...mockMarket, id: 'market-2', slug: 'btc-210k' },
        { ...mockMarket, id: 'market-3', slug: 'btc-220k' },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { rerender, getByTestId } = renderWithProvider(<FeaturedCarousel />, {
      state: initialState,
    });

    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.PAGINATION_DOTS),
    ).toBeOnTheScreen();

    mockUseFeaturedCarouselData.mockReturnValue({
      markets: [mockMarket],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    rerender(<FeaturedCarousel />);

    expect(getByTestId(FEATURED_CAROUSEL_TEST_IDS.CARD(0))).toBeOnTheScreen();
  });
});
