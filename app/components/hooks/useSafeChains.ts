import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUseSafeChainsListValidation } from '../../selectors/preferencesController';
import Logger from '../../util/Logger';
import StorageWrapper from '../../store/storage-wrapper';

export interface SafeChain {
  chainId: string;
  name: string;
  nativeCurrency: { symbol: string };
  rpc: string[];
}

export const useSafeChains = () => {
  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );

  Logger.log('[SafeChains Debug] useSafeChainsListValidation:', useSafeChainsListValidation);

  const [safeChains, setSafeChains] = useState<{
    safeChains?: SafeChain[];
    error?: Error | unknown;
  }>({ safeChains: [] });

  useEffect(() => {
    Logger.log('[SafeChains Debug] useEffect triggered, validation setting:', useSafeChainsListValidation);

    if (useSafeChainsListValidation) {
      const fetchSafeChains = async () => {
        Logger.log('[SafeChains Debug] Fetching safe chains...');
        try {
          const response = await fetch('https://chainid.network/chains.json');
          Logger.log('[SafeChains Debug] Fetch response status:', response.status);

          const safeChainsData: SafeChain[] = await response.json();
          Logger.log('[SafeChains Debug] Received chains count:', safeChainsData.length);

          // Let's try to cache the data ourselves
          try {
            await StorageWrapper.setItem('SAFE_CHAINS_CACHE', JSON.stringify(safeChainsData));
            Logger.log('[SafeChains Debug] Successfully cached chains data');
          } catch (cacheError) {
            Logger.log('[SafeChains Debug] Error caching chains data:', cacheError);
          }

          setSafeChains({ safeChains: safeChainsData });
        } catch (error) {
          Logger.log('[SafeChains Debug] Error fetching chains:', error);
          setSafeChains({ error });
        }
      };
      fetchSafeChains();
    }
  }, [useSafeChainsListValidation]);

  return safeChains;
};
