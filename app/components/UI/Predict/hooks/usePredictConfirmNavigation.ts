import { StackActions, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { providerErrors } from '@metamask/rpc-errors';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { selectTransactions } from '../../../../selectors/transactionController';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { PredictMarketHeaderParams } from './usePredictMarketHeader';

const ROUTE = Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS;

interface PredictConfirmationNavigationParams {
  predictHeader?: PredictMarketHeaderParams;
}

export function usePredictConfirmNavigation() {
  const { dispatch } = useNavigation();
  const transactions = useSelector(selectTransactions);
  const [isPendingNavigation, setIsPendingNavigation] = useState(false);
  const [transactionsToRemove, setTransactionsToRemove] = useState<string[]>();
  const [pendingNavigationParams, setPendingNavigationParams] =
    useState<PredictConfirmationNavigationParams>();

  const pendingTransactions = useMemo(
    () =>
      (transactions ?? []).filter(
        (tx) => tx.status === TransactionStatus.unapproved,
      ),
    [transactions],
  );

  const replaceToConfirmation = useCallback(
    (params?: PredictConfirmationNavigationParams) => {
      dispatch(
        StackActions.replace(ROUTE, {
          loader: ConfirmationLoader.CustomAmount,
          animationEnabled: false,
          ...params,
        }),
      );
    },
    [dispatch],
  );

  const navigateToConfirmation = useCallback(
    (params?: PredictConfirmationNavigationParams) => {
      if (pendingTransactions.length && !isPendingNavigation) {
        setIsPendingNavigation(true);
        setTransactionsToRemove(pendingTransactions.map((tx) => tx.id));
        setPendingNavigationParams(params);
        rejectTransactions(pendingTransactions);
        return;
      }

      replaceToConfirmation(params);
    },
    [isPendingNavigation, pendingTransactions, replaceToConfirmation],
  );

  useEffect(() => {
    if (pendingTransactions.length && !isPendingNavigation) {
      setPendingNavigationParams(undefined);
      return;
    }

    if (
      !isPendingNavigation ||
      pendingTransactions.some((tx) => transactionsToRemove?.includes(tx.id))
    ) {
      return;
    }

    replaceToConfirmation(pendingNavigationParams);
    setIsPendingNavigation(false);
    setTransactionsToRemove(undefined);
    setPendingNavigationParams(undefined);
  }, [
    isPendingNavigation,
    pendingTransactions,
    replaceToConfirmation,
    pendingNavigationParams,
    transactionsToRemove,
  ]);

  return { navigateToConfirmation };
}

function rejectTransactions(transactions: TransactionMeta[]) {
  const { ApprovalController } = Engine.context;

  for (const tx of transactions) {
    try {
      ApprovalController.reject(tx.id, providerErrors.userRejectedRequest());
    } catch {
      // Intentionally ignore rejection failures to keep navigation flow moving.
    }
  }
}
