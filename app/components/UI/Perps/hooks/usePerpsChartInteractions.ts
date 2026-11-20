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

const TRADINGVIEW_LIBRARY_LOAD_ERROR_CODE = 'TRADINGVIEW_LIBRARY_LOAD_FAILED';

const getLibraryLoadAnalyticsProperties = (
  details: unknown,
  fallbackUsed: boolean,
): Record<string, unknown> => {
  if (typeof details !== 'object' || details === null) {
    return {};
  }

  const payload = details as Partial<ErrorPayload>;
  if (payload.code !== TRADINGVIEW_LIBRARY_LOAD_ERROR_CODE) {
    return {};
  }

  return {
    chart_error_code: payload.code,
    chart_failure_stage: 'library_script',
    chart_fallback_used: fallbackUsed,
    ...(payload.url ? { chart_library_url: payload.url } : {}),
    ...(payload.attempt !== undefined
      ? { chart_library_load_attempt: payload.attempt }
      : {}),
    ...(payload.maxAttempts !== undefined
      ? { chart_library_load_max_attempts: payload.maxAttempts }
      : {}),
    ...(payload.online !== undefined
      ? { chart_library_load_online: payload.online }
      : {}),
    ...(payload.visibilityState
      ? { chart_library_load_visibility_state: payload.visibilityState }
      : {}),
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

      Logger.error(new Error(errorMessage), {
        tags: { feature: PERPS_CONSTANTS.FeatureName },
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
        ...getLibraryLoadAnalyticsProperties(details, isAdvancedChartEnabled),
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
