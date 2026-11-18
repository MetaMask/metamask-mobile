import { PACK_PARTNER_TIMINGS } from '../constants/packPartner';
import type {
  PackPartnerBuybackOperation,
  PackPartnerCard,
  PackPartnerSale,
  PackPartnerPackOperation,
  PackPartnerPackOperationStatus,
} from '../types/packPartner';

const RESUMABLE_STATUSES: readonly PackPartnerPackOperationStatus[] = [
  'generated',
  'submitted',
  'paid',
];

const TERMINAL_STATUSES: readonly PackPartnerPackOperationStatus[] = [
  'opened',
  'expired',
  'failed',
];

/**
 * Whether `completePack` can still move the operation forward.
 *
 * @param operation - Pack operation.
 * @returns True for generated, submitted and paid.
 */
export const isOperationResumable = (
  operation: PackPartnerPackOperation,
): boolean => RESUMABLE_STATUSES.includes(operation.status);

/**
 * Whether the operation reached its final status.
 *
 * @param operation - Pack operation.
 * @returns True for opened, expired and failed.
 */
export const isOperationTerminal = (
  operation: PackPartnerPackOperation,
): boolean => TERMINAL_STATUSES.includes(operation.status);

/**
 * Operations the UI must surface: resumable (processing), opened (card to
 * reveal), expired, failed. Sorted newest first.
 *
 * @param operations - Operations of the account, by memo.
 * @returns The operations needing attention.
 */
export const getAttentionOperations = (
  operations: Record<string, PackPartnerPackOperation> | undefined,
): PackPartnerPackOperation[] =>
  Object.values(operations ?? {}).sort(
    (a, b) => b.createdAt - a.createdAt || b.memo.localeCompare(a.memo),
  );

/** Optional fields a transition may set or remove. */
const PATCHABLE_OPTIONAL_KEYS = [
  'transaction',
  'mint',
  'result',
] as const satisfies readonly (keyof PackPartnerPackOperation)[];

/**
 * A transition: the new status, plus optional fields to set (a value) or to
 * remove (`undefined`). Required fields other than the status never change.
 */
export type OperationPatch = Pick<PackPartnerPackOperation, 'status'> &
  Partial<
    Pick<PackPartnerPackOperation, (typeof PATCHABLE_OPTIONAL_KEYS)[number]>
  >;

/**
 * Applies a transition. Undefined patch values remove the field, and the
 * previous error is cleared.
 *
 * @param operation - Current operation.
 * @param patch - New status and optional fields to change.
 * @param now - Epoch ms, stored as `updatedAt`.
 * @returns The new operation.
 */
export const patchOperation = (
  operation: PackPartnerPackOperation,
  patch: OperationPatch,
  now: number,
): PackPartnerPackOperation => {
  const { error: _error, ...current } = operation;
  const next: PackPartnerPackOperation = {
    ...current,
    ...patch,
    updatedAt: now,
  };
  PATCHABLE_OPTIONAL_KEYS.forEach((key) => {
    if (next[key] === undefined) {
      delete next[key];
    }
  });
  return next;
};

/**
 * Sale state shown on a card for a buyback operation.
 *
 * @param sale - Buyback operation of the card, if any.
 * @returns The display sale, or undefined.
 */
export const toCardSale = (
  sale: PackPartnerBuybackOperation | undefined,
): PackPartnerSale | undefined =>
  sale && {
    status: sale.status,
    amount: sale.amount,
    updatedAt: sale.updatedAt,
    ...(sale.signature ? { signature: sale.signature } : {}),
  };

/**
 * Shows the account's buyback operations on its cards. A card keeps its own
 * sale (an automatic Turbo payout) when it has no buyback operation.
 * Unchanged cards keep their reference.
 *
 * @param cards - Cards to display.
 * @param sales - Buyback operations of the account, by mint.
 * @returns The cards with their sale state.
 */
export const withCardSales = (
  cards: PackPartnerCard[],
  sales: Record<string, PackPartnerBuybackOperation> | undefined,
): PackPartnerCard[] =>
  sales
    ? cards.map((card) => {
        const sale = toCardSale(sales[card.mint]);
        return sale ? { ...card, sale } : card;
      })
    : cards;

/**
 * Whether a terminal record is past its retention.
 *
 * @param updatedAt - Epoch ms of its last transition.
 * @param now - Epoch ms.
 * @returns True when it can be dropped.
 */
const isExpiredRecord = (updatedAt: number, now: number): boolean =>
  now - updatedAt > PACK_PARTNER_TIMINGS.TERMINAL_TTL;

/**
 * Drops empty accounts from a per-account record.
 *
 * @param byAccount - Records by address.
 * @returns The non-empty accounts.
 */
const withoutEmptyAccounts = <Value>(
  byAccount: Record<string, Record<string, Value>>,
): Record<string, Record<string, Value>> =>
  Object.fromEntries(
    Object.entries(byAccount).filter(
      ([, records]) => Object.keys(records).length > 0,
    ),
  );

/**
 * Purchase as persisted: no `generated` operation, no unsigned transaction,
 * and no terminal operation older than TERMINAL_TTL. A submitted or paid
 * purchase is resumed by memo; nothing signed is ever persisted.
 *
 * @param operation - Operation in state.
 * @param now - Epoch ms.
 * @returns The persisted operation, or undefined to drop it.
 */
const toPersistedPurchase = (
  operation: PackPartnerPackOperation,
  now: number,
): PackPartnerPackOperation | undefined => {
  if (
    operation.status === 'generated' ||
    (isOperationTerminal(operation) &&
      isExpiredRecord(operation.updatedAt, now))
  ) {
    return undefined;
  }
  const { transaction: _transaction, ...persisted } = operation;
  return persisted;
};

/**
 * Persist deriver for purchases, by address then memo.
 *
 * @param operationsByAccount - Purchases by address, then memo.
 * @param now - Epoch ms.
 * @returns The purchases to persist.
 */
export const prunePurchasesForPersistence = (
  operationsByAccount: Record<string, Record<string, PackPartnerPackOperation>>,
  now: number,
): Record<string, Record<string, PackPartnerPackOperation>> =>
  withoutEmptyAccounts(
    Object.fromEntries(
      Object.entries(operationsByAccount).map(([address, operations]) => [
        address,
        Object.fromEntries(
          Object.entries(operations).flatMap(([memo, operation]) => {
            const kept = toPersistedPurchase(operation, now);
            return kept ? [[memo, kept] as const] : [];
          }),
        ),
      ]),
    ),
  );

/**
 * Persist deriver for buybacks: a pending sale is always kept; a completed
 * one is kept as a receipt until TERMINAL_TTL.
 *
 * @param salesByAccount - Buybacks by address, then mint.
 * @param now - Epoch ms.
 * @returns The buybacks to persist.
 */
export const pruneSalesForPersistence = (
  salesByAccount: Record<string, Record<string, PackPartnerBuybackOperation>>,
  now: number,
): Record<string, Record<string, PackPartnerBuybackOperation>> =>
  withoutEmptyAccounts(
    Object.fromEntries(
      Object.entries(salesByAccount).map(([address, sales]) => [
        address,
        Object.fromEntries(
          Object.entries(sales).filter(
            ([, sale]) =>
              sale.status === 'pending' ||
              !isExpiredRecord(sale.updatedAt, now),
          ),
        ),
      ]),
    ),
  );
