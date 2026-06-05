import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
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
// navigating anyway. A successful rejection clears the transaction in well
// under a second, and a failed one won't clear no matter how long we wait — so
// this is kept short: it only trips when a rejection silently fails, bounding
// the worst-case wait (and preventing a leaked store subscription) without
// affecting the normal path.
const REJECTION_CLEAR_TIMEOUT_MS = 1_500;

export type ConfirmNavigateOptions = {
  amount?: string;
  headerShown?: boolean;
  stack?: string;
  /**
   * Deferred navigation (when pending transactions must be rejected first) is
   * abandoned if the calling component unmounts before it completes. Set this
   * for flows that intentionally close their own UI as part of navigating —
   * e.g. the Money "Add" bottom sheet — so the navigation still happens.
   */
  deferAcrossUnmount?: boolean;
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

// A deferred navigation outlives the component that triggers it, so its
// single-flight guard must live outside React state. Only one reject-then-
// navigate can be in flight at a time (there is a single confirmation screen);
// a newer request supersedes any older one.
let cancelActiveDeferral: (() => void) | undefined;

/**
 * Waits for the given transactions to clear from state, then runs `navigate`.
 * Returns a `cancel` that abandons the pending navigation. Supersedes any
 * deferral already in flight, and is bounded by a timeout so a rejection that
 * never clears can neither leak the subscription nor strand the user.
 */
function scheduleNavigationAfterRejection(
  store: StoreLike,
  idsToRemove: Set<string>,
  navigate: () => void,
): () => void {
  cancelActiveDeferral?.();

  // Held in a mutable object so `settle` can tear them down without forward
  // references to bindings declared later in the function.
  const handle: {
    settled: boolean;
    unsubscribe: () => void;
    timeoutId: ReturnType<typeof setTimeout> | undefined;
  } = { settled: false, unsubscribe: () => undefined, timeoutId: undefined };

  function settle(shouldNavigate: boolean) {
    if (handle.settled) {
      return;
    }
    handle.settled = true;
    if (handle.timeoutId !== undefined) {
      clearTimeout(handle.timeoutId);
    }
    handle.unsubscribe();
    if (cancelActiveDeferral === cancel) {
      cancelActiveDeferral = undefined;
    }
    if (shouldNavigate) {
      navigate();
    }
  }

  function cancel() {
    settle(false);
  }

  // We listen on the store directly rather than via a React effect because the
  // navigation must still happen even if the component that triggered it
  // unmounts first — e.g. the Money "Add" bottom sheet, which closes (tearing
  // down its hook) as part of initiating the deposit.
  handle.unsubscribe = store.subscribe(() => {
    const stillPending = getPendingTransactions(store.getState()).some((tx) =>
      idsToRemove.has(tx.id),
    );

    if (stillPending) {
      return;
    }

    log('Navigating after rejecting pending transactions');
    settle(true);
  });

  handle.timeoutId = setTimeout(() => {
    log('Timed out waiting for rejected transactions to clear; navigating');
    settle(true);
  }, REJECTION_CLEAR_TIMEOUT_MS);

  cancelActiveDeferral = cancel;
  return cancel;
}

export function useConfirmNavigation() {
  const { navigate } = useNavigation();
  const store = useStore<RootState>();

  // Abandons a deferred navigation this hook instance started when the
  // component unmounts — unless the caller opted into surviving unmount.
  const cancelOnUnmount = useRef<(() => void) | undefined>(undefined);

  useEffect(
    () => () => {
      cancelOnUnmount.current?.();
    },
    [],
  );

  const performNavigate = useCallback(
    (options: ConfirmNavigateOptions) => {
      const { headerShown, stack, deferAcrossUnmount, ...params } = options;
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

        const idsToRemove = new Set(pendingTransactions.map((tx) => tx.id));
        rejectTransactions(pendingTransactions);

        const cancel = scheduleNavigationAfterRejection(
          store,
          idsToRemove,
          () => {
            cancelOnUnmount.current = undefined;
            performNavigate(resolvedOptions);
          },
        );

        cancelOnUnmount.current = resolvedOptions.deferAcrossUnmount
          ? undefined
          : () => {
              cancel();
              cancelOnUnmount.current = undefined;
            };

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
