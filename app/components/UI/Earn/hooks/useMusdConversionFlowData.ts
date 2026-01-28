import { useCallback, useMemo } from 'react';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { toHex } from '@metamask/controller-utils';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useMusdConversionTokens } from './useMusdConversionTokens';
import { useMusdConversionEligibility } from './useMusdConversionEligibility';
import { useMusdRampAvailability } from './useMusdRampAvailability';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import {
  NetworkType,
  useNetworksByCustomNamespace,
} from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { selectAccountGroupBalanceForEmptyState } from '../../../../selectors/assets/balances';
import { MUSD_CONVERSION_DEFAULT_CHAIN_ID } from '../constants/musd';
import { toChecksumAddress } from '../../../../util/address';

export interface MusdConversionFlowData {
  isPopularNetworksFilterActive: boolean;
  selectedChainId: Hex | null;
  selectedChains: Hex[];
  isGeoEligible: boolean;
  isEmptyWallet: boolean;
  hasConvertibleTokens: boolean;
  conversionTokens: AssetType[];
  getPaymentTokenForSelectedNetwork: () => {
    address: Hex;
    chainId: Hex;
  } | null;
  getChainIdForBuyFlow: () => Hex;
  getMusdOutputChainId: (inputChainId?: string) => Hex;
  isMusdBuyableOnChain: Record<Hex, boolean>;
  isMusdBuyableOnAnyChain: boolean;
  isMusdBuyable: boolean;
}

/**
 * Unified hook for mUSD conversion flow data.
 *
 * Consolidates logic for:
 * - Network filter state (all networks vs specific chain selection)
 * - User state (geo-eligibility, empty wallet)
 * - Token availability and selection
 * - Chain ID determination for buy/convert flows
 *
 * Returns structured data (not routing decisions) for consumers to make
 * their own navigation and display choices.
 *
 * @returns {MusdConversionFlowData} Consolidated mUSD conversion state and helpers
 */
export const useMusdConversionFlowData = (): MusdConversionFlowData => {
  const { tokens: conversionTokens, getMusdOutputChainId } =
    useMusdConversionTokens();

  const { isEligible: isGeoEligible } = useMusdConversionEligibility();

  const { isMusdBuyableOnChain, isMusdBuyableOnAnyChain, getIsMusdBuyable } =
    useMusdRampAvailability();

  const { enabledNetworks } = useCurrentNetworkInfo();

  const { areAllNetworksSelected } = useNetworksByCustomNamespace({
    networkType: NetworkType.Popular,
    namespace: KnownCaipNamespace.Eip155,
  });

  const accountBalance = useSelector(selectAccountGroupBalanceForEmptyState);
  const isEmptyWallet = accountBalance?.totalBalanceInUserCurrency === 0;

  const selectedChains = useMemo(
    () =>
      enabledNetworks
        .filter((network) => network.enabled)
        .map((network) => network.chainId as Hex),
    [enabledNetworks],
  );

  const isPopularNetworksFilterActive = useMemo(
    () => areAllNetworksSelected || selectedChains.length > 1,
    [areAllNetworksSelected, selectedChains.length],
  );

  const selectedChainId = useMemo(
    () =>
      !isPopularNetworksFilterActive && selectedChains.length === 1
        ? selectedChains[0]
        : null,
    [isPopularNetworksFilterActive, selectedChains],
  );

  const hasConvertibleTokens = useMemo(
    () => conversionTokens.length > 0,
    [conversionTokens],
  );

  // Convenience property: checks buyability based on current network view
  const isMusdBuyable = useMemo(
    () => getIsMusdBuyable(selectedChainId, isPopularNetworksFilterActive),
    [getIsMusdBuyable, selectedChainId, isPopularNetworksFilterActive],
  );

  const getPaymentTokenForSelectedNetwork = useCallback(() => {
    if (conversionTokens.length === 0) return null;

    const preferredTokenOnSelectedChain = selectedChainId
      ? conversionTokens.find((token) => token.chainId === selectedChainId)
      : undefined;

    const paymentToken = preferredTokenOnSelectedChain ?? conversionTokens[0];

    if (!paymentToken?.chainId || !paymentToken?.address) {
      return null;
    }

    return {
      address: toChecksumAddress(paymentToken.address),
      chainId: toHex(paymentToken.chainId),
    };
  }, [conversionTokens, selectedChainId]);

  const getChainIdForBuyFlow = useCallback(
    () => selectedChainId || MUSD_CONVERSION_DEFAULT_CHAIN_ID,
    [selectedChainId],
  );

  return {
    isPopularNetworksFilterActive,
    selectedChainId,
    selectedChains,
    isGeoEligible,
    isEmptyWallet,
    hasConvertibleTokens,
    conversionTokens,
    getPaymentTokenForSelectedNetwork,
    getChainIdForBuyFlow,
    getMusdOutputChainId,
    isMusdBuyableOnChain,
    isMusdBuyableOnAnyChain,
    isMusdBuyable,
  };
};
