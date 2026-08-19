import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { StatusTypes } from '@metamask/bridge-controller';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { strings } from '../../../../../locales/i18n';
import type { RootState } from '../../../../reducers';
import { selectBridgeHistoryForAccount } from '../../../../selectors/bridgeStatusController';
import {
  selectTransactionMetadataByHash,
  selectTransactionMetadataById,
  selectTransactionsByIds,
} from '../../../../selectors/transactionController';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';

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
  /** Failed, but state does not say how. */
  | 'unknown';

export interface PayFundsFailure {
  shape: PayFundsFailureShape;
  message: string;
}

/**
 * Where a surface's bridge leg lands, so the bridged-not-deposited sentence can
 * name it: USDC on Arbitrum for Perps, USDC.e on Polygon for Predict.
 */
export interface PayFundsDestination {
  network: string;
  symbol: string;
}

const FAILED_STATUSES: TransactionStatus[] = [
  TransactionStatus.failed,
  TransactionStatus.dropped,
];

const BRIDGE_LEG_TYPES = [
  TransactionType.relayDeposit,
  TransactionType.perpsRelayDeposit,
  TransactionType.predictRelayDeposit,
];

const NO_LEGS: TransactionMeta[] = [];

const NO_BRIDGE_HISTORY: Record<string, BridgeHistoryItem> = {};

/**
 * The local transaction behind a row. A local row's own copy can be a snapshot
 * stashed at navigation time, so the live one is re-read by id first.
 * Provider-backed rows are matched on hash instead, scoped to the row's chain —
 * the resolution {@link useActivityPayMetadata} also uses.
 */
function useLocalTransaction(
  item: ActivityListItem,
): TransactionMeta | undefined {
  const snapshot =
    item.raw?.type === 'localTransaction'
      ? item.raw.data.primaryTransaction
      : undefined;
  const { hash, chainId } = item;

  const live = useSelector((state: RootState) =>
    snapshot?.id
      ? selectTransactionMetadataById(state, snapshot.id)
      : undefined,
  );

  const byHash = useSelector((state: RootState) => {
    if (snapshot) {
      return undefined;
    }

    const meta = selectTransactionMetadataByHash(state, hash);
    return meta && toEvmCaipChainId(meta.chainId) === chainId
      ? meta
      : undefined;
  });

  return live ?? snapshot ?? byHash;
}

function hasFailed(tx: TransactionMeta | undefined): boolean {
  return Boolean(tx && FAILED_STATUSES.includes(tx.status));
}

function isBridgeLeg(tx: TransactionMeta): boolean {
  return Boolean(tx.type && BRIDGE_LEG_TYPES.includes(tx.type));
}

/**
 * Classifies a failed funding row. Order matters: the earliest leg that broke is
 * the most specific explanation, so approval is checked before the bridge, and
 * the bridge before the deposit.
 */
function classify({
  parent,
  legs,
  bridgeStatusByLegId,
}: {
  parent: TransactionMeta;
  legs: TransactionMeta[];
  bridgeStatusByLegId: Map<string, string | undefined>;
}): PayFundsFailureShape {
  const approvalFailed = legs.some(
    (leg) => leg.type === TransactionType.tokenMethodApprove && hasFailed(leg),
  );
  if (approvalFailed) {
    return 'approvalFailed';
  }

  const bridgeFailed = legs.some(
    (leg) =>
      (isBridgeLeg(leg) && hasFailed(leg)) ||
      bridgeStatusByLegId.get(leg.id) === StatusTypes.FAILED,
  );
  if (bridgeFailed) {
    return 'bridgeFailed';
  }

  const bridgeLanded = legs.some(
    (leg) => bridgeStatusByLegId.get(leg.id) === StatusTypes.COMPLETE,
  );
  if (bridgeLanded) {
    return 'bridgedNotDeposited';
  }

  if (!parent.hash) {
    return 'notSubmitted';
  }

  return 'unknown';
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
 * bridged-not-deposited sentence.
 * @param options.payTotalFiat - Pay's USD total, so that sentence can say how
 * much is waiting there.
 * @returns The failure, or `undefined` when the row did not fail.
 */
export function usePayFundsFailure(
  item: ActivityListItem,
  {
    destination,
    payTotalFiat,
  }: { destination: PayFundsDestination; payTotalFiat?: string },
): PayFundsFailure | undefined {
  const parent = useLocalTransaction(item);
  const formatFiat = useFiatFormatter({ currency: PAY_FIAT_CURRENCY });
  const totalFiat = payTotalFiat
    ? formatFiat(new BigNumber(payTotalFiat))
    : undefined;

  const legIds = useMemo(
    () => parent?.requiredTransactionIds ?? [],
    [parent?.requiredTransactionIds],
  );

  const legs = useSelector((state: RootState) =>
    legIds.length ? selectTransactionsByIds(state, legIds) : NO_LEGS,
  );

  // Bridge history is keyed by leg id, so it says nothing about a row with no
  // legs. Skipping it then also keeps this hook off the account-group selector
  // chain for rows that cannot use it.
  const bridgeHistory = useSelector((state: RootState) =>
    legs.length ? selectBridgeHistoryForAccount(state) : NO_BRIDGE_HISTORY,
  );

  return useMemo(() => {
    const isFailedRow = item.status === 'failed' || hasFailed(parent);
    if (!isFailedRow) {
      return undefined;
    }

    if (!parent) {
      const shape: PayFundsFailureShape = 'unknown';
      return { shape, message: getMessage(shape, destination, totalFiat) };
    }

    const bridgeStatusByLegId = new Map(
      legs.map((leg) => [leg.id, bridgeHistory[leg.id]?.status?.status]),
    );

    const shape = classify({ parent, legs, bridgeStatusByLegId });

    return { shape, message: getMessage(shape, destination, totalFiat) };
  }, [bridgeHistory, destination, item.status, legs, parent, totalFiat]);
}
