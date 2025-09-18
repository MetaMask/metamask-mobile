import { useMemo } from 'react';
import useChainIdsWithBalance from './useChainIdsWithBalance';
import { useIsCardholder } from '../../../Card/hooks/useIsCardholder';
import {
  SUPPORTED_DEPOSIT_TOKENS,
  CONDITIONALLY_SUPPORTED_DEPOSIT_TOKENS,
  MUSD_TOKEN,
  MUSD_LINEA_TOKEN,
} from '../constants';
import { LINEA_MAINNET } from '../constants/networks';
import useDepositFeatureFlags from './useDepositFeatureFlags';

function useSupportedTokens() {
  const chainIdsWithBalance = useChainIdsWithBalance();
  const isCardholder = useIsCardholder();
  const { metamaskUsdEnabled } = useDepositFeatureFlags();

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

    if (metamaskUsdEnabled) {
      initialSupportedTokens.push(MUSD_TOKEN, MUSD_LINEA_TOKEN);
    }

    return initialSupportedTokens;
  }, [chainIdsWithBalance, isCardholder, metamaskUsdEnabled]);

  return supportedTokens;
}

export default useSupportedTokens;
