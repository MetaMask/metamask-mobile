import { useMemo } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { StatusTypes } from '@metamask/bridge-controller';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  hasTransactionType,
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { strings } from '../../../../../locales/i18n';
import type { RootState } from '../../../../reducers';
import { selectBridgeHistoryForAccount } from '../../../../selectors/bridgeStatusController';
import { selectTransactionsByIds } from '../../../../selectors/transactionController';
import type { ActivityListItem } from '../../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared Pay constants; route-isolation backlog
import { ACTIVITY_FIAT_FRACTION_DIGITS, RELAY_DEPOSIT_TYPES } from '../../confirmations/constants/confirmations';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { useActivityLocalTransaction } from './useActivityLocalTransaction';
import type { ActivityDetailsStepExplorerTarget } from '../components/ActivityDetailsStepTimeline';

/** Pay records its fiat values in USD, not the user's display currency. */
const PAY_FIAT_CURRENCY = 'usd';

/**
 * What went wrong with a Pay-funded deposit, in terms of where the user's money
 * ended up. Derived from the legs and bridge history rather than from error
 * text, because the useful cases record no error at all — a bridge that settles
 * off-chain leaves its on-chain leg confirmed.
 */
export type PayFundsFailureShape =
  /** Bridge landed, the deposit itself did not: funds sit on the destination. */
  | 'bridgedNotDeposited'
  /** The bridge leg failed: funds never left the paying network. */
  | 'bridgeFailed'
  /** The approval failed: nothing moved at all. */
  | 'approvalFailed'
  /** Never broadcast, so nothing left the wallet. */
  | 'notSubmitted'
  /** The user cancelled the deposit: nothing was deposited. */
  | 'cancelled'
  /** Failed, but state does not say how. */
  | 'unknown';

export interface PayFundsFailure {
  shape: PayFundsFailureShape;
  message: string;
  explorerTarget?: ActivityDetailsStepExplorerTarget;
}

/**
 * Where a surface's bridge leg lands, so the bridged-not-deposited sentence can
 * name it: USDC on Arbitrum for Perps, USDC.e on Polygon for Predict.
 */
export interface PayFundsDestination {
  network: string;
  symbol: string;
  assetAddress: string;
}

const FAILED_STATUSES: TransactionStatus[] = [
  TransactionStatus.failed,
  TransactionStatus.dropped,
];

const NO_LEGS: TransactionMeta[] = [];
const NO_LEG_IDS: string[] = [];
const NO_BRIDGE_HISTORY: Record<string, BridgeHistoryItem> = {};

function hasFailed(tx: TransactionMeta | undefined): boolean {
  return Boolean(tx && FAILED_STATUSES.includes(tx.status));
}

/** Whether a COMPLETE bridge entry actually landed on the expected asset. */
function landedOnDestination(
  entry: BridgeHistoryItem | undefined,
  destination: PayFundsDestination,
): boolean {
  const destAddress = entry?.quote?.destAsset?.address;
  return Boolean(
    destAddress &&
      destAddress.toLowerCase() === destination.assetAddress.toLowerCase(),
  );
}

/**
 * Classifies a failed funding row. Order matters: the earliest leg that broke is
 * the most specific explanation, so approval is checked before the bridge, and
 * the bridge before the deposit.
 *
 * Returns the culprit leg when the failure lives on one, so the sheet can link
 * that leg's transaction rather than the parent's.
 */
function classify({
  parent,
  legs,
  legIds,
  bridgeHistory,
  destination,
}: {
  parent: TransactionMeta;
  legs: TransactionMeta[];
  legIds: string[];
  bridgeHistory: Record<string, BridgeHistoryItem>;
  destination: PayFundsDestination;
}): { shape: PayFundsFailureShape; leg?: TransactionMeta } {
  const failedApproval = legs.find(
    (leg) => leg.type === TransactionType.tokenMethodApprove && hasFailed(leg),
  );
  if (failedApproval) {
    return { shape: 'approvalFailed', leg: failedApproval };
  }

  const failedBridge = legs.find(
    (leg) => hasTransactionType(leg, RELAY_DEPOSIT_TYPES) && hasFailed(leg),
  );
  const offChainFailedLegId = legIds.find(
    (id) => bridgeHistory[id]?.status?.status === StatusTypes.FAILED,
  );
  if (failedBridge || offChainFailedLegId) {
    return {
      shape: 'bridgeFailed',
      leg: failedBridge ?? legs.find((leg) => leg.id === offChainFailedLegId),
    };
  }

  const bridgeLanded = legIds.some(
    (id) =>
      bridgeHistory[id]?.status?.status === StatusTypes.COMPLETE &&
      landedOnDestination(bridgeHistory[id], destination),
  );
  if (bridgeLanded) {
    return { shape: 'bridgedNotDeposited' };
  }

  if (!parent.hash) {
    return { shape: 'notSubmitted' };
  }

  return { shape: 'unknown' };
}

