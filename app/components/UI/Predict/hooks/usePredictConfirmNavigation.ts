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

const ROUTE = Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS;

export function usePredictConfirmNavigation() {
  const { dispatch } = useNavigation();
  const transactions = useSelector(selectTransactions);
  const [isPendingNavigation, setIsPendingNavigation] = useState(false);
  const [transactionsToRemove, setTransactionsToRemove] = useState<string[]>();

  const pendingTransactions = useMemo(
    () =>
      (transactions ?? []).filter(
        (tx) => tx.status === TransactionStatus.unapproved,
      ),
    [transactions],
  );

  const navigateToConfirmation = useCallback(() => {
    if (pendingTransactions.length && !isPendingNavigation) {
      setIsPendingNavigation(true);
      setTransactionsToRemove(pendingTransactions.map((tx) => tx.id));
      rejectTransactions(pendingTransactions);
      return;
    }

    dispatch(
      StackActions.replace(ROUTE, {
        loader: ConfirmationLoader.CustomAmount,
      }),
    );
  }, [dispatch, isPendingNavigation, pendingTransactions]);

  useEffect(() => {
    if (
      !isPendingNavigation ||
      pendingTransactions.some((tx) => transactionsToRemove?.includes(tx.id))
    ) {
      return;
    }

    navigateToConfirmation();
    setIsPendingNavigation(false);
    setTransactionsToRemove(undefined);
  }, [
    isPendingNavigation,
    pendingTransactions,
    navigateToConfirmation,
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
