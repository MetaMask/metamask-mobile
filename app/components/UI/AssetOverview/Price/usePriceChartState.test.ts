import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { ChartType } from '../../Charts/AdvancedChart/AdvancedChart.types';
import { selectTokenDetailsOhlcvWsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsOhlcvWsIntegration';
import { selectTokenDetailsTechnicalIndicatorsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators';
import {
  selectTokenIndicators,
  selectTokenOverviewChartInterval,
  selectTokenOverviewChartType,
} from '../../../../reducers/user/selectors';
import { resolveOhlcvChartAssetId } from './resolveOhlcvChartAssetId';
import {
  usePriceChartState,
  type UsePriceChartStateParams,
} from './usePriceChartState';

const mockTrace = jest.fn();
const mockUseOHLCVChart = jest.fn();
const mockUseOHLCVRealtime = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock(
  '../../../../selectors/featureFlagController/tokenDetailsOhlcvWsIntegration',
  () => ({
    selectTokenDetailsOhlcvWsEnabled: jest.fn(),
  }),
);

jest.mock(
  '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators',
  () => ({
    selectTokenDetailsTechnicalIndicatorsEnabled: jest.fn(),
  }),
);

jest.mock('../../../../reducers/user/selectors', () => ({
  selectTokenOverviewChartType: jest.fn(),
  selectTokenOverviewChartInterval: jest.fn(),
  selectTokenIndicators: jest.fn(),
}));

jest.mock('../../../../util/trace', () => {
  const actual = jest.requireActual('../../../../util/trace');
  return {
    ...actual,
    trace: (...args: unknown[]) => mockTrace(...args),
    endTrace: jest.fn(),
  };
});

jest.mock('../../Charts/AdvancedChart/useOHLCVChart', () => ({
  useOHLCVChart: (...args: unknown[]) => mockUseOHLCVChart(...args),
}));

jest.mock('../../Charts/AdvancedChart/useOHLCVRealtime', () => ({
  useOHLCVRealtime: (...args: unknown[]) => mockUseOHLCVRealtime(...args),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics');

const ASSET_A = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ASSET_B = 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7';

const flags = {
  wsEnabled: false,
};

const bars = (closes: number[]) => {
  const start = Date.now() - closes.length * 1000;
  return closes.map((close, index) => ({
    time: start + index * 1000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  }));
};

const setChart = ({
  closes,
  isLoading,
}: {
  closes: number[];
  isLoading: boolean;
}) => {
  mockUseOHLCVChart.mockReturnValue({
    ohlcvData: bars(closes),
    isLoading,
    error: undefined,
    hasMore: false,
    nextCursor: null,
    hasEmptyData: false,
  });
};

const paramsFor = (
  currency: string,
  caipAssetId: string,
): UsePriceChartStateParams => ({
  asset: {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: '0x1',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    image: '',
    balance: '0',
    logo: undefined,
    isETH: false,
    caipAssetId,
  },
  currentPrice: 5,
  currentCurrency: currency,
  priceDiff: 1,
  comparePrice: 4,
  isLoading: false,
});

describe('usePriceChartState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    flags.wsEnabled = false;
    jest.mocked(useSelector).mockImplementation((selector: unknown) => {
      if (selector === selectTokenDetailsOhlcvWsEnabled) return flags.wsEnabled;
      if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
        return false;
      }
      if (selector === selectTokenOverviewChartType) return ChartType.Candles;
      if (selector === selectTokenOverviewChartInterval) return '15m';
      if (selector === selectTokenIndicators) return [];
      if (typeof selector === 'function') {
        return selector({ user: { appTheme: 'light' } });
      }
      return undefined;
    });
    mockUseOHLCVRealtime.mockReturnValue({ latestBar: null });
    setChart({ closes: [40, 50, 100], isLoading: false });
  });

  it('holds the previous compare price while the next series is loading', () => {
    const { result, rerender } = renderHook(
      (props: UsePriceChartStateParams) => usePriceChartState(props),
      { initialProps: paramsFor('usd', ASSET_A) },
    );

    expect(result.current.dynamicComparePrice).toBe(40);

    setChart({ closes: [], isLoading: true });
    rerender(paramsFor('eur', ASSET_A));

    expect(result.current.dynamicComparePrice).toBe(40);

    rerender(paramsFor('eur', ASSET_A));

    expect(result.current.dynamicComparePrice).toBe(40);
  });

  it('adopts the new compare price once that series finishes loading', () => {
    const { result, rerender } = renderHook(
      (props: UsePriceChartStateParams) => usePriceChartState(props),
      { initialProps: paramsFor('usd', ASSET_A) },
    );

    setChart({ closes: [], isLoading: true });
    rerender(paramsFor('eur', ASSET_A));

    setChart({ closes: [80, 90, 120], isLoading: false });
    rerender(paramsFor('eur', ASSET_A));

    expect(result.current.dynamicComparePrice).toBe(80);
  });

  it('keeps the last realtime close after the websocket price drops', () => {
    flags.wsEnabled = true;
    mockUseOHLCVRealtime.mockReturnValue({
      latestBar: {
        timestamp: 1_700_000_000,
        open: 70,
        high: 80,
        low: 60,
        close: 77,
        volume: 1,
      },
    });

    const { result, rerender } = renderHook(
      (props: UsePriceChartStateParams) => usePriceChartState(props),
      { initialProps: paramsFor('usd', ASSET_A) },
    );

    expect(result.current.displayPrice).toBe(77);

    mockUseOHLCVRealtime.mockReturnValue({ latestBar: null });
    rerender(paramsFor('usd', ASSET_A));

    expect(result.current.displayPrice).toBe(77);
  });

  it('does not start another visibility trace when the candle series becomes empty', () => {
    const { rerender } = renderHook(
      (props: UsePriceChartStateParams) => usePriceChartState(props),
      { initialProps: paramsFor('usd', ASSET_A) },
    );

    expect(mockTrace).toHaveBeenCalledTimes(1);

    setChart({ closes: [], isLoading: false });
    rerender(paramsFor('eur', ASSET_A));

    expect(mockTrace).toHaveBeenCalledTimes(1);
  });

  it('records the latest asset id on the visibility trace', () => {
    const { rerender } = renderHook(
      (props: UsePriceChartStateParams) => usePriceChartState(props),
      { initialProps: paramsFor('usd', ASSET_A) },
    );

    setChart({ closes: [40, 50, 100], isLoading: false });
    rerender(paramsFor('usd', ASSET_B));

    expect(mockTrace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          assetId: resolveOhlcvChartAssetId({
            caipAssetId: ASSET_B,
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            chainId: '0x1',
          }),
        },
      }),
    );
  });
});
