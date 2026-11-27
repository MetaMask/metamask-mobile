import { PACK_PARTNER_TIMINGS } from '../constants/packPartner';
import type {
  PackPartnerBuybackOperation,
  PackPartnerPackOperation,
  PackPartnerPackOperationStatus,
} from '../types/packPartner';

const TERMINAL_STATUSES: readonly PackPartnerPackOperationStatus[] = [
  'opened',
  'expired',
  'failed',
];

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
