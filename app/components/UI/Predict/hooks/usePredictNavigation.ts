import { StackActions, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import Routes from '../../../../constants/navigation/Routes';
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

export const usePredictNavigation = () => {
  const navigation = useNavigation();

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
