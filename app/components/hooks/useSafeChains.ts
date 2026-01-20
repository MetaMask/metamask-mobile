import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUseSafeChainsListValidation } from '../../selectors/preferencesController';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../../util/Logger';

export interface SafeChain {
  chainId: number;
  name: string;
  nativeCurrency: { symbol: string };
  rpc: string[];
}

let cachedChainsListPromise: Promise<SafeChain[]> | null = null;

// Exported for testing purposes only
export const resetChainsListCache = () => {
  cachedChainsListPromise = null;
};

async function fetchChainsList(): Promise<SafeChain[]> {
  if (!cachedChainsListPromise) {
    cachedChainsListPromise = (async () => {
      try {
        const response = await fetch('https://chainid.network/chains.json');

        if (!response.ok) {
          throw new Error(`Failed to fetch chains: ${response.status}`);
        }

        const safeChainsData = await response.json();

        // Validate the structure
        if (!Array.isArray(safeChainsData)) {
          throw new Error('Invalid chains data format');
        }

        try {
          await StorageWrapper.setItem(
            'SAFE_CHAINS_CACHE',
            JSON.stringify(safeChainsData),
          );
        } catch (cacheError) {
          Logger.log('Error caching chains data:', cacheError);
        }

        return safeChainsData;
      } catch (error) {
        // Clear cache on failure to allow retries
        cachedChainsListPromise = null;
        throw error;
      }
    })();
  }
  return cachedChainsListPromise;
}

export const useSafeChains = () => {
  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );

  const [safeChains, setSafeChains] = useState<{
    safeChains?: SafeChain[];
    error?: Error | unknown;
  }>({ safeChains: [] });

  useEffect(() => {
    if (useSafeChainsListValidation) {
      const fetchSafeChains = async () => {
        try {
          const safeChainsData = await fetchChainsList();
          setSafeChains({ safeChains: safeChainsData });
        } catch (error) {
          setSafeChains({ error });
        }
      };
      fetchSafeChains();
    }
  }, [useSafeChainsListValidation]);

  return safeChains;
};

export const rpcIdentifierUtility = (
  rpcUrl: string,
  safeChains: SafeChain[],
) => {
  // Early validation of input URL
  let inputHost: string;
  try {
    inputHost = new URL(rpcUrl).host;
  } catch {
    return {
      safeChain: { chainId: '', nativeCurrency: { symbol: '' } },
      safeRPCUrl: 'Invalid rpcUrl',
    };
  }

  for (const chain of safeChains) {
    for (const rpc of chain.rpc) {
      try {
        const rpcHost = new URL(rpc).host;
        if (inputHost === rpcHost) {
          return {
            safeChain: chain,
            safeRPCUrl: inputHost,
          };
        }
      } catch {
        // Skip invalid RPC URLs in the chain data
        continue;
      }
    }
  }

  return {
    safeChain: { chainId: '', nativeCurrency: { symbol: '' } },
    safeRPCUrl: 'Unknown rpcUrl',
  };
};
