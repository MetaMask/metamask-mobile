import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  getChainIdsCaveat,
  getLookupMatchersCaveat,
} from '@metamask/snaps-rpc-methods';
import { DomainLookupResult } from '@metamask/snaps-sdk';
import { HandlerType } from '@metamask/snaps-utils';
import { handleSnapRequest } from '../../../core/Snaps/utils';
import Engine from '../../../core/Engine';
import { getNameLookupSnaps } from '../../../selectors/snaps';

interface CachedResolution {
  resolvedAddress?: string;
  protocol?: string;
}

const resolutionCache = new Map<
  string,
  { timestamp: number; result: CachedResolution[] }
>();
const CACHE_TTL_MS = 60000;
const MAX_CACHE_SIZE = 100;

/**
 * Removes expired entries from the cache to prevent unbounded memory growth.
 * Called periodically during cache operations.
 */
function pruneExpiredCacheEntries() {
  const now = Date.now();
  for (const [key, value] of resolutionCache.entries()) {
    if (now - value.timestamp >= CACHE_TTL_MS) {
      resolutionCache.delete(key);
    }
  }
}

/**
 * A hook for using Snaps to resolve domain names for a given chain ID.
 *
 * @param options - An options bag.
 * @param options.chainId - A CAIP-2 chain ID.
 * @param options.domain - The domain to resolve.
 * @returns The results of the name resolution and a flag to determine if the
 * results are loading.
 */
export function useSnapNameResolution() {
  const snaps = useSelector(getNameLookupSnaps);

  /**
   * Filters the available snaps based on the provided chain ID and domain.
   * @param chainId - The CAIP-2 chain ID.
   * @param domain - The domain to resolve.
   * @returns The filtered snap IDs.
   */
  const getAvailableSnaps = useCallback(
    (chainId: string, domain: string) =>
      snaps
        .filter(({ permission }) => {
          const chainIdCaveat = getChainIdsCaveat(permission);

          if (chainIdCaveat && !chainIdCaveat.includes(chainId)) {
            return false;
          }

          const lookupMatchersCaveat = getLookupMatchersCaveat(permission);

          if (lookupMatchersCaveat) {
            const { tlds, schemes } = lookupMatchersCaveat;
            return (
              tlds?.some((tld) => domain.endsWith(`.${tld}`)) ||
              schemes?.some((scheme) => domain.startsWith(`${scheme}:`))
            );
          }

          return true;
        })
        .map(({ id }) => id),
    [snaps],
  );

  /**
   * Fetches name resolutions from the available snaps for the given chain ID and domain.
   * @param chainId - The CAIP-2 chain ID.
   * @param domain - The domain to resolve.
   * @param signal - Optional AbortSignal to cancel the request.
   * @returns An object containing the resolutions and any errors encountered.
   */
  const fetchResolutions = useCallback(
    async (chainId: string, domain: string, signal?: AbortSignal) => {
      const cacheKey = `${domain}:${chainId}`;
      const cached = resolutionCache.get(cacheKey);

      if (signal?.aborted) {
        return [];
      }

      if (cached?.result && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.result;
      }

      if (cached) {
        resolutionCache.delete(cacheKey);
      }

      const controllerMessenger = Engine.controllerMessenger;
      const availableSnaps = getAvailableSnaps(chainId, domain);

      if (availableSnaps.length === 0) {
        return [];
      }

      if (signal?.aborted) {
        return [];
      }

      const responses = await Promise.allSettled(
        availableSnaps.map(
          (id) =>
            handleSnapRequest(controllerMessenger, {
              snapId: id,
              origin: 'metamask',
              handler: HandlerType.OnNameLookup,
              request: {
                jsonrpc: '2.0',
                method: ' ',
                params: {
                  chainId,
                  domain,
                },
              },
            }) as Promise<DomainLookupResult>,
        ),
      );

      if (signal?.aborted) {
        return [];
      }

      const resolutions = responses
        .filter((response) => response.status === 'fulfilled' && response.value)
        .flatMap(
          (response) =>
            (response as PromiseFulfilledResult<DomainLookupResult>).value
              .resolvedAddresses,
        );

      if (resolutionCache.size >= MAX_CACHE_SIZE) {
        pruneExpiredCacheEntries();
        if (resolutionCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = resolutionCache.keys().next().value;
          resolutionCache.delete(oldestKey);
        }
      }

      resolutionCache.set(cacheKey, {
        timestamp: Date.now(),
        result: resolutions,
      });

      return resolutions;
    },
    [getAvailableSnaps],
  );

  return { fetchResolutions };
}
