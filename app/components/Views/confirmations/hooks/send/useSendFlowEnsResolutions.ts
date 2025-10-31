import { useCallback } from 'react';

interface CacheEntry {
  ensName: string;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000;

const ensResolutionCache = new Map<string, CacheEntry>();

const createCacheKey = (chainId: string, address: string) =>
  `${chainId}:${address}`;

const isCacheEntryValid = (entry: CacheEntry): boolean =>
  Date.now() - entry.timestamp < CACHE_TTL;

// This hook is used to store and retrieve ENS resolutions for a given chain and address with short living cache
// especially to keep consistency of Name component in send flow
export const useSendFlowEnsResolutions = () => {
  const setResolvedAddress = useCallback(
    (chainId: string, ensName: string, address: string) => {
      if (
        !isValidString(chainId) ||
        !isValidString(address) ||
        !isValidString(ensName)
      ) {
        return;
      }

      const lowerCaseChainId = chainId.toLowerCase();
      const lowerCaseAddress = address.toLowerCase();
      const lowerCaseEnsName = ensName.toLowerCase();

      ensResolutionCache.set(
        createCacheKey(lowerCaseChainId, lowerCaseAddress),
        {
          ensName: lowerCaseEnsName,
          timestamp: Date.now(),
        },
      );
    },
    [],
  );

  const getResolvedENSName = useCallback(
    (chainId: string, address: string): string | undefined => {
      if (!isValidString(chainId) || !isValidString(address)) {
        return undefined;
      }

      const lowerCaseChainId = chainId.toLowerCase();
      const lowerCaseAddress = address.toLowerCase();

      const entry = ensResolutionCache.get(
        createCacheKey(lowerCaseChainId, lowerCaseAddress),
      );
      if (entry && isCacheEntryValid(entry)) {
        return entry.ensName;
      }

      if (entry) {
        ensResolutionCache.delete(
          createCacheKey(lowerCaseChainId, lowerCaseAddress),
        );
      }
      return undefined;
    },
    [],
  );

  return {
    setResolvedAddress,
    getResolvedENSName,
  };
};

function isValidString(value: unknown) {
  return typeof value === 'string' && value.length > 0;
}