/**
 * Copy for a shape. `bridgedNotDeposited` keeps the wording the pre-redesign
 * transaction details screen ships, with the destination and amount filled in;
 * without a recorded amount it drops to the same sentence without one.
 */
function getMessage(
  shape: PayFundsFailureShape,
  destination: PayFundsDestination,
  totalFiat: string | undefined,
): string {
  switch (shape) {
    case 'bridgedNotDeposited':
      return totalFiat
        ? strings('activity_details.failure.bridged_not_deposited', {
            fiat: totalFiat,
            network: destination.network,
            symbol: destination.symbol,
          })
        : strings('activity_details.failure.bridged_not_deposited_no_amount', {
            network: destination.network,
          });
    case 'bridgeFailed':
      return strings('activity_details.failure.bridge_failed');
    case 'approvalFailed':
      return strings('activity_details.failure.approval_failed');
    case 'notSubmitted':
      return strings('activity_details.failure.not_submitted');
    case 'cancelled':
      return strings('activity_details.failure.cancelled');
    case 'unknown':
    default:
      return strings('activity_details.failure.unknown');
  }
}

/**
 * Why a Pay-funded deposit failed, ready to render. Shared by the Perps and
 * Predict funding screens; only the destination wording differs.
 *
 * @param item - The activity row being shown.
 * @param options.destination - Where the bridge leg lands, named in the
 * bridged-not-deposited sentence and required of the bridge entry.
 * @param options.payTargetFiat - Pay's USD target amount, so that sentence can
 * say how much is waiting there.
 * @param options.skip - Callers rendering non-deposit rows set this; the copy
 * is deposit-worded, so withdrawals must not receive it.
 * @returns The failure, or `undefined` when the row did not fail or is skipped.
 */
export function usePayFundsFailure(
  item: ActivityListItem,
  {
    destination,
    payTargetFiat,
    skip = false,
  }: {
    destination: PayFundsDestination;
    payTargetFiat?: string;
    skip?: boolean;
  },
): PayFundsFailure | undefined {
  const enabled = !skip;
  const parent = useActivityLocalTransaction(item, enabled);
  const formatFiat = useFiatFormatter({
    currency: PAY_FIAT_CURRENCY,
    fractionDigits: ACTIVITY_FIAT_FRACTION_DIGITS,
  });

  const rowFailed =
    enabled &&
    (item.status === 'failed' ||
      item.status === 'cancelled' ||
      hasFailed(parent));

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

  const bridgeHistory = useSelector((state: RootState) =>
    legIds.length ? selectBridgeHistoryForAccount(state) : NO_BRIDGE_HISTORY,
  );

  const targetAmount = payTargetFiat ? new BigNumber(payTargetFiat) : undefined;
  const totalFiat =
    rowFailed && targetAmount?.isFinite() && targetAmount.gt(0)
      ? formatFiat(targetAmount)
      : undefined;

  return useMemo(() => {
    if (!rowFailed) {
      return undefined;
    }

    if (item.status === 'cancelled') {
      const shape: PayFundsFailureShape = 'cancelled';
      return { shape, message: getMessage(shape, destination, totalFiat) };
    }

    if (!parent) {
      const shape: PayFundsFailureShape = 'unknown';
      return { shape, message: getMessage(shape, destination, totalFiat) };
    }

    const { shape, leg } = classify({
      parent,
      legs,
      legIds,
      bridgeHistory,
      destination,
    });

    const explorerTarget =
      leg?.hash && leg.chainId
        ? { chainId: toEvmCaipChainId(leg.chainId), hash: leg.hash }
        : undefined;

    return {
      shape,
      message: getMessage(shape, destination, totalFiat),
      ...(explorerTarget ? { explorerTarget } : {}),
    };
  }, [
    bridgeHistory,
    destination,
    item.status,
    legIds,
    legs,
    parent,
    rowFailed,
    totalFiat,
  ]);
}
