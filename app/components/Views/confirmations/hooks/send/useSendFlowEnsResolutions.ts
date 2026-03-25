import { useCallback } from 'react';

interface CacheEntry {
  ensName: string;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000;

const ensResolutionCache = new Map<string, CacheEntry>();

/**
 * Normalize EVM chain IDs so lookups match regardless of representation
 * (e.g. `0x1` vs `0x01`, decimal `"1"`, or CAIP-2 `eip155:1`). Send flow and
 * transaction metadata can use different string forms for the same chain.
 */
function normalizeChainIdForEnsCache(chainId: string): string {
  const trimmed = chainId.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('eip155:')) {
    const ref = lower.split(':')[1];
    if (!ref) {
      return lower;
    }
    try {
      return `0x${BigInt(ref).toString(16)}`;
    } catch {
      return lower;
    }
  }
  if (/^0x[0-9a-f]+$/iu.test(trimmed)) {
    try {
      return `0x${BigInt(trimmed).toString(16)}`;
    } catch {
      return lower;
    }
  }
  if (/^\d+$/u.test(trimmed)) {
    try {
      return `0x${BigInt(trimmed).toString(16)}`;
    } catch {
      return lower;
    }
  }
  return lower;
}

const createCacheKey = (chainId: string, address: string) =>
  `${normalizeChainIdForEnsCache(chainId)}:${address.toLowerCase()}`;

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

      const lowerCaseEnsName = ensName.toLowerCase();

      ensResolutionCache.set(createCacheKey(chainId, address), {
        ensName: lowerCaseEnsName,
        timestamp: Date.now(),
      });
    },
    [],
  );

  const getResolvedENSName = useCallback(
    (chainId: string, address: string): string | undefined => {
      if (!isValidString(chainId) || !isValidString(address)) {
        return undefined;
      }

      const entry = ensResolutionCache.get(createCacheKey(chainId, address));
      if (entry && isCacheEntryValid(entry)) {
        return entry.ensName;
      }

      if (entry) {
        ensResolutionCache.delete(createCacheKey(chainId, address));
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
