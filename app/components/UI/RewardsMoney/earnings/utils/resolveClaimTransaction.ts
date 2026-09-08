import type { TransactionMeta } from '@metamask/transaction-controller';
import { areAddressesEqual } from '../../../../../util/address';
import type {
  ClaimDto,
  ClaimLifecycleStatus,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';

/**
 * How long after a claim opens its batch could still plausibly appear.
 *
 * The voucher lives 60 seconds and the client submits immediately, so a
 * transaction more than a few minutes later is a different action the user
 * took, not this claim. Bounding the search is what keeps an inferred match
 * from silently pointing at an unrelated transfer.
 */
const INFERRED_MATCH_WINDOW_MS = 5 * 60 * 1000;

/**
 * The only states a guess can legitimately apply to.
 *
 * An `EXPIRED` or `FAILED` claim never reached the chain, so there is no
 * transaction of its own to find and any match would be definitionally wrong —
 * it would open some unrelated money-account transfer that merely happened
 * next. That is most likely exactly when it hurts: a retry leaves expired rows
 * sitting beside the successful one.
 *
 * `SETTLED` is excluded too. Its transaction is real, but its hash is
 * authoritative — see the early return below.
 */
const INFERABLE_STATUSES: readonly ClaimLifecycleStatus[] = [
  'AUTHORIZED',
  'PENDING_SIGNATURE',
];

export type ClaimTransactionMatch =
  | { kind: 'exact'; transactionId: string }
  | { kind: 'inferred'; transactionId: string }
  | { kind: 'none' };

/**
 * Finds the transaction a claim row should open.
 *
 * Three cases, in descending confidence.
 *
 * **Exact, by hash.** A settled claim carries `settled_tx_hash`, written by the
 * reconciler from the `AuthorizationUsed` log. Matched against local
 * transactions to recover the `TransactionMeta.id` the details screen keys on.
 * Note a `SETTLED` claim can still have no hash — `dev:settle-claim` records no
 * provenance — so settled does not imply openable.
 *
 * **Exact, by id.** A claim opened in this app session has its batch in local
 * state already, matched on the id the caller held at submission.
 *
 * **Inferred, by time.** Only for a claim still in flight (`AUTHORIZED` or
 * `PENDING_SIGNATURE`) that carries no hash: the earliest local transaction
 * from the money account, on this chain, at or after the claim opened and
 * inside `INFERRED_MATCH_WINDOW_MS`. This is a guess and is labelled as one.
 * Every other state resolves to `none` rather than guessing.
 *
 * @param params.claim - The claim row being tapped.
 * @param params.transactions - Local transactions, newest first.
 * @param params.chainId - Hex chain id the money account settles on.
 * @param params.knownTransactionId - Id captured when this session submitted.
 * @returns The match, or `none` when nothing plausible exists.
 */
export function resolveClaimTransaction({
  claim,
  transactions,
  chainId,
  knownTransactionId,
}: {
  claim: ClaimDto;
  transactions: TransactionMeta[];
  chainId: string;
  knownTransactionId?: string;
}): ClaimTransactionMatch {
  const onChain = transactions.filter(
    (tx) =>
      tx.chainId?.toLowerCase() === chainId.toLowerCase() &&
      areAddressesEqual(tx.txParams?.from ?? '', claim.money_account_address),
  );

  if (claim.settled_tx_hash) {
    const byHash = onChain.find(
      (tx) => tx.hash?.toLowerCase() === claim.settled_tx_hash?.toLowerCase(),
    );
    if (byHash) {
      return { kind: 'exact', transactionId: byHash.id };
    }
  }

  if (knownTransactionId) {
    const byId = onChain.find((tx) => tx.id === knownTransactionId);
    if (byId) {
      return { kind: 'exact', transactionId: byId.id };
    }
  }

  // A settled claim's hash is the authoritative answer. Not finding it in local
  // history is a known miss — the row was pruned, or settled on another
  // install — not licence to guess at a different transaction.
  if (claim.settled_tx_hash) {
    return { kind: 'none' };
  }

  // Everything below is a guess, so it is offered only where a real in-flight
  // transaction could plausibly exist.
  if (!INFERABLE_STATUSES.includes(claim.status)) {
    return { kind: 'none' };
  }

  const openedAt = Date.parse(claim.created_at);
  if (Number.isNaN(openedAt)) {
    return { kind: 'none' };
  }

  // `transactions` arrives newest-first, so the last in-window candidate is the
  // earliest one at or after the claim opened.
  const candidates = onChain.filter(
    (tx) =>
      typeof tx.time === 'number' &&
      tx.time >= openedAt &&
      tx.time - openedAt <= INFERRED_MATCH_WINDOW_MS,
  );
  const earliest = candidates[candidates.length - 1];

  return earliest
    ? { kind: 'inferred', transactionId: earliest.id }
    : { kind: 'none' };
}

export default resolveClaimTransaction;
