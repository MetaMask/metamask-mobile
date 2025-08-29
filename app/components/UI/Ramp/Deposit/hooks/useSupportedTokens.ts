import { useMemo } from 'react';
import useChainIdsWithBalance from './useChainIdsWithBalance';
import { useIsCardholder } from '../../../Card/hooks/useIsCardholder';
import {
  SUPPORTED_DEPOSIT_TOKENS,
  CONDITIONALLY_SUPPORTED_DEPOSIT_TOKENS,
} from '../constants';
import { LINEA_MAINNET } from '../constants/networks';

function useSupportedTokens() {
  const chainIdsWithBalance = useChainIdsWithBalance();
  const isCardholder = useIsCardholder();

  const supportedTokens = useMemo(() => {
    const initialSupportedTokens = [...SUPPORTED_DEPOSIT_TOKENS];
    for (const token of CONDITIONALLY_SUPPORTED_DEPOSIT_TOKENS) {
      if (
        chainIdsWithBalance.includes(token.chainId) ||
        (isCardholder && token.chainId === LINEA_MAINNET.chainId)
      ) {
        initialSupportedTokens.push(token);
      }
    }

    return initialSupportedTokens.sort((a, b) =>
      a.symbol.toUpperCase().localeCompare(b.symbol.toUpperCase()),
    );
  }, [chainIdsWithBalance, isCardholder]);

  return supportedTokens;
}

export default useSupportedTokens;
