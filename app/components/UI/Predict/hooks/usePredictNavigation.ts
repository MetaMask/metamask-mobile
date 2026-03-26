import { StackActions, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import { PredictBuyPreviewParams } from '../types/navigation';

interface NavigateToBuyPreviewOptions {
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

  return { navigateToBuyPreview };
};
