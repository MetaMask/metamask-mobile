export type MoneyAccountDepositIntent = 'convert' | 'addMusd' | 'card';

const depositIntentByBatchId = new Map<string, MoneyAccountDepositIntent>();

export function getMoneyAccountDepositIntent(
  batchId: string | undefined,
): MoneyAccountDepositIntent | undefined {
  if (!batchId) return undefined;
  return depositIntentByBatchId.get(batchId.toLowerCase());
}

export function setMoneyAccountDepositIntent(
  batchId: string | undefined,
  intent: MoneyAccountDepositIntent,
): void {
  if (!batchId) return;
  depositIntentByBatchId.set(batchId.toLowerCase(), intent);
}

export function clearMoneyAccountDepositIntent(
  batchId: string | undefined,
): void {
  if (!batchId) return;
  depositIntentByBatchId.delete(batchId.toLowerCase());
}
