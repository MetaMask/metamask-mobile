import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useCallback, useContext } from 'react';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import Logger from '../../../../util/Logger';
import { useAppThemeFromContext } from '../../../../util/theme';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { POLYGON_USDCE } from '../../../Views/confirmations/constants/predict';
import { useAddToken } from '../../../Views/confirmations/hooks/tokens/useAddToken';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { PREDICT_CONSTANTS } from '../constants/errors';
import {
  PredictBuyPreviewParams,
  PredictNavigationParamList,
} from '../types/navigation';
import { ensureError } from '../utils/predictErrorHandler';
import { usePredictTrading } from './usePredictTrading';
import { OrderPreview } from '../types';

export interface PredictPayWithAnyTokenParams {
  market: PredictBuyPreviewParams['market'];
  outcome: PredictBuyPreviewParams['outcome'];
  outcomeToken: PredictBuyPreviewParams['outcomeToken'];
  preview?: OrderPreview;
}

interface UsePredictPayWithAnyTokenResult {
  triggerPayWithAnyToken: (
    params: PredictPayWithAnyTokenParams,
  ) => Promise<{ transactionId?: string } | undefined>;
}

export function usePredictPayWithAnyToken(): UsePredictPayWithAnyTokenResult {
  const { navigateToConfirmation } = useConfirmNavigation();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  useAddToken({
    chainId: CHAIN_IDS.POLYGON,
    decimals: POLYGON_USDCE.decimals,
    name: POLYGON_USDCE.name,
    symbol: POLYGON_USDCE.symbol,
    tokenAddress: POLYGON_USDCE.address,
  });

  const { payWithAnyTokenConfirmation } = usePredictTrading();

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
        const { response } = await payWithAnyTokenConfirmation();
        navigateToConfirmation({
          loader: ConfirmationLoader.CustomAmount,
          headerShown: false,
          replace: true,
          routeParams: {
            market: params.market,
            outcome: params.outcome,
            outcomeToken: params.outcomeToken,
            transactionId: response?.transactionId,
            isConfirmation: true,
            preview: params.preview,
          },
        });
        return { transactionId: response?.transactionId };
      } catch (err) {
        handleDepositError(err, 'pay_with_any_token');
      }
    },
    [payWithAnyTokenConfirmation, handleDepositError, navigateToConfirmation],
  );

  return {
    triggerPayWithAnyToken,
  };
}
