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
 * Merges local-EVM, API-confirmed-EVM, and non-EVM ActivityListItem arrays into
 * a single list sorted newest-first. API-confirmed items win deduplication over
 * local items with the same hash.
 *
 * Order of precedence: local first, then confirmed, then non-EVM — matching the
 * original Mobile behavior where confirmed beats local by hash.
 */
export function mergeActivityItems(
  localItems: ActivityListItem[],
  confirmedEvmItems: ActivityListItem[],
  nonEvmItems: ActivityListItem[],
): ActivityListItem[] {
  const seenHashes = new Set<string>();
  const result: ActivityListItem[] = [];

  // Confirmed EVM items are authoritative — add them first to seed seen hashes.
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
