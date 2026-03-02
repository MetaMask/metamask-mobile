import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useAppThemeFromContext } from '../../../../util/theme';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { selectPredictPendingDepositByAddress } from '../selectors/predictController';
import {
  PredictBuyPreviewParams,
  PredictNavigationParamList,
} from '../types/navigation';
import { PlaceOrderParams } from '../providers/types';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { ensureError } from '../utils/predictErrorHandler';
import { usePredictConfirmNavigation } from './usePredictConfirmNavigation';
import { usePredictTokenSelection } from './usePredictTokenSelection';
import { usePredictTrading } from './usePredictTrading';

interface PredictDepositAndOrderParams {
  amountUsd?: number;
  isInputFocused?: boolean;
  transactionError?: string;
  analyticsProperties?: PlaceOrderParams['analyticsProperties'];
  market: PredictBuyPreviewParams['market'];
  outcome: PredictBuyPreviewParams['outcome'];
  outcomeToken: PredictBuyPreviewParams['outcomeToken'];
}

interface UsePredictDepositAndOrderParams {
  tokenSelectionParams?: PredictDepositAndOrderParams;
}

export const usePredictDepositAndOrder = ({
  tokenSelectionParams,
}: UsePredictDepositAndOrderParams = {}) => {
  const { navigateToConfirmation } = usePredictConfirmNavigation();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedInternalAccountAddress = evmAccount?.address ?? '0x0';

  const { depositAndOrder: depositAndOrderWithConfirmation } =
    usePredictTrading();

  const depositBatchId = useSelector(
    selectPredictPendingDepositByAddress({
      address: selectedInternalAccountAddress,
    }),
  );

  const handleDepositError = useCallback(
    (err: unknown, action: string) => {
      Logger.error(ensureError(err), {
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
          component: 'usePredictDepositAndOrder',
        },
        context: {
          name: 'usePredictDepositAndOrder',
          data: {
            method: 'depositAndOrder',
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

  const depositAndOrder = useCallback(
    async (params: PredictDepositAndOrderParams) => {
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

        await depositAndOrderWithConfirmation({}).catch((err) => {
          console.error('Failed to initialize deposit and order:', err);
          handleDepositError(err, 'deposit_and_order_initialization');
        });

        navigateToConfirmation();
      } catch (err) {
        console.error('Failed to proceed with deposit and order:', err);
        handleDepositError(err, 'deposit_and_order_navigation');
      }
    },
    [
      depositAndOrderWithConfirmation,
      handleDepositError,
      navigateToConfirmation,
    ],
  );

  const handleTokenSelected = useCallback(
    async (
      selectedTokenAddress: string | null,
      selectedTokenKey: string | null,
    ) => {
      if (!tokenSelectionParams) {
        return;
      }

      if (selectedTokenKey === 'predict-balance' || !selectedTokenAddress) {
        return;
      }

      await depositAndOrder(tokenSelectionParams);
    },
    [depositAndOrder, tokenSelectionParams],
  );

  const {
    shouldPreserveActiveOrderOnUnmountRef,
    markShouldPreserveActiveOrderOnUnmount,
    isDepositAndOrderLoading,
  } = usePredictTokenSelection({
    onTokenSelected: tokenSelectionParams ? handleTokenSelected : undefined,
  });

  const triggerDepositAndOrder = useCallback(
    async (params: PredictDepositAndOrderParams) => {
      markShouldPreserveActiveOrderOnUnmount();
      await depositAndOrder(params);
    },
    [depositAndOrder, markShouldPreserveActiveOrderOnUnmount],
  );

  return {
    depositAndOrder: triggerDepositAndOrder,
    isDepositPending: !!depositBatchId,
    shouldPreserveActiveOrderOnUnmountRef,
    isDepositAndOrderLoading,
  };
};
