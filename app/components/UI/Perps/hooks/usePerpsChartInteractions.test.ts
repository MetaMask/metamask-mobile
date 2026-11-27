import { act, renderHook } from '@testing-library/react-native';
import { CandlePeriod, PERPS_CONSTANTS } from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { setPerpsChartPreferredCandlePeriod } from '../../../../actions/settings';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  getPerpsChartAnalyticsProperties,
  getPerpsChartLibrary,
} from '../utils/chartAnalytics';
import { usePerpsChartInteractions } from './usePerpsChartInteractions';

const mockDispatch = jest.fn();
const mockTrack = jest.fn();
const mockLoggerError = jest.fn();
const mockOnAdvancedChartError = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('./usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

const chartAnalyticsProperties = getPerpsChartAnalyticsProperties(
  getPerpsChartLibrary(true),
);

const renderInteractions = (isAdvancedChartEnabled = true) =>
  renderHook(() =>
    usePerpsChartInteractions({
      asset: 'BTC',
      chartAnalyticsProperties,
      chartErrorMessage: 'Chart failed',
      isAdvancedChartEnabled,
      onAdvancedChartError: mockOnAdvancedChartError,
    }),
  );

describe('usePerpsChartInteractions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists a selected candle period', () => {
    const { result } = renderInteractions();

    act(() => {
      result.current.handleCandlePeriodChange(CandlePeriod.OneHour);
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsChartPreferredCandlePeriod(CandlePeriod.OneHour),
    );
  });

  it('tracks a selected candle period', () => {
    const { result } = renderInteractions();

    act(() => {
      result.current.handleCandlePeriodChange(CandlePeriod.OneHour);
    });

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.CANDLE_PERIOD_CHANGED,
        [PERPS_EVENT_PROPERTY.CANDLE_PERIOD]: CandlePeriod.OneHour,
      }),
    );
  });

  it('logs a chart error', () => {
    const { result } = renderInteractions();

    act(() => {
      result.current.handleChartError('WebView failed');
    });

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'WebView failed' }),
      {
        tags: {
          feature: PERPS_CONSTANTS.FeatureName,
          component: 'usePerpsChartInteractions',
          operation: 'chart_error',
        },
        context: {
          name: 'chart_error',
          data: {
            asset: 'BTC',
            chartLibrary: PERPS_EVENT_VALUE.CHART_LIBRARY.ADVANCED,
          },
        },
      },
    );
  });

  it('tracks a chart error', () => {
    const { result } = renderInteractions();

    act(() => {
      result.current.handleChartError('WebView failed');
    });

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_ERROR,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: 'WebView failed',
        [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
      }),
    );
  });

  describe('library load failure', () => {
    const message =
      'Failed to load TradingView library. URL: https://cdn.example.com/charting_library.js';
    const details = {
      message,
      code: 'TRADINGVIEW_LIBRARY_LOAD_FAILED',
      url: 'https://cdn.example.com/charting_library.js',
      attempt: 2,
      maxAttempts: 2,
      online: false,
      visibilityState: 'hidden',
    };

    it('logs searchable diagnostics to Sentry', () => {
      const { result } = renderInteractions();

      act(() => {
        result.current.handleChartError(message, details);
      });

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ message }),
        {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            component: 'usePerpsChartInteractions',
            operation: 'chart_library_load',
          },
          context: {
            name: 'chart_library_load',
            data: {
              asset: 'BTC',
              chartLibrary: PERPS_EVENT_VALUE.CHART_LIBRARY.ADVANCED,
              errorCode: 'TRADINGVIEW_LIBRARY_LOAD_FAILED',
              fallbackUsed: true,
              url: 'https://cdn.example.com/charting_library.js',
              attempt: 2,
              maxAttempts: 2,
              online: false,
              visibilityState: 'hidden',
            },
          },
        },
      );
    });

    it('does not add diagnostic properties to the Mixpanel event', () => {
      const { result } = renderInteractions();

      act(() => {
        result.current.handleChartError(message, details);
      });

      expect(mockTrack).toHaveBeenCalledWith(MetaMetricsEvents.PERPS_ERROR, {
        [PERPS_EVENT_PROPERTY.ERROR_TYPE]: PERPS_EVENT_VALUE.ERROR_TYPE.WARNING,
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: message,
        [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
          PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_MARKET_DETAILS,
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.ASSET_DETAILS,
        [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
        ...chartAnalyticsProperties,
      });
    });
  });

  it('falls back after an Advanced Chart error', () => {
    const { result } = renderInteractions();

    act(() => {
      result.current.handleChartError('WebView failed');
    });

    expect(mockOnAdvancedChartError).toHaveBeenCalledTimes(1);
  });

  it('does not request fallback after a Lightweight Chart error', () => {
    const { result } = renderInteractions(false);

    act(() => {
      result.current.handleChartError('WebView failed');
    });

    expect(mockOnAdvancedChartError).not.toHaveBeenCalled();
  });
});
