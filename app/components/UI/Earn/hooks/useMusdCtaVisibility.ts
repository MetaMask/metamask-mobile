import { useCallback, useMemo } from 'react';
import { add0x } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useMusdBalance } from './useMusdBalance';
import {
  selectIsMusdConversionAssetOverviewEnabledFlag,
  selectIsMusdConversionTokenListItemCtaEnabledFlag,
  selectIsMusdGetBuyCtaEnabledFlag,
  selectMusdConversionCTATokens,
} from '../selectors/featureFlags';
import { selectMusdConversionAssetDetailCtasSeen } from '../../../../reducers/user/selectors';
import { TokenI } from '../../Tokens/types';
import { toHexadecimal } from '../../../../util/number';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useMusdConversionTokens } from './useMusdConversionTokens';
import { isTokenInWildcardList } from '../utils/wildcardTokenList';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { useMusdConversionFlowData } from './useMusdConversionFlowData';

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
  const musdConversionAssetDetailCtasSeen = useSelector(
    selectMusdConversionAssetDetailCtasSeen,
  );

  const {
    isGeoEligible,
    isEmptyWallet,
    selectedChainId,
    isPopularNetworksFilterActive,
    hasConvertibleTokens,
    isMusdBuyableOnChain,
    isMusdBuyableOnAnyChain,
  } = useMusdConversionFlowData();

  const { hasMusdBalanceOnAnyChain, hasMusdBalanceOnChain } = useMusdBalance();

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
    if (!isEmptyWallet && !hasConvertibleTokens) {
      return hiddenResult;
    }

    // If user is geo-blocked, don't show the CTA
    if (!isGeoEligible) {
      return hiddenResult;
    }

    // If all networks are selected
    if (isPopularNetworksFilterActive) {
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
    if (!selectedChainId) {
      return hiddenResult;
    }

    const chainId = selectedChainId;

    // Check if mUSD is buyable on this chain in user's region
    // isMusdBuyableOnChain will be undefined/false for chains that don't support buying or aren't buyable in the region
    const isMusdBuyableInRegion = isMusdBuyableOnChain[chainId] ?? false;

    if (!isMusdBuyableInRegion) {
      // Chain doesn't have buy routes available OR mUSD not buyable in user's region - hide the buy/get mUSD CTA
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
    hasConvertibleTokens,
    hasMusdBalanceOnAnyChain,
    hasMusdBalanceOnChain,
    isGeoEligible,
    isEmptyWallet,
    isMusdBuyableOnAnyChain,
    isMusdBuyableOnChain,
    isMusdGetBuyCtaEnabled,
    isPopularNetworksFilterActive,
    selectedChainId,
  ]);

  const shouldShowTokenListItemCta = useCallback(
    (asset?: TokenI) => {
      if (!isMusdConversionTokenListItemCtaEnabled || !asset?.chainId) {
        return false;
      }

      // If user is geo-blocked, don't show the CTA
      if (!isGeoEligible) {
        return false;
      }

      // mUSD needs to be available only on EVM chains
      if (isNonEvmChainId(asset.chainId)) {
        return false;
      }

      if (isPopularNetworksFilterActive) {
        return hasMusdBalanceOnAnyChain && isTokenWithCta(asset);
      }

      // Specific chain selected
      return (
        hasMusdBalanceOnChain(add0x(toHexadecimal(asset.chainId))) &&
        isTokenWithCta(asset)
      );
    },
    [
      hasMusdBalanceOnAnyChain,
      hasMusdBalanceOnChain,
      isGeoEligible,
      isMusdConversionTokenListItemCtaEnabled,
      isPopularNetworksFilterActive,
      isTokenWithCta,
    ],
  );

  const shouldShowAssetOverviewCta = useCallback(
    (asset?: TokenI) => {
      if (
        !isMusdConversionAssetOverviewEnabled ||
        !asset?.address ||
        !asset?.chainId
      ) {
        return false;
      }

      // Check if user has already dismissed this CTA for this specific token
      const ctaKey = `${add0x(toHexadecimal(asset.chainId))}-${asset.address.toLowerCase()}`;
      if (musdConversionAssetDetailCtasSeen[ctaKey]) {
        return false;
      }

      // If user is geo-blocked, don't show the CTA
      if (!isGeoEligible) {
        return false;
      }

      return isTokenWithCta(asset);
    },
    [
      isMusdConversionAssetOverviewEnabled,
      isTokenWithCta,
      musdConversionAssetDetailCtasSeen,
      isGeoEligible,
    ],
  );

  return {
    shouldShowBuyGetMusdCta,
    shouldShowTokenListItemCta,
    shouldShowAssetOverviewCta,
  };
};
