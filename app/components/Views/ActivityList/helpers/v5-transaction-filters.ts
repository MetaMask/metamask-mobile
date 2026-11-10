import type { V5TransactionRecord } from '@metamask/core-backend';
import { equalsIgnoreCase } from '../../../../util/string';

export function shouldSkipUnrelatedV5Transaction(
  address: string,
  transaction: V5TransactionRecord,
  excludedTxHashes?: Set<string>,
) {
  // A v4-shaped record has no `tx`. Skipping it keeps one bad row from
  // failing the whole activity query.
  if (!transaction?.tx) {
    return true;
  }

  const subjectAddress = address.toLowerCase();
  const rawFrom = transaction.tx.from?.toLowerCase();
  const rawTo = transaction.tx.to?.toLowerCase();
  const hash = transaction.tx.id?.toLowerCase();
  const hasTopLevelAddressMatch =
    rawFrom === subjectAddress || rawTo === subjectAddress;

  if (hash && excludedTxHashes?.has(hash)) {
    return true;
  }

  if (!hasTopLevelAddressMatch) {
    return true;
  }

  return (
    equalsIgnoreCase(transaction.tx.from, subjectAddress) &&
    equalsIgnoreCase(transaction.tx.to ?? '', subjectAddress) &&
    transaction.tx.value === '0' &&
    !transaction.valueTransfers.length &&
    (!transaction.tx.methodId || transaction.tx.methodId === '0x')
  );
}

export function shouldSkipV5Transaction(
  address: string,
  transaction: V5TransactionRecord,
  excludedTxHashes?: Set<string>,
) {
  return shouldSkipUnrelatedV5Transaction(
    address,
    transaction,
    excludedTxHashes,
  );
}

export function getPooledStakingFieldsFromV5Transaction(
  transaction: V5TransactionRecord,
) {
  const chainIdPart = transaction.tx.chainId.split(':')[1];
  const chainId = Number(chainIdPart);

  return {
    chainId: Number.isFinite(chainId) ? chainId : 0,
    to: transaction.tx.to ?? '',
    methodId: transaction.tx.methodId,
    gasUsed: 0,
    effectiveGasPrice: '0',
  };
}
