import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
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
import { useStore } from 'react-redux';
import { selectTransactions } from '../../../../selectors/transactionController';
import { RootState } from '../../../../reducers';

const log = createProjectLogger('confirm-navigation');

const ROUTE = Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS;
const ROUTE_NO_HEADER = Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER;

// Upper bound on how long we wait for rejected transactions to clear before
// navigating anyway.
const REJECTION_CLEAR_TIMEOUT_MS = 1_500;

export type ConfirmNavigateOptions = {
  amount?: string;
  headerShown?: boolean;
  stack?: string;
} & ConfirmationParams;

// The store API we depend on — kept minimal so we rely only on what we use.
interface StoreLike {
  getState: () => RootState;
  subscribe: (listener: () => void) => () => void;
}

function getPendingTransactions(state: RootState): TransactionMeta[] {
  return (selectTransactions(state) ?? []).filter(
    (tx) => tx.status === TransactionStatus.unapproved,
  );
}

// A reject-then-navigate intentionally outlives the component that triggers it
// (e.g. the Money "Add" sheet closes as part of the action), so it can't live
// in React state. Only one can be in flight — there is a single confirmation
// screen — so a newer request aborts any older one.
let abortActiveDeferral: (() => void) | undefined;

/**
 * Rejects `transactions`, waits for them to clear from state, then runs
 * `navigate`. After a timeout the fires navigation anyway and tears
 * down the subscription.
 */
function rejectThenNavigate(
  store: StoreLike,
  transactions: TransactionMeta[],
  navigate: () => void,
): void {
  abortActiveDeferral?.();

  const idsToRemove = new Set(transactions.map((tx) => tx.id));
  const handles: {
    settled: boolean;
    unsubscribe: () => void;
    timeoutId?: ReturnType<typeof setTimeout>;
  } = { settled: false, unsubscribe: () => undefined };

  const abort = () => {
    if (handles.settled) {
      return;
    }
    handles.settled = true;
    if (handles.timeoutId !== undefined) {
      clearTimeout(handles.timeoutId);
    }
    handles.unsubscribe();
    if (abortActiveDeferral === abort) {
      abortActiveDeferral = undefined;
    }
  };

  const navigateAfterClear = () => {
    if (handles.settled) {
      return;
    }
    abort();
    navigate();
  };

  rejectTransactions(transactions);

  // We listen on the store directly rather than via a React effect because the
  // navigation must still happen even if the component that triggered it
  // unmounts first.
  handles.unsubscribe = store.subscribe(() => {
    const stillPending = getPendingTransactions(store.getState()).some((tx) =>
      idsToRemove.has(tx.id),
    );
    if (stillPending) {
      return;
    }
    log('Navigating after rejecting pending transactions');
    navigateAfterClear();
  });

  handles.timeoutId = setTimeout(() => {
    log('Timed out waiting for rejected transactions to clear; navigating');
    navigateAfterClear();
  }, REJECTION_CLEAR_TIMEOUT_MS);

  abortActiveDeferral = abort;
}

export function useConfirmNavigation() {
  const { navigate } = useNavigation();
  const store = useStore<RootState>();

  const performNavigate = useCallback(
    (options: ConfirmNavigateOptions) => {
      const { headerShown, stack, ...params } = options;
      const route = headerShown === false ? ROUTE_NO_HEADER : ROUTE;

      log('Navigating', { route, params, stack });

      if (stack) {
        navigate(stack, { screen: route, params });
        return;
      }

      navigate(route, params);
    },
    [navigate],
  );

  const navigateToConfirmation = useCallback(
    (options: ConfirmNavigateOptions) => {
      const resolvedOptions: ConfirmNavigateOptions =
        !options.loader && options.stack === Routes.PERPS.ROOT
          ? { ...options, loader: ConfirmationLoader.CustomAmount }
          : options;

      const pendingTransactions = getPendingTransactions(store.getState());

      if (
        resolvedOptions.loader === ConfirmationLoader.CustomAmount &&
        pendingTransactions.length
      ) {
        log('Rejecting pending transactions before navigating');
        rejectThenNavigate(store, pendingTransactions, () =>
          performNavigate(resolvedOptions),
        );
        return;
      }

      performNavigate(resolvedOptions);
    },
    [performNavigate, store],
  );

  return { navigateToConfirmation };
}

function rejectTransactions(transactions: TransactionMeta[]) {
  const { ApprovalController } = Engine.context;

  for (const tx of transactions) {
    try {
      ApprovalController.rejectRequest(
        tx.id,
        providerErrors.userRejectedRequest(),
      );
      log('Rejected transaction', tx.type, tx.id);
    } catch {
      log('Failed to reject transaction', tx.type, tx.id);
    }
  }
}
