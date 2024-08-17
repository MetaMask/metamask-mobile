import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUseSafeChainsListValidation } from '../../selectors/preferencesController';

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

  const [safeChains, setSafeChains] = useState<{
    safeChains?: SafeChain[];
    error?: Error | unknown;
  }>({ safeChains: [] });

  useEffect(() => {
    if (useSafeChainsListValidation) {
      const fetchSafeChains = async () => {
        try {
          const response = await fetch('https://chainid.network/chains.json');
          const safeChainsData: SafeChain[] = await response.json();
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
  const { host } = new URL(rpcUrl);

  for (const chain of safeChains) {
    for (const rpc of chain.rpc) {
      if (host === new URL(rpc).host) {
        return host;
      }
    }
  }

  return 'Unknown rpcUrl';
};
