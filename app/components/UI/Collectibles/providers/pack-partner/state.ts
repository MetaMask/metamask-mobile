import { isObject } from '@metamask/utils';
import type {
  PackPartnerBuybackOperation,
  PackPartnerCard,
  PackPartnerPackOperation,
} from './types/packPartner';
import {
  prunePurchasesForPersistence,
  pruneSalesForPersistence,
} from './utils/operations';
import { parseUsdcAmount } from './utils/format';
import { isPackPartnerErrorCode } from './services/errors';

/** Drop free-form errors from earlier builds before displaying or saving them. */
const sanitizeOperationError = (
  operation: PackPartnerPackOperation,
): PackPartnerPackOperation => {
  if (!operation.error) return operation;
  return {
    ...operation,
    error: {
      code: isPackPartnerErrorCode(operation.error.code)
        ? operation.error.code
        : 'UNKNOWN',
    },
  };
};

/** Sales have no error field; discard any extra legacy error completely. */
const withoutSaleErrors = (
  journal: PackPartnerState['sales'],
): PackPartnerState['sales'] =>
  Object.fromEntries(
    Object.entries(journal).map(([address, sales]) => [
      address,
      Object.fromEntries(
        Object.entries(sales).map(([mint, sale]) => {
          const { error: _error, ...receipt } =
            sale as PackPartnerBuybackOperation & {
              error?: unknown;
            };
          return [mint, receipt];
        }),
      ),
    ]),
  );

/**
 * Workflow journal of the PackPartner provider. Owned cards and buyback
 * offers are server reads owned by `PackPartnerDataService`; only the
 * operations this device started are kept here, so they can be resumed.
 */
// State-bearing shapes must be type aliases to satisfy `Json`.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PackPartnerState = {
  /** Pack purchases, keyed by Solana address, then memo. */
  operations: Record<string, Record<string, PackPartnerPackOperation>>;
  /** Opening memo by account and mint, independent of reveal retention. */
  openingMemos?: Record<string, Record<string, string>>;
  /** Manual buybacks, keyed by Solana address, then mint. */
  sales: Record<string, Record<string, PackPartnerBuybackOperation>>;
};

/**
 * Empty Pack Partner state.
 *
 * @returns A new default state.
 */
export const getDefaultPackPartnerState = (): PackPartnerState => ({
  operations: {},
  sales: {},
});

/** Persisted purchase shape written by earlier development builds. */
type LegacyPackOperation = Omit<
  PackPartnerPackOperation,
  'status' | 'priceAmount'
> & {
  status: PackPartnerPackOperation['status'] | 'signed';
  priceAmount?: string;
  signedTransaction?: string;
  signature?: string;
};

/**
 * An opening's result as earlier development builds stored it: a manual sale
 * journal could live on the card. Only an automatic Turbo payout belongs to
 * the result; a manual sale is a buyback operation.
 *
 * @param result - Stored result card.
 * @returns The result without legacy bookkeeping.
 */
const restoreResult = (result: PackPartnerCard): PackPartnerCard => {
  const legacy = result as PackPartnerCard & { source?: unknown };
  const { source: _source, sale, buyback: _buyback, ...card } = legacy;
  return {
    ...card,
    buyback: { status: sale?.automatic ? 'unavailable' : 'unknown' },
    ...(sale?.automatic
      ? {
          sale: {
            status: sale.status,
            automatic: true,
            amount: sale.amount,
            updatedAt: sale.updatedAt,
            ...(sale.signature ? { signature: sale.signature } : {}),
          },
        }
      : {}),
  };
};

/** Sanitizes the purchase journal without mutating controller state. */
const sanitizePurchaseJournal = (
  journal: PackPartnerState['operations'],
): PackPartnerState['operations'] =>
  Object.fromEntries(
    Object.entries(journal).map(([address, operations]) => [
      address,
      Object.fromEntries(
        Object.entries(operations).map(([id, operation]) => [
          id,
          sanitizeOperationError(
            operation.result
              ? { ...operation, result: restoreResult(operation.result) }
              : operation,
          ),
        ]),
      ),
    ]),
  );

