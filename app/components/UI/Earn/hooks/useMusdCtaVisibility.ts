import { useMemo } from 'react';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { useSelector } from 'react-redux';
import {
  MUSD_BUYABLE_CHAIN_IDS,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../constants/musd';
import { useHasMusdBalance } from './useHasMusdBalance';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import {
  NetworkType,
  useNetworksByCustomNamespace,
} from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useRampTokens } from '../../Ramp/hooks/useRampTokens';
import { selectIsMusdCtaEnabledFlag } from '../selectors/featureFlags';
import { toLowerCaseEquals } from '../../../../util/general';

/**
 * Hook to determine visibility and network icon display for the MUSD CTA.
 *
 * @returns Object containing:
 * - shouldShowCta: false if non-MUSD chain selected OR user has MUSD balance OR MUSD not buyable in region
 * - showNetworkIcon: true only when a single MUSD-supported chain is selected
 * - selectedChainId: the selected chain ID for the network badge (null if all networks)
 */
export const useMusdCtaVisibility = () => {
  const isMusdCtaEnabled = useSelector(selectIsMusdCtaEnabledFlag);
  const { enabledNetworks } = useCurrentNetworkInfo();
  const { areAllNetworksSelected } = useNetworksByCustomNamespace({
    networkType: NetworkType.Popular,
    namespace: KnownCaipNamespace.Eip155,
  });
  const { hasMusdBalance, balancesByChain } = useHasMusdBalance();
  const { allTokens } = useRampTokens();

  // Check if mUSD is buyable on a specific chain based on ramp availability
  const isMusdBuyableOnChain = useMemo(() => {
    if (!allTokens) {
      return {};
    }

    const buyableByChain: Record<Hex, boolean> = {};

    MUSD_BUYABLE_CHAIN_IDS.forEach((chainId) => {
      const musdAssetId = MUSD_TOKEN_ASSET_ID_BY_CHAIN[chainId];
      if (!musdAssetId) {
        buyableByChain[chainId] = false;
        return;
      }

      const musdToken = allTokens.find(
        (token) =>
          toLowerCaseEquals(token.assetId, musdAssetId) &&
          token.tokenSupported === true,
      );

      buyableByChain[chainId] = Boolean(musdToken);
    });

    return buyableByChain;
  }, [allTokens]);

  // Check if mUSD is buyable on any chain (for "all networks" view)
  const isMusdBuyableOnAnyChain = useMemo(
    () => Object.values(isMusdBuyableOnChain).some(Boolean),
    [isMusdBuyableOnChain],
  );

  const { shouldShowCta, showNetworkIcon, selectedChainId } = useMemo(() => {
    // If the mUSD CTA feature flag is disabled, don't show the CTA
    if (!isMusdCtaEnabled) {
      return {
        shouldShowCta: false,
        showNetworkIcon: false,
        selectedChainId: null,
      };
    }

    // Get selected chains from enabled networks
    const selectedChains = enabledNetworks
      .filter((network) => network.enabled)
      .map((network) => network.chainId as Hex);

    // If all networks are selected (popular networks filter)
    if (areAllNetworksSelected || selectedChains.length > 1) {
      // Show CTA without network icon if:
      // - User doesn't have MUSD on any chain
      // - AND mUSD is buyable on at least one chain in user's region
      return {
        shouldShowCta: !hasMusdBalance && isMusdBuyableOnAnyChain,
        showNetworkIcon: false,
        selectedChainId: null,
      };
    }

    // If exactly one chain is selected

    const chainId = selectedChains[0];
    const isBuyableChain = MUSD_BUYABLE_CHAIN_IDS.includes(chainId);

    if (!isBuyableChain) {
      // Chain doesn't have buy routes available (e.g., BSC) - hide CTA
      return {
        shouldShowCta: false,
        showNetworkIcon: false,
        selectedChainId: null,
      };
    }

    // Check if mUSD is buyable on this chain in user's region
    const isMusdBuyableInRegion = isMusdBuyableOnChain[chainId] ?? false;

    if (!isMusdBuyableInRegion) {
      // mUSD not buyable in user's region for this chain - hide CTA
      return {
        shouldShowCta: false,
        showNetworkIcon: false,
        selectedChainId: null,
      };
    }

    // Supported chain selected - check if user has MUSD on this specific chain
    const hasMusdOnSelectedChain = Boolean(balancesByChain[chainId]);

    return {
      shouldShowCta: !hasMusdOnSelectedChain,
      showNetworkIcon: true,
      selectedChainId: chainId,
    };
  }, [
    isMusdCtaEnabled,
    areAllNetworksSelected,
    enabledNetworks,
    hasMusdBalance,
    balancesByChain,
    isMusdBuyableOnChain,
    isMusdBuyableOnAnyChain,
  ]);

  return {
    shouldShowCta,
    showNetworkIcon,
    selectedChainId,
  };
};
