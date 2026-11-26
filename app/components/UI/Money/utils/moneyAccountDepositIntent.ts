import type { QuickDepositIntent } from './quickDepositStablecoins';

export type MoneyAccountDepositIntent = 'convert' | 'card' | QuickDepositIntent;

/** Intents that prefill 100% of the selected pay token. */
export const isFullBalanceDepositIntent = (
  intent: MoneyAccountDepositIntent | undefined,
): boolean =>
  intent === 'addMusd' || intent === 'addUsdc' || intent === 'addUsdt';

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
