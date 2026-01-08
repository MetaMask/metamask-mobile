import { useCallback, useMemo } from 'react';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { useSelector } from 'react-redux';
import {
  MUSD_BUYABLE_CHAIN_IDS,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../constants/musd';
import { useMusdBalance } from './useMusdBalance';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import {
  NetworkType,
  useNetworksByCustomNamespace,
} from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useRampTokens } from '../../Ramp/hooks/useRampTokens';
import {
  selectIsMusdConversionAssetOverviewEnabledFlag,
  selectIsMusdConversionTokenListItemCtaEnabledFlag,
  selectIsMusdGetBuyCtaEnabledFlag,
  selectMusdConversionCTATokens,
} from '../selectors/featureFlags';
import { toLowerCaseEquals } from '../../../../util/general';
import { TokenI } from '../../Tokens/types';
import { toHex } from '@metamask/controller-utils';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useMusdConversionTokens } from './useMusdConversionTokens';
import { isTokenInWildcardList } from '../utils/wildcardTokenList';

// TODO: Update Comments
// TODO: Update tests
// TODO: Add separate rewards feature flag for mUSD conversion. This will impact if the rewards UI elements are displayed on the musd-conversion-info screen.
/**
 * Hook to determine visibility and network icon display for the MUSD CTA.
 *
 * @returns Object containing:
 * - shouldShowCta: false if non-MUSD chain selected OR user has MUSD balance OR MUSD not buyable in region
 * - showNetworkIcon: true only when a single MUSD-supported chain is selected
 * - selectedChainId: the selected chain ID for the network badge (null if all networks)
 */
export const useMusdCtaVisibility = () => {
  // CTA Feature Flag Selectors
  const isMusdGetBuyCtaEnabled = useSelector(selectIsMusdGetBuyCtaEnabledFlag);
  const musdConversionCTATokens = useSelector(selectMusdConversionCTATokens);
  const isMusdConversionTokenListItemCtaEnabled = useSelector(
    selectIsMusdConversionTokenListItemCtaEnabledFlag,
  );
  const isMusdConversionAssetOverviewEnabled = useSelector(
    selectIsMusdConversionAssetOverviewEnabledFlag,
  );

  const { enabledNetworks } = useCurrentNetworkInfo();
  const { areAllNetworksSelected } = useNetworksByCustomNamespace({
    networkType: NetworkType.Popular,
    namespace: KnownCaipNamespace.Eip155,
  });
  const { hasMusdBalanceOnAnyChain, hasMusdBalanceOnChain } = useMusdBalance();
  const { allTokens } = useRampTokens();

  const { tokens: conversionTokens } = useMusdConversionTokens();

  const getConversionTokensWithCtas = useCallback(
    (tokens: AssetType[]) =>
      tokens.filter((token) =>
        isTokenInWildcardList(
          token.symbol,
          musdConversionCTATokens,
          token.chainId,
        ),
      ),
    [musdConversionCTATokens],
  );

  const tokensWithCTAs = useMemo(
    () => getConversionTokensWithCtas(conversionTokens),
    [getConversionTokensWithCtas, conversionTokens],
  );

  const isTokenWithCta = useCallback(
    (token?: AssetType | TokenI) => {
      if (!token?.address || !token?.chainId) return false;

      return tokensWithCTAs.some(
        (musdToken) =>
          token.address.toLowerCase() === musdToken.address.toLowerCase() &&
          token.chainId === musdToken.chainId,
      );
    },
    [tokensWithCTAs],
  );

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

  // Get selected chains from enabled networks
  const selectedChains = useMemo(
    () =>
      enabledNetworks
        .filter((network) => network.enabled)
        .map((network) => network.chainId as Hex),
    [enabledNetworks],
  );

  const isPopularNetworksFilterSelected = useMemo(
    () => areAllNetworksSelected || selectedChains.length > 1,
    [areAllNetworksSelected, selectedChains.length],
  );

  const shouldShowBuyGetMusdCta = useCallback(() => {
    // If the mUSD CTA feature flag is disabled, don't show the CTA
    if (!isMusdGetBuyCtaEnabled) {
      return {
        shouldShowCta: false,
        showNetworkIcon: false,
        selectedChainId: null,
      };
    }

    // If all networks are selected
    if (isPopularNetworksFilterSelected) {
      // Show CTA without network icon if:
      // - User doesn't have MUSD on any chain
      // - AND mUSD is buyable on at least one chain in user's region
      return {
        shouldShowCta: !hasMusdBalanceOnAnyChain && isMusdBuyableOnAnyChain,
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
    const hasMusdOnSelectedChain = hasMusdBalanceOnChain(chainId);

    return {
      shouldShowCta: !hasMusdOnSelectedChain,
      showNetworkIcon: true,
      selectedChainId: chainId,
    };
  }, [
    hasMusdBalanceOnAnyChain,
    hasMusdBalanceOnChain,
    isMusdBuyableOnAnyChain,
    isMusdBuyableOnChain,
    isMusdGetBuyCtaEnabled,
    isPopularNetworksFilterSelected,
    selectedChains,
  ]);

  const shouldShowTokenListItemCta = useCallback(
    (asset?: TokenI) => {
      if (!isMusdConversionTokenListItemCtaEnabled || !asset?.chainId) {
        return false;
      }

      if (isPopularNetworksFilterSelected) {
        return hasMusdBalanceOnAnyChain && isTokenWithCta(asset);
      }

      // Specific chain selected
      return (
        hasMusdBalanceOnChain(toHex(asset.chainId)) && isTokenWithCta(asset)
      );
    },
    [
      hasMusdBalanceOnAnyChain,
      hasMusdBalanceOnChain,
      isMusdConversionTokenListItemCtaEnabled,
      isPopularNetworksFilterSelected,
      isTokenWithCta,
    ],
  );

  const shouldShowAssetOverviewCta = useCallback(
    (asset?: TokenI) => {
      if (!isMusdConversionAssetOverviewEnabled || !asset) {
        return false;
      }

      return isTokenWithCta(asset);
    },
    [isMusdConversionAssetOverviewEnabled, isTokenWithCta],
  );

  return {
    shouldShowBuyGetMusdCta,
    shouldShowTokenListItemCta,
    shouldShowAssetOverviewCta,
  };
};
