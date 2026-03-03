import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useCallback, useContext } from 'react';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useAppThemeFromContext } from '../../../../util/theme';
import { PREDICT_CONSTANTS } from '../constants/errors';
import {
  PredictBuyPreviewParams,
  PredictNavigationParamList,
} from '../types/navigation';
import { ensureError } from '../utils/predictErrorHandler';
import { usePredictConfirmNavigation } from './usePredictConfirmNavigation';
import { usePredictTrading } from './usePredictTrading';

export interface PredictPayWithAnyTokenParams {
  amountUsd?: number;
  isInputFocused?: boolean;
  transactionError?: string;
  market: PredictBuyPreviewParams['market'];
  outcome: PredictBuyPreviewParams['outcome'];
  outcomeToken: PredictBuyPreviewParams['outcomeToken'];
}

interface UsePredictPayWithAnyTokenResult {
  triggerPayWithAnyToken: (
    params: PredictPayWithAnyTokenParams,
  ) => Promise<void>;
}

export function usePredictPayWithAnyToken(): UsePredictPayWithAnyTokenResult {
  const { navigateToConfirmation } = usePredictConfirmNavigation();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const { depositAndOrder: depositAndOrderWithConfirmation } =
    usePredictTrading();

  const handleDepositError = useCallback(
    (err: unknown, action: string) => {
      Logger.error(ensureError(err), {
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
          component: 'usePredictPayWithAnyToken',
        },
        context: {
          name: 'usePredictPayWithAnyToken',
          data: {
            method: 'triggerPayWithAnyToken',
            action,
            operation: 'financial_operations',
          },
        },
      });

      Engine.context.PredictController.clearActiveOrder();
      navigation.goBack();

      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('predict.deposit.error_title'), isBold: true },
          { label: '\n', isBold: false },
          {
            label: strings('predict.deposit.error_description'),
            isBold: false,
          },
        ],
        iconName: IconName.Error,
        iconColor: theme.colors.error.default,
        backgroundColor: theme.colors.accent04.normal,
        hasNoTimeout: false,
      });
    },
    [
      navigation,
      theme.colors.accent04.normal,
      theme.colors.error.default,
      toastRef,
    ],
  );

  const triggerPayWithAnyToken = useCallback(
    async (params: PredictPayWithAnyTokenParams) => {
      try {
        Engine.context.PredictController.setActiveOrder({
          market: params.market,
          outcome: params.outcome,
          outcomeToken: params.outcomeToken,
          ...(typeof params.isInputFocused === 'boolean'
            ? { isInputFocused: params.isInputFocused }
            : {}),
          ...(params.amountUsd && params.amountUsd > 0
            ? { amountUsd: params.amountUsd }
            : {}),
          ...(params.transactionError
            ? { transactionError: params.transactionError }
            : {}),
        });

        await depositAndOrderWithConfirmation({});
        navigateToConfirmation();
      } catch (err) {
        handleDepositError(err, 'pay_with_any_token');
      }
    },
    [
      depositAndOrderWithConfirmation,
      handleDepositError,
      navigateToConfirmation,
    ],
  );

  return {
    triggerPayWithAnyToken,
  };
}
