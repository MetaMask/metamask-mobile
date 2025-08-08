import {
  SUPPORTED_DEPOSIT_TOKENS,
  CONDITIONALLY_SUPPORTED_DEPOSIT_TOKENS,
} from '../constants';
import useChainIdsWithBalance from './useChainIdsWithBalance';
import { useMemo } from 'react';

function useSupportedTokens() {
  const chainIdsWithBalance = useChainIdsWithBalance();

  const supportedTokens = useMemo(() => {
    const initialSupportedTokens = [...SUPPORTED_DEPOSIT_TOKENS];
    for (const token of CONDITIONALLY_SUPPORTED_DEPOSIT_TOKENS) {
      if (chainIdsWithBalance.includes(token.chainId)) {
        initialSupportedTokens.push(token);
      }
    }

    return initialSupportedTokens.sort((a, b) =>
      a.symbol.localeCompare(b.symbol),
    );
  }, [chainIdsWithBalance]);

  return supportedTokens;
}

export default useSupportedTokens;
