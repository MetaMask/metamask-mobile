import { COLLECTOR_CRYPT_TIMINGS } from '../constants';
import type { PackOperation, PackOperationStatus } from '../types';

const RESUMABLE_STATUSES: readonly PackOperationStatus[] = [
  'generated',
  'signed',
  'submitted',
  'paid',
];

const TERMINAL_STATUSES: readonly PackOperationStatus[] = [
  'opened',
  'expired',
  'failed',
];

/**
 * Whether `completePack` can still move the operation forward.
 *
 * @param operation - Pack operation.
 * @returns True for generated, signed, submitted and paid.
 */
export const isOperationResumable = (operation: PackOperation): boolean =>
  RESUMABLE_STATUSES.includes(operation.status);

/**
 * Whether the operation reached its final status.
 *
 * @param operation - Pack operation.
 * @returns True for opened, expired and failed.
 */
export const isOperationTerminal = (operation: PackOperation): boolean =>
  TERMINAL_STATUSES.includes(operation.status);

/**
 * Operations the UI must surface: resumable (processing), opened (card to
 * reveal), expired, failed. Sorted newest first.
 *
 * @param operations - Operations of the account, by memo.
 * @returns The operations needing attention.
 */
export const getAttentionOperations = (
  operations: Record<string, PackOperation> | undefined,
): PackOperation[] =>
  Object.values(operations ?? {}).sort(
    (a, b) => b.createdAt - a.createdAt || b.memo.localeCompare(a.memo),
  );

/**
 * Applies a transition. Undefined patch values remove the field, and the
 * previous error is cleared unless the patch sets one.
 *
 * @param operation - Current operation.
 * @param patch - Fields to change.
 * @param now - Epoch ms, stored as `updatedAt`.
 * @returns The new operation.
 */
export const patchOperation = (
  operation: PackOperation,
  patch: Partial<Omit<PackOperation, 'memo' | 'createdAt' | 'updatedAt'>>,
  now: number,
): PackOperation => {
  const { error: _error, ...rest } = operation;
  const next: Record<string, unknown> = { ...rest, ...patch, updatedAt: now };
  Object.keys(next).forEach((key) => {
    if (next[key] === undefined) {
      delete next[key];
    }
  });
  return next as PackOperation;
};

/**
 * Operation as persisted: no `generated`, no unsigned transaction and no
 * terminal operation older than TERMINAL_TTL.
 *
 * @param operation - Operation in state.
 * @param now - Epoch ms.
 * @returns The persisted operation, or undefined to drop it.
 */
const toPersistedOperation = (
  operation: PackOperation,
  now: number,
): PackOperation | undefined => {
  if (operation.status === 'generated') {
    return undefined;
  }
  if (
    isOperationTerminal(operation) &&
    now - operation.updatedAt > COLLECTOR_CRYPT_TIMINGS.TERMINAL_TTL
  ) {
    return undefined;
  }
  const { transaction: _transaction, ...persisted } = operation;
  return persisted;
};

/**
 * Persist deriver: drops `generated`, drops `transaction` field, drops
 * terminal ops older than TERMINAL_TTL, and empty accounts.
 *
 * @param operationsByAccount - Operations by address, then memo.
 * @param now - Epoch ms.
 * @returns The operations to persist.
 */
export const pruneOperationsForPersistence = (
  operationsByAccount: Record<string, Record<string, PackOperation>>,
  now: number,
): Record<string, Record<string, PackOperation>> =>
  Object.fromEntries(
    Object.entries(operationsByAccount)
      .map(([address, operations]) => {
        const persisted = Object.entries(operations).flatMap(
          ([memo, operation]) => {
            const kept = toPersistedOperation(operation, now);
            return kept ? [[memo, kept] as const] : [];
          },
        );
        return [address, Object.fromEntries(persisted)] as const;
      })
      .filter(([, operations]) => Object.keys(operations).length > 0),
  );
