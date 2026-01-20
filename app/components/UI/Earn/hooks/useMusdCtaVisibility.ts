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
import { selectAccountGroupBalanceForEmptyState } from '../../../../selectors/assets/balances';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';

/**
 * Hook exposing helpers that decide whether to show various mUSD-related CTAs.
 *
 * Centralizes CTA visibility logic for:
 * - Buy/Get mUSD CTA (includes network badge info when exactly one chain is selected)
 * - Token list item mUSD conversion CTA
 * - Asset overview mUSD conversion CTA
 *
 * Decisions are driven by feature flags, selected network(s), mUSD balance, Ramp buyability by chain,
 * wallet balance state, and the configured wildcard token list for conversion CTAs.
 *
 * @returns Object containing:
 * - shouldShowBuyGetMusdCta(): { shouldShowCta, showNetworkIcon, selectedChainId, isEmptyWallet }
 * - shouldShowTokenListItemCta(asset?): boolean
 * - shouldShowAssetOverviewCta(asset?): boolean
 */
export const useMusdCtaVisibility = () => {
  // mUSD CTA feature flag selectors
  const isMusdGetBuyCtaEnabled = useSelector(selectIsMusdGetBuyCtaEnabledFlag);
  const musdConversionCTATokens = useSelector(selectMusdConversionCTATokens);
  const isMusdConversionTokenListItemCtaEnabled = useSelector(
    selectIsMusdConversionTokenListItemCtaEnabledFlag,
  );
  const isMusdConversionAssetOverviewEnabled = useSelector(
    selectIsMusdConversionAssetOverviewEnabledFlag,
  );

  // Wallet balance state for empty wallet detection
  const accountBalance = useSelector(selectAccountGroupBalanceForEmptyState);
  const isEmptyWallet = accountBalance?.totalBalanceInUserCurrency === 0;

  const { enabledNetworks } = useCurrentNetworkInfo();
  const { areAllNetworksSelected } = useNetworksByCustomNamespace({
    networkType: NetworkType.Popular,
    namespace: KnownCaipNamespace.Eip155,
  });
  const { hasMusdBalanceOnAnyChain, hasMusdBalanceOnChain } = useMusdBalance();
  const { allTokens } = useRampTokens();

  const { tokens: conversionTokens } = useMusdConversionTokens();

  // Check if user has tokens available for conversion
  const canConvert = useMemo(
    () =>
      Boolean(
        conversionTokens.length > 0 &&
          conversionTokens?.[0]?.chainId !== undefined,
      ),
    [conversionTokens],
  );

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

  /**
   * Buy/Get mUSD CTA visibility logic.
   *
   * Shows the CTA when:
   * - Feature flag is enabled AND
   * - mUSD balance/buyability conditions are met AND
   * - (wallet is empty OR user has convertible tokens)
   *
   * Returns isEmptyWallet for determining CTA text ("Buy" vs "Get") and action handling.
   */
  const shouldShowBuyGetMusdCta = useCallback(() => {
    const hiddenResult = {
      shouldShowCta: false,
      showNetworkIcon: false,
      selectedChainId: null,
      isEmptyWallet,
    };

    // If the buy/get mUSD CTA feature flag is disabled, don't show the buy/get mUSD CTA
    if (!isMusdGetBuyCtaEnabled) {
      return hiddenResult;
    }

    // Don't show CTA if user has tokens but none are convertible
    // (only show when wallet is empty OR has convertible tokens)
    if (!isEmptyWallet && !canConvert) {
      return hiddenResult;
    }

    // If all networks are selected
    if (isPopularNetworksFilterSelected) {
      // Show the buy/get mUSD CTA without network icon if:
      // - User doesn't have MUSD on any chain
      // - AND mUSD is buyable on at least one chain in user's region
      return {
        shouldShowCta: !hasMusdBalanceOnAnyChain && isMusdBuyableOnAnyChain,
        showNetworkIcon: false,
        selectedChainId: null,
        isEmptyWallet,
      };
    }

    // If exactly one chain is selected
    const chainId = selectedChains[0];
    const isBuyableChain = MUSD_BUYABLE_CHAIN_IDS.includes(chainId);

    if (!isBuyableChain) {
      // Chain doesn't have buy routes available (e.g., BSC) - hide the buy/get mUSD CTA
      return hiddenResult;
    }

    // Check if mUSD is buyable on this chain in user's region
    const isMusdBuyableInRegion = isMusdBuyableOnChain[chainId] ?? false;

    if (!isMusdBuyableInRegion) {
      // mUSD not buyable in user's region for this chain - hide the buy/get mUSD CTA
      return hiddenResult;
    }

    // Supported chain selected - check if user has MUSD on this specific chain
    const hasMusdOnSelectedChain = hasMusdBalanceOnChain(chainId);

    return {
      shouldShowCta: !hasMusdOnSelectedChain,
      showNetworkIcon: true,
      selectedChainId: chainId,
      isEmptyWallet,
    };
  }, [
    canConvert,
    hasMusdBalanceOnAnyChain,
    hasMusdBalanceOnChain,
    isEmptyWallet,
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

      // mUSD needs to be available only on EVM chains
      if (isNonEvmChainId(asset.chainId)) {
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
