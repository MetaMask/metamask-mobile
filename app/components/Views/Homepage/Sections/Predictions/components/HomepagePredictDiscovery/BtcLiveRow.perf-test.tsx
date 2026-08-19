import React from 'react';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from '@testing-library/react-native';
import { measureRenders } from 'reassure';
import Engine from '../../../../../../../core/Engine';
import { useCurrentCryptoUpDownMarketData } from '../../../../../../UI/Predict/hooks/useCurrentCryptoUpDownMarketData';
import { useCurrentPredictMarketFromSeries } from '../../../../../../UI/Predict/hooks/useCurrentPredictMarketFromSeries';
import {
  Recurrence,
  type CryptoPriceHistoryPoint,
  type CryptoPriceUpdate,
  type PredictMarket,
  type PredictSeries,
} from '../../../../../../UI/Predict/types';

jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      subscribeToCryptoPrices: jest.fn(),
      getConnectionStatus: jest.fn(),
      getCryptoPriceHistory: jest.fn(),
      getCryptoTargetPrice: jest.fn(),
    },
  },
}));

jest.mock(
  '../../../../../../UI/Predict/hooks/useCurrentPredictMarketFromSeries',
  () => ({
    useCurrentPredictMarketFromSeries: jest.fn(),
  }),
);

const mockUseCurrentPredictMarketFromSeries =
  useCurrentPredictMarketFromSeries as jest.Mock;
const mockSubscribeToCryptoPrices = Engine.context.PredictController
  .subscribeToCryptoPrices as jest.Mock;
const mockGetConnectionStatus = Engine.context.PredictController
  .getConnectionStatus as jest.Mock;
const mockGetCryptoPriceHistory = Engine.context.PredictController
  .getCryptoPriceHistory as jest.Mock;
const mockGetCryptoTargetPrice = Engine.context.PredictController
  .getCryptoTargetPrice as jest.Mock;

const SERIES: PredictSeries = {
  id: 'btc-series',
  slug: 'btc-up-or-down-5m',
  title: 'BTC Up or Down',
  recurrence: '5m',
};

const MARKET: PredictMarket & { series: PredictSeries } = {
  id: 'market-live',
  providerId: 'polymarket',
  slug: 'btc-up-or-down-5m-live',
  title: 'BTC Up or Down - 5 Minutes',
  description: 'BTC Up or Down',
  image: '',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['crypto', 'up-or-down', 'bitcoin'],
  outcomes: [],
  liquidity: 0,
  volume: 0,
  endDate: '2026-01-01T00:05:00.000Z',
  series: SERIES,
};

let livePriceCallback: ((update: CryptoPriceUpdate) => void) | undefined;

const createHistoryPoint = (
  value: number,
  timestamp: string,
): CryptoPriceHistoryPoint => ({
  timestamp,
  value,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const ProvidersWrapper = ({ children }: { children: React.ReactElement }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const BtcLiveRowPerfHarness = () => {
  const { currentPrice, priceToBeat, countdown } =
    useCurrentCryptoUpDownMarketData({
      series: SERIES,
      enabled: true,
    });

  return (
    <>
      <Text testID="btc-current-price">{currentPrice ?? 'none'}</Text>
      <Text testID="btc-price-to-beat">{priceToBeat ?? 'none'}</Text>
      <Text testID="btc-countdown">{countdown}</Text>
    </>
  );
};

describe('BtcLiveRow performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:03:00.000Z'));
    livePriceCallback = undefined;
    queryClient.clear();

    mockUseCurrentPredictMarketFromSeries.mockReturnValue({
      market: MARKET,
      marketId: MARKET.id,
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });
    mockSubscribeToCryptoPrices.mockImplementation(
      (_symbols, callback: (update: CryptoPriceUpdate) => void) => {
        livePriceCallback = callback;
        return jest.fn();
      },
    );
    mockGetConnectionStatus.mockReturnValue({
      rtdsConnected: true,
      sportsConnected: false,
      marketConnected: false,
    });
    mockGetCryptoPriceHistory.mockResolvedValue([
      createHistoryPoint(93000, '2026-01-01T00:00:00.000Z'),
      createHistoryPoint(93025, '2026-01-01T00:03:00.000Z'),
    ]);
    mockGetCryptoTargetPrice.mockResolvedValue(93000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('processes repeated live BTC updates while the countdown advances', async () => {
    await measureRenders(<BtcLiveRowPerfHarness />, {
      wrapper: ProvidersWrapper,
      scenario: async (screen) => {
        await act(async () => {
          await Promise.resolve();
        });

        await screen.findByText('93025');
        await screen.findByText('93000');
        await screen.findByTestId('btc-countdown');

        await act(async () => {
          [93026, 93027, 93028, 93029, 93030, 93031, 93032, 93033].forEach(
            (price, index) => {
              livePriceCallback?.({
                symbol: 'BTC',
                price,
                timestamp: 1_700_000_000 + index,
              });
            },
          );

          jest.advanceTimersByTime(5000);
          await Promise.resolve();
        });

        await screen.findByText('93033');
        expect(screen.getByTestId('btc-countdown')).not.toHaveTextContent(
          '2:00',
        );
      },
    });
  });
});
