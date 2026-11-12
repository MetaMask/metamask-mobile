import type { Json } from '@metamask/utils';
import type { CollectiblesApiClient } from '../clients/CollectiblesApiClient';
import type { CollectiblesSocialApiClient } from '../clients/CollectiblesSocialApiClient';

/**
 * Shared keys of the optional Collectibles API and Social reads, so UI, background
 * cache and invalidation address the same query. PackPartner reads use the
 * descriptors in `packPartnerQueries`.
 */
export const collectiblesQueries = {
  api<Method extends keyof CollectiblesApiClient>(
    method: Method,
    scope: string,
    request: Parameters<CollectiblesApiClient[Method]>[0],
  ) {
    return [
      `CollectiblesApiDataService:${method}`,
      scope,
      request as Json,
    ] as const;
  },
  social<Method extends keyof CollectiblesSocialApiClient>(
    method: Method,
    scope: string,
    request: Parameters<CollectiblesSocialApiClient[Method]>[0],
  ) {
    return [
      `CollectiblesSocialApiDataService:${method}`,
      scope,
      request as Json,
    ] as const;
  },
};

/** Stable cache identity for a bounded set of API identifiers. */
export function uniqueBatch(values: string[]): string[] {
  const unique = [...new Set(values)].sort();
  if (unique.length > 100) {
    throw new RangeError('A batch supports at most 100 identifiers.');
  }
  return unique;
}
