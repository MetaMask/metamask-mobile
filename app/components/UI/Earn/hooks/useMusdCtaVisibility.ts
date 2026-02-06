import { useCallback, useMemo } from 'react';
import { add0x, Hex } from '@metamask/utils';
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
 * Variant for the primary mUSD CTA.
 *
 * Consumers should treat this as the source of truth for:
 * - CTA label ("Buy mUSD" vs "Get mUSD")
 * - CTA behavior (Ramp buy flow vs conversion flow)
 */
export enum BUY_GET_MUSD_CTA_VARIANT {
  BUY = 'buy',
  GET = 'get',
}

// Invariant: if `shouldShowCta === true`, then `variant !== null`.
export type BuyGetMusdCtaState =
  | {
      shouldShowCta: false;
      showNetworkIcon: false;
      selectedChainId: null;
      isEmptyWallet: boolean;
      variant: null;
    }
  | {
      shouldShowCta: true;
      showNetworkIcon: boolean;
      selectedChainId: Hex | null;
      isEmptyWallet: boolean;
      variant: BUY_GET_MUSD_CTA_VARIANT;
    };

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
 * - shouldShowBuyGetMusdCta(): BuyGetMusdCtaState
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

  const { tokens: conversionTokens, hasConvertibleTokensByChainId } =
    useMusdConversionTokens();

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
  const shouldShowBuyMusdCta = useCallback((): BuyGetMusdCtaState => {
    const hiddenResult: BuyGetMusdCtaState = {
      shouldShowCta: false,
      showNetworkIcon: false,
      selectedChainId: null,
      isEmptyWallet,
      variant: null,
    };

    // If the buy/get mUSD CTA feature flag is disabled, don't show the buy/get mUSD CTA
    if (!isMusdGetBuyCtaEnabled) {
      return hiddenResult;
    }

    // If user is geo-blocked, don't show the CTA
    if (!isGeoEligible) {
      return hiddenResult;
    }

    // Only show if wallet is empty
    if (!isEmptyWallet) {
      return hiddenResult;
    }

    if (isPopularNetworksFilterActive) {
      const shouldShowCta =
        isMusdBuyableOnAnyChain && !hasMusdBalanceOnAnyChain;

      if (!shouldShowCta) {
        return hiddenResult;
      }

      return {
        shouldShowCta: true,
        showNetworkIcon: false,
        selectedChainId: null,
        isEmptyWallet,
        variant: BUY_GET_MUSD_CTA_VARIANT.BUY,
      };
    }

    // Specific network selected
    if (!selectedChainId) {
      return hiddenResult;
    }

    const isMusdBuyableOnSelectedChain = Boolean(
      isMusdBuyableOnChain[selectedChainId],
    );

    if (
      isMusdBuyableOnSelectedChain &&
      !hasMusdBalanceOnChain(selectedChainId)
    ) {
      return {
        shouldShowCta: true,
        showNetworkIcon: true,
        selectedChainId,
        isEmptyWallet,
        variant: BUY_GET_MUSD_CTA_VARIANT.BUY,
      };
    }

    // mUSD not buyable on selected chain
    return hiddenResult;
  }, [
    hasMusdBalanceOnAnyChain,
    hasMusdBalanceOnChain,
    isEmptyWallet,
    isGeoEligible,
    isMusdBuyableOnAnyChain,
    isMusdBuyableOnChain,
    isMusdGetBuyCtaEnabled,
    isPopularNetworksFilterActive,
    selectedChainId,
  ]);

  const shouldShowGetMusdCta = useCallback((): BuyGetMusdCtaState => {
    const hiddenResult: BuyGetMusdCtaState = {
      shouldShowCta: false,
      showNetworkIcon: false,
      selectedChainId: null,
      isEmptyWallet,
      variant: null,
    };

    // If the buy/get mUSD CTA feature flag is disabled, don't show the buy/get mUSD CTA
    if (!isMusdGetBuyCtaEnabled) {
      return hiddenResult;
    }

    // If user is geo-blocked, don't show the CTA
    if (!isGeoEligible) {
      return hiddenResult;
    }

    // Can't enter conversion flow if user doesn't have supported tokens to convert.
    if (!hasConvertibleTokens) {
      return hiddenResult;
    }

    if (
      isPopularNetworksFilterActive &&
      // When user has mUSD we show the secondary (token list item) CTA.
      !hasMusdBalanceOnAnyChain
    ) {
      return {
        shouldShowCta: true,
        showNetworkIcon: false,
        selectedChainId: null,
        isEmptyWallet,
        variant: BUY_GET_MUSD_CTA_VARIANT.GET,
      };
    }

    if (!selectedChainId) {
      return hiddenResult;
    }

    const hasMusdBalanceOnSelectedChain =
      hasMusdBalanceOnChain(selectedChainId);

    if (
      hasConvertibleTokensByChainId(selectedChainId) &&
      !hasMusdBalanceOnSelectedChain
    ) {
      return {
        shouldShowCta: true,
        showNetworkIcon: true,
        selectedChainId,
        isEmptyWallet,
        variant: BUY_GET_MUSD_CTA_VARIANT.GET,
      };
    }

    return hiddenResult;
  }, [
    hasConvertibleTokens,
    hasConvertibleTokensByChainId,
    hasMusdBalanceOnAnyChain,
    hasMusdBalanceOnChain,
    isEmptyWallet,
    isGeoEligible,
    isMusdGetBuyCtaEnabled,
    isPopularNetworksFilterActive,
    selectedChainId,
  ]);

  /**
   * Buy/Get mUSD CTA visibility logic.
   *
   * Resolves the primary mUSD CTA into a single visible variant (or hidden).
   *
   * - **Get**: shown when the user has convertible tokens for the current network view and does not hold mUSD (favored when both variants could apply).
   * - **Buy**: shown when the wallet is empty, mUSD is buyable for the current network view, and the user does not hold mUSD.
   *
   * Consumers should use the returned `variant` to determine CTA label + action.
   */
  const shouldShowBuyGetMusdCta = useCallback((): BuyGetMusdCtaState => {
    const hiddenDefault: BuyGetMusdCtaState = {
      shouldShowCta: false,
      showNetworkIcon: false,
      selectedChainId: null,
      isEmptyWallet,
      variant: null,
    };

    // Note: The order of the cta variants is important. We want to favour the get mUSD CTA over the buy mUSD CTA.
    const ctaVariants = [shouldShowGetMusdCta(), shouldShowBuyMusdCta()];
    return ctaVariants.find((cta) => cta.shouldShowCta) ?? hiddenDefault;
  }, [isEmptyWallet, shouldShowBuyMusdCta, shouldShowGetMusdCta]);

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
