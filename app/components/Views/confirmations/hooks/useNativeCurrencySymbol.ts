import { CaipChainId, Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';

const currencySymbolOverrides: {
  [key: Hex | CaipChainId]: string;
} = {
  // Tempo Mainnet (no native, local config 'USD' but we prefer to display 'pathUSD')
  'eip155:4217': 'pathUSD',
  // Tempo Testnet (no native, local config 'USD' but we prefer to display 'pathUSD')
  'eip155:42431': 'pathUSD',
};

/**
 * This hook is meant to allow collecting the native currency of a given chain ensuring:
 * - "Multichain" compatibility (non-EVM included).
 * - Allowing overrides so we display a given native token regardless of user local config.
 *
 * @param chainId - chainId, either in Hex format (0x1079) or Caip format (solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp).
 * Note that Caip is always used for "non-EVM" chains and EVM will be called with the Hex version.
 * Overrides are stored as CAIP to ensure agnosticity of the format.
 * @returns the native symbol to be displayed to the user for that chain.
 */
export const useNativeCurrencySymbol = (chainId?: Hex | CaipChainId) => {
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  return useMemo(() => {
    // chainId can be undefined during view transistions which escapes inference.
    // 'ETH' is often used as fallback for native token symbol.
    if (!chainId) {
      return { nativeCurrencySymbol: 'ETH' };
    }
    const caipChainId = (
      chainId.startsWith('0x') ? `eip155:${parseInt(chainId, 16)}` : chainId
    ) as CaipChainId;
    const nativeCurrencySymbol =
      currencySymbolOverrides[caipChainId] ??
      networkConfigurations[chainId]?.nativeCurrency ??
      'ETH';
    return { nativeCurrencySymbol };
  }, [chainId, networkConfigurations]);
};
