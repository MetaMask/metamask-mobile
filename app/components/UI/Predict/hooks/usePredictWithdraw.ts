import { useNavigation } from '@react-navigation/native';
import { useCallback, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { usePredictTrading } from './usePredictTrading';
import { useSelector } from 'react-redux';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { selectPredictWithdrawTransaction } from '../selectors/predictController';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { invalidatePredictCaches } from '../utils/invalidatePredictCaches';

// Action orchestrator (navigation, cache invalidation, toasts) — not a React Query wrapper.
export const usePredictWithdraw = () => {
  const { prepareWithdraw } = usePredictTrading();
  const { navigateToConfirmation } = useConfirmNavigation();
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);
  const queryClient = useQueryClient();

  const withdrawTransaction = useSelector(selectPredictWithdrawTransaction);

  const withdraw = useCallback(async () => {
    try {
      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
      });

      const response = await prepareWithdraw({});

      invalidatePredictCaches(queryClient);

      return response;
    } catch (err) {
      Logger.error(ensureError(err), {
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
          component: 'usePredictWithdraw',
        },
        context: {
          name: 'usePredictWithdraw',
          data: {
            method: 'withdraw',
            action: 'prepare_withdraw',
            operation: 'position_management',
          },
        },
      });

      navigation.goBack();

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to prepare withdraw';

      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Danger,
        labelOptions: [
          {
            label: strings('predict.withdraw.error_title'),
            isBold: true,
          },
          { label: '\n', isBold: false },
          { label: errorMessage, isBold: false },
        ],
        hasNoTimeout: false,
      });
    }
  }, [
    navigateToConfirmation,
    navigation,
    prepareWithdraw,
    queryClient,
    toastRef,
  ]);

  return { withdraw, withdrawTransaction };
};
