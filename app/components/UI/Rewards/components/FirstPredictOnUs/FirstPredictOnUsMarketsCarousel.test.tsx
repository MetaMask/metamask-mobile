import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { PredictMarket, PredictOutcome } from '../../../Predict/types';
import PredictMarketCard from '../../../Predict/components/PredictMarket';
import { FEATURED_CAROUSEL_TEST_IDS } from '../../../Predict/components/FeaturedCarousel/FeaturedCarousel.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { markFirstPredictionOnUsOutcomeOpened } from '../../../../../reducers/rewards';
import FirstPredictOnUsMarketsCarousel from './FirstPredictOnUsMarketsCarousel';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'event' }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties.mockReturnValue({
    build: mockBuild,
  }),
  build: mockBuild,
}));

jest.mock('../../../Predict/components/PredictMarket', () =>
  jest.fn(() => null),
);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
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

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const triggerCarouselLayout = (
  getByTestId: (testId: string) => unknown,
  width = 375,
) => {
  fireEvent(
    getByTestId('first-predict-on-us-splash-carousel') as never,
    'layout',
    {
      nativeEvent: { layout: { width, height: 400, x: 0, y: 0 } },
    },
  );
};

describe('FirstPredictOnUsMarketsCarousel', () => {
  const buildMarket = (id: string): PredictMarket =>
    ({
      id,
      providerId: 'polymarket',
      slug: `market-${id}`,
      title: `Market ${id}`,
      description: `Market ${id}`,
      image: 'https://example.com/image.png',
      status: 'open',
      recurrence: 'none',
      category: 'sports',
      tags: [],
      outcomes: [],
      liquidity: 100,
      volume: 200,
    }) as PredictMarket;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddProperties.mockReturnValue({ build: mockBuild });
    jest.mocked(useAnalytics).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as never);
  });

  it('renders a Predict market card for each configured market', () => {
    const markets = [buildMarket('1'), buildMarket('2'), buildMarket('3')];

    const { getByTestId } = render(
      <FirstPredictOnUsMarketsCarousel
        confirmLabel="Confirm"
        markets={markets}
        tradeDescriptionTemplate="Bought {amount} of {outcome}"
        tradePlacedLabel="Trade placed"
        usdAmount={5}
      />,
    );
    triggerCarouselLayout(getByTestId);

    expect(PredictMarketCard).toHaveBeenCalledTimes(3);
    expect(PredictMarketCard).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        isCarousel: true,
        cardPressDisabled: true,
        market: markets[0],
        onBuyButtonPress: expect.any(Function),
      }),
      undefined,
    );
  });

  it('renders pagination dots for multiple markets', () => {
    const { getByTestId } = render(
      <FirstPredictOnUsMarketsCarousel
        confirmLabel="Confirm"
        markets={[buildMarket('1'), buildMarket('2')]}
        tradeDescriptionTemplate="Bought {amount} of {outcome}"
        tradePlacedLabel="Trade placed"
        usdAmount={5}
      />,
    );

    expect(
      getByTestId('first-predict-on-us-splash-carousel'),
    ).toBeOnTheScreen();
    expect(
      getByTestId(FEATURED_CAROUSEL_TEST_IDS.PAGINATION_DOTS),
    ).toBeOnTheScreen();
  });

  it('navigates to the First Predict On Us order sheet from an outcome button override', () => {
    const market = buildMarket('1');
    const outcome: PredictOutcome = {
      id: 'outcome-1',
      marketId: market.id,
      providerId: market.providerId,
      title: 'Yes',
      description: 'Yes',
      image: market.image,
      status: 'open',
      tokens: [{ id: 'token-yes', title: 'Yes', price: 0.5 }],
      volume: 100,
      groupItemTitle: 'Yes',
    };
    const outcomeToken = outcome.tokens[0];

    const { getByTestId } = render(
      <FirstPredictOnUsMarketsCarousel
        confirmLabel="Confirm"
        markets={[market]}
        tradeDescriptionTemplate="Bought {amount} of {outcome}"
        tradePlacedLabel="Trade placed"
        usdAmount={5}
      />,
    );
    triggerCarouselLayout(getByTestId);

    const firstCardProps = jest.mocked(PredictMarketCard).mock.calls[0][0];
    act(() => {
      const handled = firstCardProps.onBuyButtonPress?.({
        market,
        outcome,
        outcomeToken,
      });
      expect(handled).toBe(true);
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.FIRST_PREDICTION_ON_US_OUTCOME_OPENED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      market_id: '1',
      outcome: 'Yes',
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      markFirstPredictionOnUsOutcomeOpened({
        marketId: '1',
        outcome: 'Yes',
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.FIRST_PREDICT_ON_US_ORDER_SHEET,
      {
        confirmLabel: 'Confirm',
        selectedOrder: { market, outcome, outcomeToken },
        tradeDescriptionTemplate: 'Bought {amount} of {outcome}',
        tradePlacedLabel: 'Trade placed',
        usdAmount: 5,
      },
    );
  });
});
