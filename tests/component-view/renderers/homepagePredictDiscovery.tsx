import '../mocks';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContext } from '@react-navigation/native';
import Engine from '../../../app/core/Engine';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { initialStatePredict } from '../presets/predict';
import BtcLiveRow from '../../../app/components/Views/Homepage/Sections/Predictions/components/HomepagePredictDiscovery/BtcLiveRow';
import { BTC_UP_OR_DOWN_5M_SERIES } from '../../../app/components/UI/Predict/constants/btcUpDown5mSeries';

interface RenderHomepagePredictBtcRowOptions {
  isVisible?: boolean;
  onPress?: (marketId: string | undefined, market: unknown) => void;
  overrides?: DeepPartial<RootState>;
}

type RenderHomepagePredictBtcRowResult = ReturnType<
  typeof renderWithProvider
> & {
  rerenderBtcLiveRow: (
    nextOptions: Pick<
      RenderHomepagePredictBtcRowOptions,
      'isVisible' | 'onPress'
    >,
  ) => void;
};

const BTC_MARKET = {
  id: 'btc-market-live',
  providerId: 'polymarket',
  slug: 'btc-up-or-down-5m-live',
  title: 'BTC Up or Down - 5 Minutes',
  description: 'BTC Up or Down',
  image: '',
  status: 'open',
  recurrence: 'none',
  category: 'crypto',
  tags: ['crypto', 'up-or-down', 'bitcoin'],
  outcomes: [],
  liquidity: 0,
  volume: 0,
  priceToBeat: 93000,
  endDate: '2026-01-01T00:05:00.000Z',
  series: BTC_UP_OR_DOWN_5M_SERIES,
} as const;

const defaultNavigationContextValue = {
  navigate: () => undefined,
  goBack: () => undefined,
  canGoBack: () => false,
  dispatch: () => undefined,
  reset: () => undefined,
  setParams: () => undefined,
  setOptions: () => undefined,
  isFocused: () => true,
  addListener: () => () => undefined,
  removeListener: () => undefined,
  getId: () => undefined,
  getParent: () => undefined,
  getState: () => ({ routes: [] }),
};

function createWrappedBtcLiveRow() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });

  return function WrappedBtcLiveRow({
    isVisible,
    onPress,
  }: {
    isVisible: boolean;
    onPress: (marketId: string | undefined, market: unknown) => void;
  }) {
    React.useEffect(
      () => () => {
        queryClient.cancelQueries();
        queryClient.clear();
      },
      [],
    );

    return (
      <NavigationContext.Provider
        value={defaultNavigationContextValue as never}
      >
        <QueryClientProvider client={queryClient}>
          <BtcLiveRow isVisible={isVisible} onPress={onPress} />
        </QueryClientProvider>
      </NavigationContext.Provider>
    );
  };
}

export function renderHomepagePredictBtcRowView(
  options: RenderHomepagePredictBtcRowOptions = {},
): RenderHomepagePredictBtcRowResult {
  const { isVisible = true, onPress = () => undefined, overrides } = options;

  const state = initialStatePredict()
    .withOverrides(overrides ?? {})
    .build();
  const predictController = Engine.context.PredictController;
  predictController.getMarketSeries.mockResolvedValue([BTC_MARKET]);
  predictController.getCryptoPriceHistory.mockResolvedValue([
    {
      timestamp: '2026-01-01T00:00:00.000Z',
      value: 93000,
    },
    {
      timestamp: '2026-01-01T00:03:00.000Z',
      value: 93025,
    },
  ]);
  predictController.getCryptoTargetPrice.mockResolvedValue(93000);
  predictController.getConnectionStatus.mockReturnValue({
    marketConnected: false,
    sportsConnected: false,
    rtdsConnected: true,
  });
  if (!predictController.subscribeToCryptoPrices.getMockImplementation()) {
    predictController.subscribeToCryptoPrices.mockImplementation(
      () => () => undefined,
    );
  }

  const Wrapped = createWrappedBtcLiveRow();
  const renderResult = renderWithProvider(
    <Wrapped isVisible={isVisible} onPress={onPress} />,
    { state },
  );

  return {
    ...renderResult,
    rerenderBtcLiveRow: (
      nextOptions: Pick<
        RenderHomepagePredictBtcRowOptions,
        'isVisible' | 'onPress'
      >,
    ) =>
      renderResult.rerender(
        <Wrapped
          isVisible={nextOptions.isVisible ?? isVisible}
          onPress={nextOptions.onPress ?? onPress}
        />,
      ),
  };
}

export { BTC_MARKET };
