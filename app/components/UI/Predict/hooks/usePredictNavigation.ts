import { StackActions, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useCallback } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import { DeferredRenderScreenIds } from '../../../../hooks/performance/deferredRenderPerformanceIds';
import { markDeferredRenderNavStart } from '../../../../hooks/performance/deferredRenderTtc';
import { isScreenTtcProbeEnabled } from '../../../../hooks/performance/screenTtcRegistry';
import {
  PredictBuyPreviewParams,
  PredictMarketDetailsParams,
} from '../types/navigation';

interface NavigateToBuyPreviewOptions {
  throughRoot?: boolean;
  replace?: boolean;
}

interface NavigateToMarketDetailsOptions {
  throughRoot?: boolean;
  replace?: boolean;
}

/** Up/down details are the only Predict screen this probe measures. */
export const isPredictUpDownDetailsNavigation = (
  params: PredictMarketDetailsParams,
): boolean => Boolean(params.series?.slug.includes('up-or-down'));

export const usePredictNavigation = () => {
  const navigation = useNavigation<AppNavigationProp>();

  const navigateToBuyPreview = useCallback(
    (
      params: PredictBuyPreviewParams,
      options?: NavigateToBuyPreviewOptions,
    ) => {
      if (options?.replace) {
        navigation.dispatch(
          StackActions.replace(Routes.PREDICT.MODALS.BUY_PREVIEW, params),
        );
      } else if (options?.throughRoot) {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params,
        });
      } else {
        navigation.navigate(Routes.PREDICT.MODALS.BUY_PREVIEW, params);
      }
    },
    [navigation],
  );

  const navigateToMarketDetails = useCallback(
    (
      params: PredictMarketDetailsParams,
      options?: NavigateToMarketDetailsOptions,
    ) => {
      if (
        isScreenTtcProbeEnabled() &&
        isPredictUpDownDetailsNavigation(params)
      ) {
        markDeferredRenderNavStart(
          DeferredRenderScreenIds.PREDICT_UPDOWN_DETAILS,
        );
      }
      if (options?.replace) {
        navigation.dispatch(
          StackActions.replace(Routes.PREDICT.MARKET_DETAILS, params),
        );
      } else if (options?.throughRoot) {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MARKET_DETAILS,
          params,
        });
      } else {
        navigation.navigate(Routes.PREDICT.MARKET_DETAILS, params);
      }
    },
    [navigation],
  );

  return { navigateToBuyPreview, navigateToMarketDetails };
};
