import { Hex } from '@metamask/utils';
import { performEvmRefresh } from './tokenRefreshUtils';

interface RefreshEvmTokensProps {
  isEvmSelected: boolean;
  evmNetworkConfigurationsByChainId: Record<
    string,
    { chainId: Hex; nativeCurrency: string }
  >;
  nativeCurrencies: string[];
}

export const refreshEvmTokens = async ({
  isEvmSelected,
  evmNetworkConfigurationsByChainId,
  nativeCurrencies,
}: RefreshEvmTokensProps) => {
  if (!isEvmSelected) {
    return;
  }

  await performEvmRefresh(evmNetworkConfigurationsByChainId, nativeCurrencies);
};
