import { useMemo } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import {
  hasTransactionType,
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { strings } from '../../../../../locales/i18n';
import type { RootState } from '../../../../reducers';
import { selectTransactionsByIds } from '../../../../selectors/transactionController';
import { getTransactionErrorMessage } from '../../../../util/activity/transactionError';
import type { ActivityListItem } from '../../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared Pay constants; route-isolation backlog
import { RELAY_DEPOSIT_TYPES } from '../../confirmations/constants/confirmations';
import { useActivityLocalTransaction } from './useActivityLocalTransaction';
import type { ActivityDetailsStepExplorerTarget } from '../components/ActivityDetailsStepTimeline';

/** Which leg of the Pay flow broke, for placing the failed step. */
export type PayFundsFailedLeg = 'approval' | 'relay';

export interface PayFundsFailure {
  /**
   * The failed leg's `TransactionMeta.error` (parent's as fallback), surfaced
   * verbatim — the pay strategies own the wording — or generic copy when
   * nothing was recorded.
   */
  message: string;
  /** Set when a specific leg failed; absent means the deposit call itself. */
  failedLeg?: PayFundsFailedLeg;
  /** The culprit leg's own chain and hash, for the sheet's explorer button. */
  explorerTarget?: ActivityDetailsStepExplorerTarget;
}

const FAILED_STATUSES: TransactionStatus[] = [
  TransactionStatus.failed,
  TransactionStatus.dropped,
];

const NO_LEGS: TransactionMeta[] = [];
const NO_LEG_IDS: string[] = [];

function hasFailed(tx: TransactionMeta | undefined): boolean {
  return Boolean(tx && FAILED_STATUSES.includes(tx.status));
}

/**
 * Why a Pay-funded row failed, ready to render. Shared by the Perps and
 * Predict funding screens.
 *
 * The failed leg is found from `TransactionMeta` statuses — approval before
 * relay, since the earliest break is the most specific explanation — and its
 * recorded error is the message, falling back to the parent's.
 *
 * @param item - The activity row being shown.
 * @param options.skip - Opt-out for rows that never render the message (e.g.
 * Predict withdrawals), so they subscribe to nothing.
 * @returns The failure, or `undefined` when the row did not fail or is skipped.
 */
export function usePayFundsFailure(
  item: ActivityListItem,
  { skip = false }: { skip?: boolean } = {},
): PayFundsFailure | undefined {
  const enabled = !skip;
  const parent = useActivityLocalTransaction(item, enabled);

  const rowFailed =
    enabled &&
    (item.status === 'failed' ||
      item.status === 'cancelled' ||
      hasFailed(parent));

  // Legs are only selected for failed rows, and `shallowEqual` absorbs the
  // selector's new-array-per-run so unrelated tx updates don't re-render.
  const legIds = useMemo(
    () =>
      rowFailed ? (parent?.requiredTransactionIds ?? NO_LEG_IDS) : NO_LEG_IDS,
    [rowFailed, parent?.requiredTransactionIds],
  );

  const legs = useSelector(
    (state: RootState) =>
      legIds.length ? selectTransactionsByIds(state, legIds) : NO_LEGS,
    shallowEqual,
  );

  return useMemo(() => {
    if (!rowFailed) {
      return undefined;
    }

    const failedApproval = legs.find(
      (leg) =>
        leg.type === TransactionType.tokenMethodApprove && hasFailed(leg),
    );
    const failedRelay = failedApproval
      ? undefined
      : legs.find(
          (leg) => hasTransactionType(leg, RELAY_DEPOSIT_TYPES) && hasFailed(leg),
        );
    const culprit = failedApproval ?? failedRelay;

    const message =
      (culprit && getTransactionErrorMessage(culprit)) ??
      (parent && getTransactionErrorMessage(parent)) ??
      strings('activity_details.failure.unknown');

    const failedLeg: PayFundsFailedLeg | undefined = failedApproval
      ? 'approval'
      : failedRelay
        ? 'relay'
        : undefined;

    const explorerTarget =
      culprit?.hash && culprit.chainId
        ? { chainId: toEvmCaipChainId(culprit.chainId), hash: culprit.hash }
        : undefined;

    return {
      message,
      ...(failedLeg ? { failedLeg } : {}),
      ...(explorerTarget ? { explorerTarget } : {}),
    };
  }, [legs, parent, rowFailed]);
}
