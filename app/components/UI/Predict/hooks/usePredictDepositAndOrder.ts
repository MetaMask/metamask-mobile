import {
  NavigationProp,
  StackActions,
  useNavigation,
} from '@react-navigation/native';
import {
  useCallback,
  useContext,
  useState,
  type MutableRefObject,
} from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useAppThemeFromContext } from '../../../../util/theme';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { OrderPreview, PlaceOrderParams } from '../providers/types';
import { selectPredictPendingDepositByAddress } from '../selectors/predictController';
import {
  PredictBuyPreviewParams,
  PredictNavigationParamList,
} from '../types/navigation';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { ensureError } from '../utils/predictErrorHandler';
import { usePredictConfirmNavigation } from './usePredictConfirmNavigation';
import { usePredictPaymentToken } from './usePredictPaymentToken';
import { usePredictTokenSelection } from './usePredictTokenSelection';
import { usePredictTrading } from './usePredictTrading';

export interface PredictDepositAndOrderParams {
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
  market?: PredictBuyPreviewParams['market'];
  outcome?: PredictBuyPreviewParams['outcome'];
  outcomeToken?: PredictBuyPreviewParams['outcomeToken'];
  orderAmountUsd?: number;
  depositTransactionId?: string;
  preview?: OrderPreview | null;
}

interface UsePredictDepositAndOrderResult {
  depositAndOrder: (params: PredictDepositAndOrderParams) => Promise<void>;
  isDepositPending: boolean;
  shouldPreserveActiveOrderOnUnmountRef: MutableRefObject<boolean>;
  isDepositAndOrderLoading: boolean;
  isConfirming: boolean;
  confirmError?: string;
  handleConfirm: () => Promise<void>;
}

export const usePredictDepositAndOrder = ({
  tokenSelectionParams,
  market,
  outcome,
  outcomeToken,
  orderAmountUsd,
  depositTransactionId,
  preview,
}: UsePredictDepositAndOrderParams = {}): UsePredictDepositAndOrderResult => {
  const { navigateToConfirmation } = usePredictConfirmNavigation();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { onConfirm: onApprovalConfirm } = useApprovalRequest();
  const { isPredictBalanceSelected } = usePredictPaymentToken();

  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedInternalAccountAddress = evmAccount?.address ?? '0x0';

  const { depositAndOrder: depositAndOrderWithConfirmation, placeOrder } =
    usePredictTrading();
  const normalizedOrderAmountUsd = orderAmountUsd ?? 0;
  const hasExecutionParams = Boolean(
    market || outcome || outcomeToken || preview,
  );
  const marketId = market?.id;
  const outcomeId = outcome?.id;
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string>();

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

  const showOrderPlacedToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Check,
      labelOptions: [
        { label: strings('predict.order.prediction_placed'), isBold: true },
      ],
      hasNoTimeout: false,
    });
  }, [toastRef]);

  const redirectToBuyPreviewForAutoOrder = useCallback(() => {
    if (!market || !outcome || !outcomeToken || normalizedOrderAmountUsd <= 0) {
      setConfirmError(strings('predict.deposit.error_description'));
      setIsConfirming(false);
      return;
    }

    setIsConfirming(false);
    navigation.dispatch(
      StackActions.replace(Routes.PREDICT.MODALS.BUY_PREVIEW, {
        market,
        outcome,
        outcomeToken,
        amount: normalizedOrderAmountUsd,
        transactionId: depositTransactionId,
        animationEnabled: false,
      }),
    );
  }, [
    depositTransactionId,
    market,
    normalizedOrderAmountUsd,
    outcome,
    outcomeToken,
    navigation,
  ]);

  const handleOrderSuccess = useCallback(async () => {
    if (!preview) {
      setIsConfirming(false);
      return;
    }

    try {
      await placeOrder({
        preview,
        analyticsProperties: {
          marketId,
          outcome: outcomeId,
        },
      });
      showOrderPlacedToast();
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : strings('predict.deposit.error_description'),
      );
    } finally {
      setIsConfirming(false);
      navigation.goBack();
    }
  }, [
    marketId,
    navigation,
    outcomeId,
    placeOrder,
    preview,
    showOrderPlacedToast,
  ]);

  const handleConfirm = useCallback(async () => {
    if (!hasExecutionParams || isConfirming) {
      return;
    }

    setIsConfirming(true);
    setConfirmError(undefined);

    if (isPredictBalanceSelected) {
      await handleOrderSuccess();
      return;
    }

    try {
      redirectToBuyPreviewForAutoOrder();
      await onApprovalConfirm({
        deleteAfterResult: true,
        waitForResult: true,
        handleErrors: false,
      });
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : strings('predict.deposit.error_description'),
      );
      setIsConfirming(false);
    }
  }, [
    hasExecutionParams,
    handleOrderSuccess,
    isConfirming,
    isPredictBalanceSelected,
    onApprovalConfirm,
    redirectToBuyPreviewForAutoOrder,
  ]);

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
    isConfirming,
    confirmError,
    handleConfirm,
  };
};