/**
 * Restores persisted provider state. Keeps only the operation journal: the
 * cards and buyback caches of earlier development builds are dropped, a
 * legacy `signed` purchase resumes as `submitted`, through its memo, and an
 * opening's result keeps only its automatic Turbo sale.
 *
 * @param persisted - Persisted provider state, possibly from an earlier build.
 * @returns The provider state.
 */
export const restorePackPartnerState = (
  persisted:
    | Partial<Record<keyof PackPartnerState | 'cards', unknown>>
    | undefined,
): PackPartnerState => {
  const operations = (persisted?.operations ?? {}) as Record<
    string,
    Record<string, LegacyPackOperation>
  >;
  // Recover links from receipts written before the separate index existed.
  const openingMemos: NonNullable<PackPartnerState['openingMemos']> = {};
  for (const [address, links] of Object.entries(
    (persisted?.openingMemos ?? {}) as NonNullable<
      PackPartnerState['openingMemos']
    >,
  )) {
    openingMemos[address] = { ...links };
  }
  if (isObject(persisted?.cards)) {
    for (const [address, cards] of Object.entries(persisted.cards)) {
      if (!isObject(cards)) continue;
      for (const [mint, card] of Object.entries(cards)) {
        if (
          isObject(card) &&
          card.mint === mint &&
          typeof card.memo === 'string' &&
          card.memo &&
          !(
            isObject(card.sale) &&
            (card.sale.automatic || card.sale.status === 'completed')
          )
        ) {
          (openingMemos[address] ??= {})[mint] ??= card.memo;
        }
      }
    }
  }
  for (const [address, purchases] of Object.entries(operations)) {
    for (const purchase of Object.values(purchases)) {
      const mint = purchase.mint ?? purchase.result?.mint;
      if (
        purchase.status === 'opened' &&
        mint &&
        purchase.result?.sale?.status !== 'completed' &&
        !purchase.result?.sale?.automatic &&
        !(purchase.turbo && purchase.result?.rarity === 'common')
      ) {
        (openingMemos[address] ??= {})[mint] ??= purchase.memo;
      }
    }
  }
  for (const [address, sales] of Object.entries(
    (persisted?.sales ?? {}) as PackPartnerState['sales'],
  )) {
    for (const sale of Object.values(sales)) {
      if (sale.status === 'completed' && openingMemos[address])
        delete openingMemos[address][sale.mint];
    }
  }
  return {
    ...(Object.keys(openingMemos).length && { openingMemos }),
    operations: Object.fromEntries(
      Object.entries(operations).map(([address, byMemo]) => [
        address,
        Object.fromEntries(
          Object.entries(byMemo).map(([memo, operation]) => {
            const {
              signedTransaction: _signedTransaction,
              transaction: _transaction,
              status,
              result,
              ...rest
            } = operation;
            return [
              memo,
              sanitizeOperationError({
                ...rest,
                // Earlier builds stored only the whole-USDC price.
                priceAmount:
                  rest.priceAmount ?? parseUsdcAmount(rest.price).toString(),
                status: status === 'signed' ? 'submitted' : status,
                ...(result ? { result: restoreResult(result) } : {}),
              }),
            ];
          }),
        ),
      ]),
    ),
    sales: withoutSaleErrors(
      (persisted?.sales ?? {}) as PackPartnerState['sales'],
    ),
  };
};

/**
 * Keeps the operations needed after a restart.
 *
 * @param state - Current provider state.
 * @param now - Current timestamp.
 * @returns Provider state ready for persistence.
 */
export const getPersistedPackPartnerState = (
  state: PackPartnerState,
  now: number,
): PackPartnerState => ({
  ...(state.openingMemos && { openingMemos: state.openingMemos }),
  operations: sanitizePurchaseJournal(
    prunePurchasesForPersistence(state.operations, now),
  ),
  sales: withoutSaleErrors(pruneSalesForPersistence(state.sales, now)),
});
