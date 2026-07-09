import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import type { ToastRegistration } from '../../../Nav/App/ControllerEventToastBridge';
import { useAppThemeFromContext } from '../../../../util/theme';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import { usePredictClaim } from './usePredictClaim';
import { usePredictDeposit } from './usePredictDeposit';
import { usePredictWithdraw } from './usePredictWithdraw';
import { store } from '../../../../store';
import { selectTransactionMetadataById } from '../../../../selectors/transactionController';
import {
  isPerpsPredictMoneyDeposit,
  isPerpsPredictMoneyWithdraw,
} from '../../Money/utils/moneyTransactionGuards';
import { resolveWithdrawTokenInfo } from '../../../Views/confirmations/utils/withdraw-token-resolution';
import { selectPredictBottomSheetEnabledFlag } from '../selectors/featureFlags';
import { shouldSuppressLegacyOrderFailureToast } from '../contexts/PredictPreviewSheetContext';
import { strings } from '../../../../../locales/i18n';
import { formatPrice } from '../utils/format';
import { createPredictTransactionStatusChangedHandler } from './predictTransactionStatusChangedToastHandler';

function getWithdrawConfirmedMessage(
  transactionId: string | undefined,
  fallbackAmount: number,
): { title: string; description: string } {
  const title = strings('predict.withdraw.withdraw_completed');

  const { isPostQuote, targetFiat, tokenSymbol } = resolveWithdrawTokenInfo(
    store.getState(),
    transactionId,
  );

  if (!isPostQuote) {
    return {
      title,
      description: strings('predict.withdraw.withdraw_completed_subtitle', {
        amount: formatPrice(fallbackAmount),
      }),
    };
  }

  const withdrawAmount = targetFiat ?? fallbackAmount;

  return {
    title,
    description: strings(
      'predict.withdraw.withdraw_any_token_completed_subtitle',
      { amount: formatPrice(withdrawAmount), token: tokenSymbol },
    ),
  };
}

export const usePredictToastRegistrations = (): ToastRegistration[] => {
  const queryClient = useQueryClient();
  const { deposit } = usePredictDeposit();
  const { claim } = usePredictClaim();
  const { withdraw, withdrawTransaction } = usePredictWithdraw();
  const navigation = useNavigation();
  const theme = useAppThemeFromContext();

  useSelector(selectSelectedAccountGroupId);
  const bottomSheetEnabled = useSelector(selectPredictBottomSheetEnabledFlag);
  const selectedAddress = getEvmAccountFromSelectedAccountGroup()?.address;
  const normalizedSelectedAddress = selectedAddress?.toLowerCase() ?? '';

  const handleTransactionStatusChanged = useCallback(
    (payload: unknown, showToast: ToastRef['showToast']): void => {
      createPredictTransactionStatusChangedHandler({
        queryClient,
        navigation,
        theme,
        normalizedSelectedAddress,
        bottomSheetEnabled,
        deposit,
        claim,
        withdraw,
        withdrawTransactionAmount: withdrawTransaction?.amount,
        getTransactionMetadata: (transactionId) =>
          selectTransactionMetadataById(store.getState(), transactionId),
        isPerpsPredictMoneyDeposit,
        isPerpsPredictMoneyWithdraw,
        shouldSuppressLegacyOrderFailureToast,
        getWithdrawConfirmedMessage,
      })(payload, showToast);
    },
    [
      bottomSheetEnabled,
      claim,
      deposit,
      navigation,
      normalizedSelectedAddress,
      queryClient,
      theme,
      withdraw,
      withdrawTransaction?.amount,
    ],
  );

  return useMemo(
    () => [
      {
        eventName: 'PredictController:transactionStatusChanged',
        handler: handleTransactionStatusChanged,
      },
    ],
    [handleTransactionStatusChanged],
  );
};
