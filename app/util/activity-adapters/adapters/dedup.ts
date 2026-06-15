/**
 * Deduplication and merge helpers for ActivityListItem lists.
 * Mirrors the Extension's helpers.ts#dedupeItems + groupActivityListItems,
 * adapted for Mobile's three-source merge pattern.
 */
import type { ActivityListItem } from '../types';

function getItemHash(item: ActivityListItem): string | undefined {
  return item.data.hash?.toLowerCase();
}

/**
 * Merges local-EVM, API-confirmed-EVM, non-EVM, and domain (perps/predict)
 * ActivityListItem arrays into a single list sorted newest-first, deduplicated
 * by hash.
 *
 * Precedence: domain (perps/predict) > confirmed EVM > local EVM > non-EVM.
 * Domain items win because a perps/predict deposit/withdrawal is also a real
 * EVM transaction — the API/local copy of the same hash maps to a generic kind
 * (e.g. `contractInteraction`), while the domain copy carries the specific kind
 * (`perpsAddFunds`, `predictionsAddFunds`, …) the row needs.
 */
export function mergeActivityItems(
  localItems: ActivityListItem[],
  confirmedEvmItems: ActivityListItem[],
  nonEvmItems: ActivityListItem[],
  perpsItems: ActivityListItem[] = [],
  predictItems: ActivityListItem[] = [],
): ActivityListItem[] {
  const seenHashes = new Set<string>();
  const result: ActivityListItem[] = [];

  // Domain items carry the most specific activity kinds — seed them first so
  // the EVM copies of the same on-chain deposit/withdrawal dedupe away.
  for (const item of [...perpsItems, ...predictItems]) {
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
