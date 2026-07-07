/**
 * Deduplication and merge helpers for ActivityListItem lists.
 * Mirrors the Extension's helpers.ts#dedupeItems + groupActivityListItems,
 * adapted for Mobile's three-source merge pattern.
 */
import type { ActivityListItem } from '../types';

function getItemHash(item: ActivityListItem): string | undefined {
  return item.hash?.toLowerCase();
}

/**
 * Merges local-EVM, API-confirmed-EVM, non-EVM, and domain
 * (perps/predict/ramp) ActivityListItem arrays into a single list sorted
 * newest-first, deduplicated by hash.
 *
 * Precedence: domain (perps/predict/ramp) > confirmed EVM > local EVM >
 * non-EVM. Domain items win because a perps/predict/ramp deposit/withdrawal is
 * also a real EVM transaction — the API/local copy of the same hash maps to a
 * generic kind, while the domain copy carries the specific kind the row needs.
 *
 * IMPORTANT — this hash-based cross-source dedup only holds for items whose
 * `hash` is the real on-chain tx hash: perps/predict deposits & withdrawals
 * (mapped from local TransactionMeta, so `hash` is the tx hash) and perps
 * fills (HyperLiquid `txHash`). It does NOT hold for Predict trade/claim items
 * from the Polymarket feed: `mapPredictActivity` sets `hash` to a synthetic
 * composite id (`getPolymarketActivityId` — txHash:type:side:…:price:outcome),
 * because one on-chain tx can produce several distinct activities, so the bare
 * tx hash isn't a unique key. Consequence: a Predict claim (a real
 * `redeemPositions` tx) surfaces both here (synthetic hash) and in the EVM feed
 * (real hash) and will NOT dedup.
 *
 * This is currently invisible because `ActivityTypeFilter.All` is disabled and
 * predict-feed kinds vs. the generic EVM kind live in different filter buckets,
 * so they never render together. TODO(activity-redesign): when re-enabling
 * "All", suppress the generic EVM copy of a predict trade/claim by its
 * underlying tx hash — preserve `transactionHash` as a separate field on the
 * predict item (keep the composite `hash` for React keys / intra-tx
 * uniqueness) and extend the dedup to match on it. See the `All` TODO in
 * `ActivityScreen/types.ts`.
 */
export function mergeActivityItems(
  localItems: ActivityListItem[],
  confirmedEvmItems: ActivityListItem[],
  nonEvmItems: ActivityListItem[],
  perpsItems: ActivityListItem[] = [],
  predictItems: ActivityListItem[] = [],
  rampItems: ActivityListItem[] = [],
): ActivityListItem[] {
  const seenHashes = new Set<string>();
  const result: ActivityListItem[] = [];

  // Domain items carry the most specific activity kinds — seed them first so
  // the EVM copies of the same on-chain deposit/withdrawal dedupe away.
  for (const item of [...perpsItems, ...predictItems, ...rampItems]) {
    const hash = getItemHash(item);
    if (hash) {
      if (seenHashes.has(hash)) continue;
      seenHashes.add(hash);
    }
    result.push(item);
  }

  // Confirmed EVM items are authoritative for everything else.
  for (const item of confirmedEvmItems) {
    const hash = getItemHash(item);
    if (hash) {
      if (seenHashes.has(hash)) continue;
      seenHashes.add(hash);
    }
    result.push(item);
  }

  // Local items: include unless a confirmed item with the same hash exists.
  for (const item of localItems) {
    const hash = getItemHash(item);
    if (hash && seenHashes.has(hash)) continue;
    if (hash) seenHashes.add(hash);
    result.push(item);
  }

  // Non-EVM: deduplicate by hash.
  for (const item of nonEvmItems) {
    const hash = getItemHash(item);
    if (hash && seenHashes.has(hash)) continue;
    if (hash) seenHashes.add(hash);
    result.push(item);
  }

  return result.sort((a, b) => b.timestamp - a.timestamp);
}
