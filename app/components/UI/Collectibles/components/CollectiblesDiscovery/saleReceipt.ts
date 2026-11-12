import type { IndexedPack } from '../../services/clients/CollectiblesApiClient';

/** A sold tile displays its receipt, never the card's insured appraisal. */
export const saleReceiptUsd = (
  pack: Pick<IndexedPack, 'buyback'>,
): number | null => {
  const value = pack.buyback?.amountUsd;
  if (value === null || value === undefined || value.trim() === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};
