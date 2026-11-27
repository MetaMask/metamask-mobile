import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { CandlePeriod, PERPS_CONSTANTS } from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { setPerpsChartPreferredCandlePeriod } from '../../../../actions/settings';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Logger from '../../../../util/Logger';
import type { ErrorPayload } from '../../Charts/AdvancedChart/AdvancedChart.types';
import type { PerpsChartAnalyticsProperties } from '../utils/chartAnalytics';
import { usePerpsEventTracking } from './usePerpsEventTracking';

const COMPONENT_NAME = 'usePerpsChartInteractions';
const OPERATION_CHART_ERROR = 'chart_error';
const OPERATION_LIBRARY_LOAD = 'chart_library_load';
const TRADINGVIEW_LIBRARY_LOAD_ERROR_CODE = 'TRADINGVIEW_LIBRARY_LOAD_FAILED';

/**
 * Sentry-only structured context for a TradingView library-load failure.
 * Returns `undefined` for any other chart error.
 *
 * Mixpanel properties for these diagnostics are intentionally not sent: they
 * belong in `@metamask/perps-controller` event constants (shared across
 * clients) and will be added once Core defines them.
 */
const getLibraryLoadContext = (
  details: unknown,
  fallbackUsed: boolean,
): Record<string, unknown> | undefined => {
  if (typeof details !== 'object' || details === null) {
    return undefined;
  }

  const payload = details as Partial<ErrorPayload>;
  if (payload.code !== TRADINGVIEW_LIBRARY_LOAD_ERROR_CODE) {
    return undefined;
  }

  return {
    errorCode: payload.code,
    fallbackUsed,
    url: payload.url,
    attempt: payload.attempt,
    maxAttempts: payload.maxAttempts,
    online: payload.online,
    visibilityState: payload.visibilityState,
  };
};

interface UsePerpsChartInteractionsOptions {
  asset?: string;
  chartAnalyticsProperties: PerpsChartAnalyticsProperties;
  chartErrorMessage: string;
  isAdvancedChartEnabled: boolean;
  onAdvancedChartError: () => void;
}

export const usePerpsChartInteractions = ({
  asset,
  chartAnalyticsProperties,
  chartErrorMessage,
  isAdvancedChartEnabled,
  onAdvancedChartError,
}: UsePerpsChartInteractionsOptions) => {
  const dispatch = useDispatch();
  const { track } = usePerpsEventTracking();

  const handleCandlePeriodChange = useCallback(
    (newPeriod: CandlePeriod) => {
      dispatch(setPerpsChartPreferredCandlePeriod(newPeriod));
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.ASSET]: asset || '',
        ...chartAnalyticsProperties,
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.CANDLE_PERIOD_CHANGED,
        [PERPS_EVENT_PROPERTY.CANDLE_PERIOD]: newPeriod,
      });
    },
    [asset, chartAnalyticsProperties, dispatch, track],
  );

  const handleChartError = useCallback(
    (error?: Error | string, details?: unknown) => {
      const errorMessage =
        typeof error === 'string'
          ? error
          : (error?.message ?? chartErrorMessage);

      const libraryLoadContext = getLibraryLoadContext(
        details,
        isAdvancedChartEnabled,
      );
      const operation = libraryLoadContext
        ? OPERATION_LIBRARY_LOAD
        : OPERATION_CHART_ERROR;

      Logger.error(new Error(errorMessage), {
        tags: {
          feature: PERPS_CONSTANTS.FeatureName,
          component: COMPONENT_NAME,
          operation,
        },
        context: {
          name: operation,
          data: {
            asset: asset ?? '',
            chartLibrary:
              chartAnalyticsProperties[PERPS_EVENT_PROPERTY.CHART_LIBRARY],
            ...libraryLoadContext,
          },
        },
      });
      track(MetaMetricsEvents.PERPS_ERROR, {
        [PERPS_EVENT_PROPERTY.ERROR_TYPE]: PERPS_EVENT_VALUE.ERROR_TYPE.WARNING,
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
        [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
          PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_MARKET_DETAILS,
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.ASSET_DETAILS,
        [PERPS_EVENT_PROPERTY.ASSET]: asset || '',
        ...chartAnalyticsProperties,
      });

      if (isAdvancedChartEnabled) {
        onAdvancedChartError();
      }
    },
    [
      asset,
      chartAnalyticsProperties,
      chartErrorMessage,
      isAdvancedChartEnabled,
      onAdvancedChartError,
      track,
    ],
  );

  return {
    handleCandlePeriodChange,
    handleChartError,
  };
};
