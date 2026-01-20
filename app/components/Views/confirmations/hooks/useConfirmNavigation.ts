import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import {
  ConfirmationLoader,
  ConfirmationParams,
} from '../components/confirm/confirm-component';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { providerErrors } from '@metamask/rpc-errors';
import { createProjectLogger } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { selectTransactions } from '../../../../selectors/transactionController';

const log = createProjectLogger('confirm-navigation');

const ROUTE = Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS;
const ROUTE_NO_HEADER = Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER;

export type ConfirmNavigateOptions = {
  amount?: string;
  headerShown?: boolean;
  stack?: string;
} & ConfirmationParams;

export function useConfirmNavigation() {
  const { navigate } = useNavigation();
  const transactions = useSelector(selectTransactions);
  const [pendingParams, setPendingParams] = useState<ConfirmNavigateOptions>();
  const [transactionsToRemove, setTransactionsToRemove] = useState<string[]>();

  const pendingTransactions = useMemo(
    () =>
      (transactions ?? []).filter(
        (tx) => tx.status === TransactionStatus.unapproved,
      ),
    [transactions],
  );

  const navigateToConfirmation = useCallback(
    (options: ConfirmNavigateOptions) => {
      const { headerShown, stack, ...params } = options;
      const { loader } = params;

      if (!loader && stack === Routes.PERPS.ROOT) {
        params.loader = ConfirmationLoader.CustomAmount;
      }

      if (
        params.loader === ConfirmationLoader.CustomAmount &&
        pendingTransactions.length &&
        !pendingParams
      ) {
        log('Rejecting pending transactions before navigating');

        setPendingParams(options);
        setTransactionsToRemove(pendingTransactions.map((tx) => tx.id));
        rejectTransactions(pendingTransactions);
        return;
      }

      const route = headerShown === false ? ROUTE_NO_HEADER : ROUTE;

      log('Navigating', { route, params, stack });

      if (stack) {
        (navigate as (route: string, params: object) => void)(stack, {
          screen: route,
          params,
        });
        return;
      }

      navigate(route, params);
    },
    [navigate, pendingParams, pendingTransactions],
  );

  useEffect(() => {
    if (
      !pendingParams ||
      pendingTransactions.some((tx) => transactionsToRemove?.includes(tx.id))
    ) {
      return;
    }

    log('Navigating after rejecting pending transactions');

    navigateToConfirmation(pendingParams);
    setPendingParams(undefined);
    setTransactionsToRemove(undefined);
  }, [
    pendingTransactions,
    pendingParams,
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
      log('Rejected transaction', tx.type, tx.id);
    } catch {
      log('Failed to reject transaction', tx.type, tx.id);
    }
  }
}
